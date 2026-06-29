import { createServiceClient } from "@/lib/supabase/server";
import { sendAccessEmail } from "@/lib/email/send-access-email";
import { buildMagicLinkUrl } from "@/lib/auth/magic-link";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * POST /api/registro  (PÚBLICO — sin login)
 * Auto-registro de USUARIOS GRATUITOS: crea la cuenta (is_student = true → usan
 * todo el dashboard y suman puntos, pero NO compiten por el ranking ni los
 * premios) y les manda el email de acceso (magic link) automáticamente.
 *
 * Protecciones básicas: validación, honeypot, rate-limit por IP (best-effort,
 * en memoria) y dedupe por email. No reemplaza un captcha si hay abuso real.
 */
export const maxDuration = 60;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://dboard.govbidder.net").replace(/\/$/, "");
// Acceso de la cohorte del lanzamiento: fin del 30 de julio (hora Miami).
const ACCESS_EXPIRES = "2026-07-31T03:59:59Z";

const schema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  phone: z.string().max(40).optional().nullable(),
  website: z.string().optional(), // honeypot (debe venir vacío)
});

// Rate-limit best-effort en memoria (se reinicia en cold start).
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 5; // máx 5 registros por IP cada 10 min
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  const full_name = parsed.data.full_name.trim();
  const email = parsed.data.email.trim().toLowerCase();
  const phone = parsed.data.phone?.trim() || null;
  const website = parsed.data.website ?? "";
  if (full_name.length < 2) return NextResponse.json({ error: "invalid_email" }, { status: 400 });

  // Honeypot: si viene relleno es un bot → fingimos éxito sin crear nada.
  if (website.trim()) return NextResponse.json({ ok: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const admin = createServiceClient();

  // ¿Ya existe? → no recreamos ni reenviamos; le decimos que revise su email.
  const { data: existing } = await admin.from("users").select("id").ilike("email", email).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, alreadyRegistered: true });

  let newUserId: string | null = null;
  try {
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: full_name, full_name },
    });
    if (createError || !createData?.user) throw new Error(createError?.message ?? "create_failed");
    newUserId = createData.user.id;

    const { error: updErr } = await admin
      .from("users")
      .update({
        full_name,
        phone: phone || null,
        hotmart_transaction_id: `FREE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        access_starts_at: new Date().toISOString(),
        access_expires_at: ACCESS_EXPIRES,
        is_student: true, // usuario gratuito: NO compite por ranking ni premios
      } as Record<string, unknown>)
      .eq("id", newUserId);
    if (updErr) {
      await admin.auth.admin.deleteUser(newUserId);
      newUserId = null;
      throw new Error(updErr.message);
    }

    // Desbloquear Día 1.
    await admin.from("day_progress").update({ is_unlocked: true }).eq("user_id", newUserId).eq("day_number", 1);

    // Magic link + email de acceso (Resend).
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${APP_URL}/auth/confirm` },
    });
    const magicLink = buildMagicLinkUrl(
      (linkData as { properties?: { hashed_token?: string; verification_type?: string } } | null)?.properties
    );
    let emailSent = false;
    if (magicLink) {
      const sent = await sendAccessEmail({ to: email, magicLink, appUrl: APP_URL });
      emailSent = sent.ok;
    }

    return NextResponse.json({ ok: true, emailSent });
  } catch (e) {
    console.error("[registro] error:", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
