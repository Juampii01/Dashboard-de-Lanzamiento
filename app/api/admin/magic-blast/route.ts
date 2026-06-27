import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendAccessEmail } from "@/lib/email/send-access-email";
import { buildMagicLinkUrl } from "@/lib/auth/magic-link";

// Envío masivo de magic links (acceso al dashboard) — replica el flujo probado
// de create-user: admin.generateLink (magiclink, redirectTo /auth/confirm) +
// sendAccessEmail (Resend). NO usa signInWithOtp (eso rompería por PKCE), y al
// ser endpoint admin no toca el rate limit por-IP de auth.
//
// Body: { test: true } → manda SOLO al admin que llama (para probar).
//       { offset, limit } → manda a una tanda de no-admins [offset, offset+limit).
// Devuelve { sent, failed, errors, processed, total, nextOffset } para que el
// cliente vaya llamando por tandas hasta nextOffset = null.

export const maxDuration = 300;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://dboard.govbidder.net").replace(/\/$/, "");
const DEFAULT_LIMIT = 25;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createServiceClient();
  const { data: me } = await admin
    .from("users")
    .select("is_admin, email")
    .eq("id", user.id)
    .maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { test?: boolean; offset?: number; limit?: number };

  // Construir la lista de destinatarios
  let recipients: string[];
  let total: number;
  let offset = 0;
  if (body.test) {
    const selfEmail = (me as { email?: string } | null)?.email;
    if (!selfEmail) return NextResponse.json({ error: "no_self_email" }, { status: 400 });
    recipients = [selfEmail];
    total = 1;
  } else {
    const { data: users } = await admin
      .from("users")
      .select("email")
      .eq("is_admin", false)
      .order("email");
    const allEmails = ((users ?? []) as { email: string | null }[])
      .map((u) => u.email)
      .filter((e): e is string => !!e);
    total = allEmails.length;
    offset = Math.max(0, body.offset ?? 0);
    const limit = Math.min(100, Math.max(1, body.limit ?? DEFAULT_LIMIT));
    recipients = allEmails.slice(offset, offset + limit);
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const email of recipients) {
    try {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${APP_URL}/auth/confirm` },
      });
      const magicLink = buildMagicLinkUrl(
        APP_URL,
        (linkData as { properties?: { hashed_token?: string; verification_type?: string } } | null)?.properties
      );
      if (linkError || !magicLink) {
        failed++;
        errors.push(`${email}: link ${linkError?.message ?? "vacío"}`);
        continue;
      }
      const res = await sendAccessEmail({ to: email, magicLink, appUrl: APP_URL });
      if (res.ok) sent++;
      else {
        failed++;
        errors.push(`${email}: ${res.error}`);
      }
    } catch (e) {
      failed++;
      errors.push(`${email}: ${e instanceof Error ? e.message : "error"}`);
    }
    await new Promise((r) => setTimeout(r, 120)); // suave, bajo el 5 req/s de Resend
  }

  const processedEnd = offset + recipients.length;
  const nextOffset = body.test ? null : processedEnd < total ? processedEnd : null;

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    errors: errors.slice(0, 20),
    processed: recipients.length,
    total,
    nextOffset,
  });
}
