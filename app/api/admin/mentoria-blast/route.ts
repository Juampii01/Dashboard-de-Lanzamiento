import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendMentoriaEmail } from "@/lib/email/send-mentoria-email";

/**
 * Envío masivo del email de la mentoría "Tu Primer Contrato" (plan de pagos)
 * a TODOS los usuarios no-admin. Mismo patrón de tandas que reminder-blast
 * (offset/limit) para no pegarle de una a Resend (5 req/s).
 *
 * Body: { test: true } → manda SOLO al admin que llama (para probar).
 *       { offset, limit } → manda a una tanda [offset, offset+limit).
 */

export const maxDuration = 300;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://dboard.govbidder.net").replace(/\/$/, "");
const DEFAULT_LIMIT = 25;

async function getAllRecipients(admin: ReturnType<typeof createServiceClient>): Promise<{ email: string; full_name: string | null }[]> {
  const { data: users } = await admin
    .from("users")
    .select("email, full_name")
    .eq("is_admin", false);
  return ((users ?? []) as { email: string | null; full_name: string | null }[])
    .filter((u): u is { email: string; full_name: string | null } => !!u.email)
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createServiceClient();
  const { data: me } = await admin
    .from("users")
    .select("is_admin, email, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    test?: boolean;
    offset?: number;
    limit?: number;
  };

  let recipients: { email: string; full_name: string | null }[];
  let total: number;
  let offset = 0;

  if (body.test) {
    const selfEmail = (me as { email?: string } | null)?.email;
    if (!selfEmail) return NextResponse.json({ error: "no_self_email" }, { status: 400 });
    recipients = [{ email: selfEmail, full_name: (me as { full_name?: string | null } | null)?.full_name ?? null }];
    total = 1;
  } else {
    const all = await getAllRecipients(admin);
    total = all.length;
    offset = Math.max(0, body.offset ?? 0);
    const limit = Math.min(100, Math.max(1, body.limit ?? DEFAULT_LIMIT));
    recipients = all.slice(offset, offset + limit);
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    try {
      const res = await sendMentoriaEmail({ to: r.email, fullName: r.full_name ?? "", appUrl: APP_URL });
      if (res.ok) sent++;
      else {
        failed++;
        errors.push(`${r.email}: ${res.error}`);
      }
    } catch (e) {
      failed++;
      errors.push(`${r.email}: ${e instanceof Error ? e.message : "error"}`);
    }
    await new Promise((res) => setTimeout(res, 120)); // suave, bajo el 5 req/s de Resend
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

/** GET → conteo total de destinatarios, para mostrar en el panel antes de enviar. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createServiceClient();
  const { data: me } = await admin.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const all = await getAllRecipients(admin);
  return NextResponse.json({ ok: true, count: all.length });
}
