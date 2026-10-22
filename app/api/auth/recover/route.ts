import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { buildMagicLinkUrl } from "@/lib/auth/magic-link";
import { sendPasswordEmail } from "@/lib/email/send-password-email";
import { normalizeEmail } from "@/lib/access/purchases";

/**
 * POST /api/auth/recover  (público)
 * Manda el email para crear o restablecer la contraseña.
 *
 * Responde siempre lo mismo exista o no la cuenta, para no revelar qué emails
 * están registrados.
 */
const schema = z.object({ email: z.string().trim().email().max(255) });

const hits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < 15 * 60 * 1000);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > 4;
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  const email = normalizeEmail(parsed.data.email);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip) || rateLimited(email)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const db = createServiceClient();
  const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email });
  if (!error) {
    const link = buildMagicLinkUrl(
      (data as { properties?: { hashed_token?: string; verification_type?: string } } | null)?.properties,
      "/nueva-contrasena"
    );
    if (link) {
      const sent = await sendPasswordEmail({ to: email, link });
      if (!sent.ok) console.error("[auth/recover] Resend:", sent.error);
    }
  }
  // Si el email no existe, generateLink falla: respondemos igual.
  return NextResponse.json({ ok: true });
}
