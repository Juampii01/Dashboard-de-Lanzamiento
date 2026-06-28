import { createServiceClient } from "@/lib/supabase/server";
import { REFERRAL_REDIRECT_URL } from "@/lib/referrals";
import { NextResponse } from "next/server";

/**
 * POST /api/referrals/submit  (PÚBLICO — sin login)
 * Lo llama el formulario público /referido.
 * Body: { email: string, ref: string }
 * Guarda el lead { referrer_id, referred_email } en referral_leads. La XP al
 * referidor se acredita recién cuando se crea el usuario (= pagó).
 * Idempotente por email. Devuelve la URL de redirección (página de pago/acceso).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; ref?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const email = String(body.email ?? "").trim().toLowerCase();
  const ref = String(body.ref ?? "").trim().toUpperCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const redirectUrl = REFERRAL_REDIRECT_URL;
  const service = createServiceClient();

  // Si el email YA es un usuario (ya pagó / tiene acceso), no lo registramos
  // como lead nuevo ni lo mandamos a pagar de nuevo.
  const { data: existingUser } = await service
    .from("users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existingUser) {
    return NextResponse.json({ ok: true, alreadyUser: true });
  }

  // Si el email YA fue referido antes (existe como lead) pero TODAVÍA no es
  // usuario: no lo volvemos a agregar como referido (mantiene su atribución
  // original) pero SÍ lo dejamos seguir a la redirección de pago/acceso.
  const { data: existingLead } = await service
    .from("referral_leads")
    .select("id")
    .ilike("referred_email", email)
    .maybeSingle();
  if (existingLead) {
    return NextResponse.json({ ok: true, alreadyLead: true, redirectUrl });
  }

  // Sin código de referido válido igual dejamos pasar (redirige), solo que no
  // se registra atribución.
  if (!ref) {
    return NextResponse.json({ ok: true, attributed: false, redirectUrl });
  }

  const { data: referrer } = await service
    .from("users")
    .select("id, email")
    .eq("referral_code", ref)
    .maybeSingle();

  if (!referrer) {
    return NextResponse.json({ ok: true, attributed: false, redirectUrl });
  }

  // Anti self-referral.
  if (((referrer as { email?: string | null }).email ?? "").toLowerCase() === email) {
    return NextResponse.json({ ok: true, attributed: false, redirectUrl });
  }

  // Guardar el lead (idempotente por email). Aún SIN acreditar (credited_at null).
  const { error: insErr } = await service.from("referral_leads").insert({
    referrer_id: (referrer as { id: string }).id,
    referred_email: email,
    xp_awarded: 0,
  } as Record<string, unknown>);

  // 23505 = ya existía ese email → no pasa nada, igual redirige.
  if (insErr && (insErr as { code?: string }).code !== "23505") {
    console.error("[referrals/submit] insert error:", insErr);
  }

  return NextResponse.json({ ok: true, attributed: true, redirectUrl });
}
