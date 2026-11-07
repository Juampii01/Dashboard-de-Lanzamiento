import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/access/purchases";
import { isProgram, productForProgram } from "@/lib/program";
import { getSeatSettings, MAX_OPEN_SEAT_REQUESTS, seatCheckoutUrl } from "@/lib/seats";

/**
 * Segundo participante pago, desde el perfil del participante logueado.
 *
 * GET    → { enabled, priceLabel, requests: [{ id, partner_name, partner_email, status, payUrl }] }
 * POST   { partner_name, partner_email } → crea la solicitud y devuelve el link de pago.
 * DELETE ?id=… → cancela una solicitud que todavía no se pagó.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

async function getHost() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const db = createServiceClient() as unknown as Db;
  const { data } = await db
    .from("users")
    .select("id, email, program, viewer_of, is_admin, is_student, hotmart_transaction_id")
    .eq("id", user.id)
    .maybeSingle();
  const u = data as { id: string; email: string | null; program: string | null; viewer_of: string | null; is_admin: boolean | null; is_student: boolean | null; hotmart_transaction_id: string | null } | null;
  if (!u || u.viewer_of) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  if (!u.is_admin && !u.is_student && !u.hotmart_transaction_id) {
    return { error: NextResponse.json({ error: "no_access" }, { status: 403 }) };
  }
  return { db, host: u, product: productForProgram(isProgram(u.program) ? u.program : "live") };
}

type Row = { id: string; partner_name: string; partner_email: string; paid_at: string | null; purchase_id: string | null };

export async function GET() {
  const auth = await getHost();
  if ("error" in auth) return auth.error;
  const settings = await getSeatSettings(auth.db);
  const { data } = await auth.db
    .from("seat_requests")
    .select("id, partner_name, partner_email, paid_at, purchase_id")
    .eq("host_id", auth.host.id)
    .is("canceled_at", null)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as Row[];

  // Estado: falta pagar / pagado y esperando registro / activo.
  const purchaseIds = rows.map((r) => r.purchase_id).filter(Boolean) as string[];
  const claimed = new Set<string>();
  if (purchaseIds.length) {
    const { data: ps } = await auth.db.from("purchases").select("id, claimed_by").in("id", purchaseIds);
    for (const p of (ps ?? []) as { id: string; claimed_by: string | null }[]) if (p.claimed_by) claimed.add(p.id);
  }
  const requests = rows.map((r) => ({
    id: r.id,
    partner_name: r.partner_name,
    partner_email: r.partner_email,
    status: !r.paid_at ? "unpaid" : r.purchase_id && claimed.has(r.purchase_id) ? "active" : "paid",
    payUrl: !r.paid_at && settings.paymentUrl ? seatCheckoutUrl(settings.paymentUrl, r.id, r.partner_email) : null,
  }));
  return NextResponse.json({ ok: true, enabled: !!settings.paymentUrl, priceLabel: settings.priceLabel, requests });
}

const postSchema = z.object({
  partner_name: z.string().trim().min(2).max(120),
  partner_email: z.string().trim().email().max(255),
});

export async function POST(req: NextRequest) {
  const auth = await getHost();
  if ("error" in auth) return auth.error;
  const settings = await getSeatSettings(auth.db);
  if (!settings.paymentUrl) return NextResponse.json({ error: "disabled" }, { status: 409 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  const email = normalizeEmail(parsed.data.partner_email);
  const { db, host, product } = auth;

  if (host.email && normalizeEmail(host.email) === email) return NextResponse.json({ error: "own_email" }, { status: 400 });

  // El socio no puede tener ya cuenta ni compra de este programa.
  const [{ data: acc }, { data: pur }, { data: open }] = await Promise.all([
    db.from("users").select("id").ilike("email", email).maybeSingle(),
    db.from("purchases").select("id").eq("product", product).eq("email", email).maybeSingle(),
    db.from("seat_requests").select("id, host_id").ilike("partner_email", email).is("canceled_at", null).is("paid_at", null),
  ]);
  if (acc) return NextResponse.json({ error: "email_has_account" }, { status: 409 });
  if (pur) return NextResponse.json({ error: "email_has_purchase" }, { status: 409 });
  const openRows = (open ?? []) as { id: string; host_id: string }[];
  const mine = openRows.find((r) => r.host_id === host.id);
  if (mine) {
    // Ya existe: se devuelve el mismo link para que pueda pagar.
    return NextResponse.json({ ok: true, payUrl: seatCheckoutUrl(settings.paymentUrl, mine.id, email) });
  }
  if (openRows.length) return NextResponse.json({ error: "email_in_use" }, { status: 409 });

  const { count } = await db
    .from("seat_requests")
    .select("id", { count: "exact", head: true })
    .eq("host_id", host.id)
    .is("canceled_at", null)
    .is("paid_at", null);
  if ((count ?? 0) >= MAX_OPEN_SEAT_REQUESTS) return NextResponse.json({ error: "limit" }, { status: 409 });

  const { data: row, error } = await db
    .from("seat_requests")
    .insert({ host_id: host.id, product, partner_name: parsed.data.partner_name, partner_email: email })
    .select("id")
    .single();
  if (error || !row) {
    console.error("[seats] insert:", error?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, payUrl: seatCheckoutUrl(settings.paymentUrl, (row as { id: string }).id, email) });
}

export async function DELETE(req: NextRequest) {
  const auth = await getHost();
  if ("error" in auth) return auth.error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { data } = await auth.db
    .from("seat_requests")
    .update({ canceled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("host_id", auth.host.id)
    .is("paid_at", null)
    .is("canceled_at", null)
    .select("id");
  if (!data?.length) return NextResponse.json({ error: "not_found_or_paid" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
