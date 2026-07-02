import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendReminderEmail, type ReminderSegment } from "@/lib/email/send-reminder-email";
import { buildMagicLinkUrl } from "@/lib/auth/magic-link";

/**
 * Envío masivo de emails de recordatorio, segmentado:
 *   - never_accessed: usuarios sin last_seen_at (nunca hicieron login).
 *   - day1_incomplete: usuarios CON actividad pero sin day_progress(day=1).is_completed.
 * Mismo patrón de tandas que magic-blast (offset/limit) para no pegarle
 * de una a Resend (5 req/s).
 *
 * Body: { segment, test?: true } → manda SOLO al admin que llama (para probar).
 *       { segment, offset, limit } → manda a una tanda [offset, offset+limit).
 */

export const maxDuration = 300;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://dboard.govbidder.net").replace(/\/$/, "");
const DEFAULT_LIMIT = 25;

async function getSegmentEmails(admin: ReturnType<typeof createServiceClient>, segment: ReminderSegment): Promise<string[]> {
  const { data: users } = await admin
    .from("users")
    .select("id, email, last_seen_at")
    .eq("is_admin", false);

  const rows = (users ?? []) as { id: string; email: string | null; last_seen_at: string | null }[];

  if (segment === "never_accessed") {
    return rows.filter((u) => !u.last_seen_at && u.email).map((u) => u.email as string).sort();
  }

  // day1_incomplete: con actividad, pero día 1 no completado.
  const accessed = rows.filter((u) => u.last_seen_at && u.email);
  const { data: progress } = await admin
    .from("day_progress")
    .select("user_id, day_number, is_completed")
    .eq("day_number", 1);
  const completedSet = new Set(
    ((progress ?? []) as { user_id: string; is_completed: boolean }[])
      .filter((p) => p.is_completed)
      .map((p) => p.user_id)
  );
  return accessed.filter((u) => !completedSet.has(u.id)).map((u) => u.email as string).sort();
}

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

  const body = (await req.json().catch(() => ({}))) as {
    segment?: string;
    test?: boolean;
    offset?: number;
    limit?: number;
  };

  const segment: ReminderSegment = body.segment === "day1_incomplete" ? "day1_incomplete" : "never_accessed";

  let recipients: string[];
  let total: number;
  let offset = 0;

  if (body.test) {
    const selfEmail = (me as { email?: string } | null)?.email;
    if (!selfEmail) return NextResponse.json({ error: "no_self_email" }, { status: 400 });
    recipients = [selfEmail];
    total = 1;
  } else {
    const allEmails = await getSegmentEmails(admin, segment);
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
        (linkData as { properties?: { hashed_token?: string; verification_type?: string } } | null)?.properties
      );
      if (linkError || !magicLink) {
        failed++;
        errors.push(`${email}: link ${linkError?.message ?? "vacío"}`);
        continue;
      }
      const res = await sendReminderEmail({ to: email, segment, magicLink, appUrl: APP_URL });
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

/** GET → conteo de cada segmento, para mostrar en el panel antes de enviar. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createServiceClient();
  const { data: me } = await admin.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [neverAccessed, day1Incomplete] = await Promise.all([
    getSegmentEmails(admin, "never_accessed"),
    getSegmentEmails(admin, "day1_incomplete"),
  ]);

  return NextResponse.json({
    ok: true,
    counts: { never_accessed: neverAccessed.length, day1_incomplete: day1Incomplete.length },
  });
}
