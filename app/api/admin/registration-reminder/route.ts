import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { LIVE_PRODUCT, ONDEMAND_PRODUCT } from "@/lib/program";
import { sendWelcomeEmail } from "@/lib/email/send-welcome-email";
import { getUnregisteredBuyers, sendRegistrationReminder } from "@/lib/access/registration-reminders";

/**
 * Recordatorio de registro a quienes pagaron y todavía no crearon su cuenta.
 *
 * GET  ?product=live|ondemand → cuántos hay sin registrar.
 * POST { product, test: true } → manda el email solo al admin que llama.
 * POST { product, offset } → manda a una tanda (mismo patrón que reminder-blast).
 */
export const maxDuration = 300;

const BATCH = 25;
/** Una corrida manual no repite a quien ya recibió el email en la última hora. */
const RECENT_MS = 60 * 60 * 1000;

function productFrom(v: unknown): string {
  return v === "ondemand" ? ONDEMAND_PRODUCT : LIVE_PRODUCT;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const db = createServiceClient();
  const { data: me } = await db.from("users").select("is_admin, email, full_name").eq("id", user.id).maybeSingle();
  const m = me as { is_admin?: boolean; email?: string; full_name?: string | null } | null;
  if (!m?.is_admin) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { db, me: m };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const product = productFrom(req.nextUrl.searchParams.get("product"));
  const buyers = await getUnregisteredBuyers(auth.db, [product]);
  const neverReminded = buyers.filter((b) => !b.registration_reminders_sent).length;
  return NextResponse.json({ ok: true, total: buyers.length, neverReminded });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { product?: string; test?: boolean; offset?: number };
  const product = productFrom(body.product);

  if (body.test) {
    if (!auth.me.email) return NextResponse.json({ error: "no_self_email" }, { status: 400 });
    const r = await sendWelcomeEmail({
      to: auth.me.email,
      name: auth.me.full_name,
      program: product === ONDEMAND_PRODUCT ? "ondemand" : "live",
      reminder: true,
    });
    return NextResponse.json({ ok: true, sent: r.ok ? 1 : 0, failed: r.ok ? 0 : 1, errors: r.error ? [r.error] : [], total: 1, nextOffset: null });
  }

  // La lista se recalcula en cada tanda: quien se registra mientras tanto sale
  // solo, y quien ya recibió este envío (última hora) no se repite.
  const all = await getUnregisteredBuyers(auth.db, [product]);
  const cutoff = Date.now() - RECENT_MS;
  const pending = all.filter((b) => !b.last_registration_reminder_at || Date.parse(b.last_registration_reminder_at) < cutoff);
  const batch = pending.slice(0, BATCH);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const p of batch) {
    const r = await sendRegistrationReminder(auth.db, p);
    if (r.ok) sent++;
    else {
      failed++;
      errors.push(`${p.email}: ${r.error}`);
    }
    await new Promise((res) => setTimeout(res, 250)); // bajo el límite de Resend
  }

  const remaining = pending.length - batch.length;
  // Si toda la tanda falló, se corta para no quedar en loop.
  const nextOffset = remaining > 0 && sent > 0 ? (body.offset ?? 0) + batch.length : null;
  return NextResponse.json({ ok: true, sent, failed, errors: errors.slice(0, 20), total: (body.offset ?? 0) + pending.length, nextOffset });
}
