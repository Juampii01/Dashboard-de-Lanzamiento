import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { REFERRAL_LEAD_XP, REFERRAL_CAP } from "@/lib/referrals";

/**
 * POST /api/referrals/lead
 * Webhook que dispara GHL cuando un lead VERIFICADO completa el formulario.
 *
 * Header obligatorio: x-referral-secret = REFERRAL_WEBHOOK_SECRET (env var).
 * Body JSON: { email: string, ref: string, contact_id?: string }
 *
 * Acredita REFERRAL_LEAD_XP al referidor (RPC atómica add_points). Es
 * idempotente por email (UNIQUE en referral_leads). Devuelve 200 en todos los
 * casos "no acreditados" para que GHL no reintente; el único error es el 401.
 */
export async function POST(req: Request) {
  // 1. Gate principal: secreto del webhook (reemplaza la fricción del pago).
  const secret = process.env.REFERRAL_WEBHOOK_SECRET;
  const provided = req.headers.get("x-referral-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { email?: string; ref?: string; contact_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const ref = String(body.ref ?? "").trim().toUpperCase();
  const contactId = body.contact_id ? String(body.contact_id) : null;

  if (!email || !ref) {
    return NextResponse.json({ ok: true, awarded: false, reason: "missing_fields" });
  }

  const service = createServiceClient();

  // 2. Resolver el referidor por código.
  const { data: referrer } = await service
    .from("users")
    .select("id, email")
    .eq("referral_code", ref)
    .maybeSingle();
  if (!referrer) {
    return NextResponse.json({ ok: true, awarded: false, reason: "ref_not_found" });
  }

  // 3. Anti self-referral (por email).
  const refEmail = ((referrer as { email?: string | null }).email ?? "").toLowerCase();
  if (refEmail && refEmail === email) {
    return NextResponse.json({ ok: true, awarded: false, reason: "self_referral" });
  }

  // 4. Tope opcional.
  if (REFERRAL_CAP > 0) {
    const { count } = await service
      .from("referral_leads")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", (referrer as { id: string }).id);
    if ((count ?? 0) >= REFERRAL_CAP) {
      return NextResponse.json({ ok: true, awarded: false, reason: "cap_reached" });
    }
  }

  // 5. Idempotencia: insert por email. 23505 = ya existía → no acreditar de nuevo.
  const { error: insErr } = await service.from("referral_leads").insert({
    referrer_id: (referrer as { id: string }).id,
    referred_email: email,
    ghl_contact_id: contactId,
    xp_awarded: REFERRAL_LEAD_XP,
  } as Record<string, unknown>);

  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: true, awarded: false, reason: "duplicate" });
    }
    console.error("[referrals/lead] insert error:", insErr);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // 6. Acreditar XP al referidor (atómico).
  const { error: rpcErr } = await service.rpc("add_points", {
    p_user_id: (referrer as { id: string }).id,
    p_delta: REFERRAL_LEAD_XP,
  });
  if (rpcErr) {
    console.error("[referrals/lead] add_points error:", rpcErr);
    // El lead ya quedó registrado (idempotencia intacta). 200 para no gatillar reintentos.
    return NextResponse.json({ ok: true, awarded: false, reason: "award_failed" });
  }

  return NextResponse.json({ ok: true, awarded: true, xp: REFERRAL_LEAD_XP });
}
