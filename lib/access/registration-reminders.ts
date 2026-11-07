/**
 * Compradores que pagaron pero todavía no crearon su cuenta.
 *
 * Una compra cuenta como "sin registrar" si:
 *  - no está vinculada a ninguna cuenta (claimed_by null),
 *  - no existe ninguna cuenta con ese email,
 *  - y nadie declaró ese email como "email de compra" desde /en-verificacion
 *    (esa persona ya tiene cuenta y la está resolviendo el equipo).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail } from "@/lib/access/purchases";
import { sendWelcomeEmail } from "@/lib/email/send-welcome-email";
import { programForProduct } from "@/lib/program";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export type UnregisteredBuyer = {
  id: string;
  email: string;
  full_name: string | null;
  product: string;
  created_at: string;
  registration_reminders_sent: number;
  last_registration_reminder_at: string | null;
};

/** Máximo de recordatorios automáticos por compra. */
export const AUTO_MAX_REMINDERS = 3;
/** Horas mínimas entre recordatorios automáticos a la misma persona. */
export const AUTO_MIN_GAP_HOURS = 48;
/** Horas desde la compra antes del primer recordatorio automático (ya recibió el de bienvenida). */
export const AUTO_FIRST_DELAY_HOURS = 20;

async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await query(from, from + 999);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export async function getUnregisteredBuyers(db: Db, products: string[]): Promise<UnregisteredBuyer[]> {
  const [purchases, users] = await Promise.all([
    fetchAll<UnregisteredBuyer>((a, b) =>
      db
        .from("purchases")
        .select("id, email, full_name, product, created_at, registration_reminders_sent, last_registration_reminder_at")
        .in("product", products)
        .is("claimed_by", null)
        .order("created_at", { ascending: true })
        .range(a, b)
    ),
    fetchAll<{ email: string | null; purchase_email_claim: string | null }>((a, b) =>
      db.from("users").select("email, purchase_email_claim").range(a, b)
    ),
  ]);

  const taken = new Set<string>();
  for (const u of users) {
    if (u.email) taken.add(normalizeEmail(u.email));
    if (u.purchase_email_claim) taken.add(normalizeEmail(u.purchase_email_claim));
  }
  return purchases.filter((p) => p.email && !taken.has(normalizeEmail(p.email)));
}

/** Manda el recordatorio y deja registrado el envío en la compra. */
export async function sendRegistrationReminder(db: Db, p: UnregisteredBuyer): Promise<{ ok: boolean; error?: string }> {
  const res = await sendWelcomeEmail({
    to: p.email,
    name: p.full_name,
    program: programForProduct(p.product),
    reminder: true,
  });
  if (res.ok) {
    await db
      .from("purchases")
      .update({
        registration_reminders_sent: (p.registration_reminders_sent ?? 0) + 1,
        last_registration_reminder_at: new Date().toISOString(),
      })
      .eq("id", p.id);
  }
  return res;
}

export function isDueForAutoReminder(p: UnregisteredBuyer, now = Date.now()): boolean {
  if ((p.registration_reminders_sent ?? 0) >= AUTO_MAX_REMINDERS) return false;
  if (now - Date.parse(p.created_at) < AUTO_FIRST_DELAY_HOURS * 3600_000) return false;
  if (p.last_registration_reminder_at && now - Date.parse(p.last_registration_reminder_at) < AUTO_MIN_GAP_HOURS * 3600_000) {
    return false;
  }
  return true;
}
