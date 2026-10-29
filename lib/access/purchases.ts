/**
 * Compras y acceso al challenge.
 *
 * Dos registros separados que se cruzan:
 *   - public.purchases → quién compró (CSV desde el admin o webhook de Hotmart)
 *   - public.users     → quién se registró con email y contraseña
 *
 * Regla de negocio: UNA compra = UNA cuenta. El vínculo lo hace la función SQL
 * claim_purchase() de forma atómica (ver la migración 20261022000001).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { REFERRAL_LEAD_XP } from "@/lib/referrals";

/**
 * Producto del lanzamiento actual. Cambiarlo en cada lanzamiento nuevo separa
 * las listas de compradores y permite que un participante anterior vuelva a
 * comprar (claim_purchase aplica "una compra = una cuenta" por producto).
 * Lanzamientos: "challenge" (hasta oct-2026), "challenge-2026-11".
 */
export const CURRENT_PRODUCT = "challenge-2026-11";

export const PURCHASE_SOURCES = ["hotmart", "sem", "stripe", "ghl", "manual"] as const;
export type PurchaseSource = (typeof PURCHASE_SOURCES)[number];

// El cliente tipado del proyecto no conoce las tablas nuevas; usamos uno sin tipos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Fecha de fin de acceso configurada en el admin (app_settings), o null = sin vencimiento. */
export async function getLaunchExpiry(db: Db): Promise<string | null> {
  const { data } = await db.from("app_settings").select("value").eq("key", "launch_access_expires_at").maybeSingle();
  const v = (data as { value?: string | null } | null)?.value;
  return v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null;
}

/**
 * Vincula una compra a una cuenta (atómico). Devuelve false si la compra ya
 * estaba tomada o si la cuenta ya tenía otra compra.
 */
export async function claimPurchase(
  db: Db,
  userId: string,
  purchaseId: string,
  verifiedBy: string | null = null
): Promise<boolean> {
  const expires = await getLaunchExpiry(db);
  const { data, error } = await db.rpc("claim_purchase", {
    p_user_id: userId,
    p_purchase_id: purchaseId,
    p_expires_at: expires,
    p_verified_by: verifiedBy,
  });
  if (error) {
    console.error("[claim_purchase]", error.message);
    return false;
  }
  if (data === true) {
    await creditReferrer(db, userId);
    return true;
  }
  return false;
}

export type AutoClaimResult = "claimed" | "no_purchase" | "purchase_taken";

/**
 * Intenta dar acceso automático buscando una compra con el MISMO email de la
 * cuenta. Nunca usa un email declarado por el participante: eso lo verifica
 * el equipo a mano (si no, cualquiera podría tomar la compra de otra persona
 * escribiendo su email).
 */
export async function autoClaimByAccountEmail(db: Db, userId: string, accountEmail: string): Promise<AutoClaimResult> {
  const email = normalizeEmail(accountEmail);
  const { data } = await db
    .from("purchases")
    .select("id, claimed_by")
    .eq("product", CURRENT_PRODUCT)
    .eq("email", email)
    .maybeSingle();
  const p = data as { id: string; claimed_by: string | null } | null;
  if (!p) return "no_purchase";
  if (p.claimed_by && p.claimed_by !== userId) return "purchase_taken";
  if (p.claimed_by === userId) return "claimed";
  return (await claimPurchase(db, userId, p.id)) ? "claimed" : "purchase_taken";
}

/** Deja la cuenta en verificación manual. */
export async function markPending(db: Db, userId: string) {
  await db
    .from("users")
    .update({ access_status: "pending", verification_requested_at: new Date().toISOString() })
    .eq("id", userId);
}

/**
 * Si el email de la cuenta fue referido por alguien, acredita al referidor
 * (una sola vez, nunca a sí mismo). Antes esto pasaba al crear el usuario desde
 * el admin; ahora pasa cuando la cuenta queda vinculada a una compra (= pagó).
 */
async function creditReferrer(db: Db, userId: string) {
  try {
    const { data: u } = await db.from("users").select("email").eq("id", userId).maybeSingle();
    const email = (u as { email?: string } | null)?.email;
    if (!email) return;
    const { data: lead } = await db
      .from("referral_leads")
      .select("id, referrer_id, credited_at")
      .eq("referred_email", normalizeEmail(email))
      .maybeSingle();
    const l = lead as { id: string; referrer_id: string; credited_at: string | null } | null;
    if (!l || l.credited_at || l.referrer_id === userId) return;
    await db.rpc("add_points", { p_user_id: l.referrer_id, p_delta: REFERRAL_LEAD_XP, p_category: "referral" });
    await db
      .from("referral_leads")
      .update({ credited_at: new Date().toISOString(), xp_awarded: REFERRAL_LEAD_XP })
      .eq("id", l.id);
  } catch (e) {
    console.warn("[creditReferrer]", e);
  }
}
