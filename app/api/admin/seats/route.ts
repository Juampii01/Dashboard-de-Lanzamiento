import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isProgram } from "@/lib/program";
import { fulfillSeatRequest, getDefaultSeatPaymentUrl, SEAT_COLUMNS, type SeatRequestRow } from "@/lib/seats";
import { sendSeatQuoteEmail } from "@/lib/email/send-seat-quote-email";

/**
 * /api/admin/seats  (solo admins) — cotizaciones de perfil adicional.
 *
 * GET  → { requests: [...con datos del participante], defaultPaymentUrl }
 * POST { action, id, ... }
 *   approve    { price_label, payment_url, admin_note? }  → el participante ve precio y botón de pago (+ email)
 *   reject     { admin_note? }
 *   mark_paid  {}  → crea la compra a nombre de la persona adicional y le manda el registro
 *   reopen     {}  → vuelve a "requested" (para corregir precio o una decisión)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

async function requireAdmin(): Promise<{ adminId: string; db: Db } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const db = createServiceClient() as unknown as Db;
  const { data } = await db.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return null;
  return { adminId: user.id, db };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { db } = auth;
  const { data } = await db
    .from("seat_requests")
    .select(SEAT_COLUMNS)
    .neq("status", "canceled")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as SeatRequestRow[];
  const hostIds = [...new Set(rows.map((r) => r.host_id))];
  const hosts: Record<string, { full_name: string | null; email: string; phone: string | null }> = {};
  if (hostIds.length) {
    const { data: hs } = await db.from("users").select("id, full_name, email, phone").in("id", hostIds);
    for (const h of (hs ?? []) as Array<{ id: string; full_name: string | null; email: string; phone: string | null }>) hosts[h.id] = h;
  }
  return NextResponse.json({
    ok: true,
    defaultPaymentUrl: await getDefaultSeatPaymentUrl(db),
    requests: rows.map((r) => ({ ...r, host: hosts[r.host_id] ?? null })),
  });
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    id: z.string().uuid(),
    price_label: z.string().trim().min(1).max(60),
    payment_url: z.string().trim().url().max(1000).refine((u) => u.startsWith("https://"), "https"),
    admin_note: z.string().trim().max(500).optional().or(z.literal("")),
  }),
  z.object({ action: z.literal("reject"), id: z.string().uuid(), admin_note: z.string().trim().max(500).optional().or(z.literal("")) }),
  z.object({ action: z.literal("mark_paid"), id: z.string().uuid() }),
  z.object({ action: z.literal("reopen"), id: z.string().uuid() }),
]);

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  const body = parsed.data;
  const { db, adminId } = auth;

  const { data: row } = await db.from("seat_requests").select(SEAT_COLUMNS).eq("id", body.id).maybeSingle();
  const seat = row as SeatRequestRow | null;
  if (!seat) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const reviewed = { reviewed_at: new Date().toISOString(), reviewed_by: adminId };

  switch (body.action) {
    case "approve": {
      if (seat.status !== "requested" && seat.status !== "approved") return NextResponse.json({ error: "bad_status" }, { status: 409 });
      await db
        .from("seat_requests")
        .update({ status: "approved", price_label: body.price_label, payment_url: body.payment_url, admin_note: body.admin_note || null, ...reviewed })
        .eq("id", seat.id);
      const { data: h } = await db.from("users").select("email, full_name, program").eq("id", seat.host_id).maybeSingle();
      const host = h as { email: string; full_name: string | null; program: string | null } | null;
      let emailed = false;
      if (host) {
        const r = await sendSeatQuoteEmail({
          to: host.email,
          name: host.full_name,
          partnerName: seat.partner_name,
          program: isProgram(host.program) ? host.program : "live",
        });
        emailed = r.ok;
        if (!r.ok) console.warn("[admin/seats] aviso no enviado:", r.error);
      }
      return NextResponse.json({ ok: true, emailed });
    }
    case "reject": {
      if (seat.status === "paid") return NextResponse.json({ error: "bad_status" }, { status: 409 });
      await db.from("seat_requests").update({ status: "rejected", admin_note: body.admin_note || null, ...reviewed }).eq("id", seat.id);
      return NextResponse.json({ ok: true });
    }
    case "reopen": {
      if (seat.status === "paid") return NextResponse.json({ error: "bad_status" }, { status: 409 });
      await db.from("seat_requests").update({ status: "requested", ...reviewed }).eq("id", seat.id);
      return NextResponse.json({ ok: true });
    }
    case "mark_paid": {
      if (seat.status !== "approved") return NextResponse.json({ error: "bad_status" }, { status: 409 });
      const { data: h } = await db.from("users").select("email").eq("id", seat.host_id).maybeSingle();
      const r = await fulfillSeatRequest(db, seat, {
        payerEmail: (h as { email?: string } | null)?.email ?? null,
        source: "manual",
        createdBy: adminId,
      });
      if (!r.ok) return NextResponse.json({ error: "internal", detail: r.error }, { status: 500 });
      return NextResponse.json({ ok: true, action: r.action });
    }
  }
}
