import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/access/purchases";
import { isProgram, productForProgram } from "@/lib/program";
import { MAX_OPEN_SEAT_REQUESTS, SEAT_COLUMNS, seatCheckoutUrl, type SeatRequestRow } from "@/lib/seats";

/**
 * Perfil adicional por cotización, desde la pestaña "Perfil adicional".
 *
 * GET    → { requests: [{ id, partner_name, partner_email, company_name, status, priceLabel, payUrl, adminNote, active }] }
 *          priceLabel y payUrl solo vienen cuando el equipo aprobó la solicitud.
 * POST   { partner_name, partner_email, company_name?, message? } → solicita la cotización.
 * DELETE ?id=… → cancela una solicitud todavía no pagada.
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

export async function GET() {
  const auth = await getHost();
  if ("error" in auth) return auth.error;
  const { data } = await auth.db
    .from("seat_requests")
    .select(SEAT_COLUMNS)
    .eq("host_id", auth.host.id)
    .neq("status", "canceled")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as SeatRequestRow[];

  const purchaseIds = rows.map((r) => r.purchase_id).filter(Boolean) as string[];
  const claimed = new Set<string>();
  if (purchaseIds.length) {
    const { data: ps } = await auth.db.from("purchases").select("id, claimed_by").in("id", purchaseIds);
    for (const p of (ps ?? []) as { id: string; claimed_by: string | null }[]) if (p.claimed_by) claimed.add(p.id);
  }
  const requests = rows.map((r) => {
    const approved = r.status === "approved";
    return {
      id: r.id,
      partner_name: r.partner_name,
      partner_email: r.partner_email,
      company_name: r.company_name,
      status: r.status,
      priceLabel: approved || r.status === "paid" ? r.price_label : null,
      payUrl: approved && r.payment_url ? seatCheckoutUrl(r.payment_url, r.id) : null,
      adminNote: r.status === "rejected" || approved ? r.admin_note : null,
      active: !!(r.purchase_id && claimed.has(r.purchase_id)),
    };
  });
  return NextResponse.json({ ok: true, requests });
}

const postSchema = z.object({
  partner_name: z.string().trim().min(2).max(120),
  partner_email: z.string().trim().email().max(255),
  company_name: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const auth = await getHost();
  if ("error" in auth) return auth.error;
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  const email = normalizeEmail(parsed.data.partner_email);
  const { db, host, product } = auth;

  if (host.email && normalizeEmail(host.email) === email) return NextResponse.json({ error: "own_email" }, { status: 400 });

  const [{ data: acc }, { data: pur }, { data: open }] = await Promise.all([
    db.from("users").select("id, hotmart_transaction_id").ilike("email", email).maybeSingle(),
    db.from("purchases").select("id").eq("product", product).eq("email", email).maybeSingle(),
    db.from("seat_requests").select("id, host_id").ilike("partner_email", email).in("status", ["requested", "approved"]),
  ]);
  if ((acc as { hotmart_transaction_id: string | null } | null)?.hotmart_transaction_id) {
    return NextResponse.json({ error: "email_has_account" }, { status: 409 });
  }
  if (pur) return NextResponse.json({ error: "email_has_purchase" }, { status: 409 });
  const openRows = (open ?? []) as { id: string; host_id: string }[];
  if (openRows.some((r) => r.host_id === host.id)) return NextResponse.json({ error: "already_requested" }, { status: 409 });
  if (openRows.length) return NextResponse.json({ error: "email_in_use" }, { status: 409 });

  const { count } = await db
    .from("seat_requests")
    .select("id", { count: "exact", head: true })
    .eq("host_id", host.id)
    .in("status", ["requested", "approved"]);
  if ((count ?? 0) >= MAX_OPEN_SEAT_REQUESTS) return NextResponse.json({ error: "limit" }, { status: 409 });

  const { error } = await db.from("seat_requests").insert({
    host_id: host.id,
    product,
    partner_name: parsed.data.partner_name,
    partner_email: email,
    company_name: parsed.data.company_name || null,
    message: parsed.data.message || null,
    status: "requested",
  });
  if (error) {
    console.error("[seats] insert:", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await getHost();
  if ("error" in auth) return auth.error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { data } = await auth.db
    .from("seat_requests")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("host_id", auth.host.id)
    .in("status", ["requested", "approved"])
    .select("id");
  if (!data?.length) return NextResponse.json({ error: "not_found_or_paid" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
