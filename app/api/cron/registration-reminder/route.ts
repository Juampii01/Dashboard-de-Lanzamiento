import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { LIVE_PRODUCT, ONDEMAND_PRODUCT } from "@/lib/program";
import {
  getUnregisteredBuyers,
  isDueForAutoReminder,
  sendRegistrationReminder,
} from "@/lib/access/registration-reminders";

/**
 * Recordatorio automático de registro (Vercel Cron, una vez por día).
 *
 * A quién: compró, no tiene cuenta, la compra tiene más de 20 h, recibió menos
 * de 3 recordatorios y el último fue hace más de 48 h.
 * En vivo: se manda hasta el 21/11 (fin del challenge). On demand: siempre.
 * Se puede apagar con app_settings.registration_reminders_auto = 'false'.
 */
export const maxDuration = 300;

const LIVE_AUTO_UNTIL = Date.parse("2026-11-21T05:00:00Z");
const MAX_PER_RUN = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: flag } = await db.from("app_settings").select("value").eq("key", "registration_reminders_auto").maybeSingle();
  if ((flag as { value?: string } | null)?.value === "false") {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }

  const products = Date.now() < LIVE_AUTO_UNTIL ? [LIVE_PRODUCT, ONDEMAND_PRODUCT] : [ONDEMAND_PRODUCT];
  const due = (await getUnregisteredBuyers(db, products)).filter((p) => isDueForAutoReminder(p)).slice(0, MAX_PER_RUN);

  let sent = 0;
  let failed = 0;
  for (const p of due) {
    const r = await sendRegistrationReminder(db, p);
    if (r.ok) sent++;
    else {
      failed++;
      console.warn("[cron/registration-reminder]", p.email, r.error);
    }
    await new Promise((res) => setTimeout(res, 250));
  }
  console.log(`[cron/registration-reminder] due=${due.length} sent=${sent} failed=${failed}`);
  return NextResponse.json({ ok: true, due: due.length, sent, failed });
}
