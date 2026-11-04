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
import { LIVE_PRODUCT, ONDEMAND_PRODUCT } from "@/lib/program";

/**
 * Producto del lanzamiento actual. Cambiarlo en cada lanzamiento nuevo separa
 * las listas de compradores y permite que un participante anterior vuelva a
 * comprar (claim_purchase aplica "una compra = una cuenta" por producto).
 * Lanzamientos: "challenge" (hasta oct-2026), "challenge-2026-11".
 * Se define en lib/program.ts (LIVE_PRODUCT).
 */
export const CURRENT_PRODUCT = LIVE_PRODUCT;

/** Productos que dan acceso a la plataforma hoy (en vivo y on demand). */
export const ACCESS_PRODUCTS = [LIVE_PRODUCT, ONDEMAND_PRODUCT] as const;
export type AccessProduct = (typeof ACCESS_PRODUCTS)[number];

export function isAccessProduct(v: unknown): v is AccessProduct {
  return (ACCESS_PRODUCTS as readonly string[]).includes(v as string);
}

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
  // On demand: acceso indefinido. En vivo: fin del acceso del lanzamiento.
  const { data: pr } = await db.from("purchases").select("product").eq("id", purchaseId).maybeSingle();
  const product = (pr as { product?: string } | null)?.product;
  const expires = product === ONDEMAND_PRODUCT ? null : await getLaunchExpiry(db);
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

/**
 * claimed        → se vinculó una compra nueva ahora
 * already_mine   → la compra con ese email ya era de esta cuenta (no hay nada nuevo)
 * no_purchase    → no hay compra con ese email
 * purchase_taken → la compra existe pero es de otra cuenta
 */
export type AutoClaimResult = "claimed" | "already_mine" | "no_purchase" | "purchase_taken";

/**
 * Intenta dar acceso automático buscando una compra con el MISMO email de la
 * cuenta. Nunca usa un email declarado por el participante: eso lo verifica
 * el equipo a mano (si no, cualquiera podría tomar la compra de otra persona
 * escribiendo su email).
 */
export async function autoClaimByAccountEmail(
  db: Db,
  userId: string,
  accountEmail: string,
  products: readonly string[] = ACCESS_PRODUCTS,
): Promise<AutoClaimResult> {
  // Prueba los productos en orden (el primero es el del dominio por el que
  // entró la persona). Así, si alguien que compró la grabación se registra por
  // el dominio del en vivo, igual entra (y su cuenta pasa a on demand).
  // "already_mine" (la compra ya era de esta cuenta) NO corta la búsqueda: una
  // cuenta del en vivo vencida que compró la grabación tiene que poder
  // reclamarla. Y no cuenta como "claimed": si no, el layout redirige a
  // /dashboard en loop a una cuenta vencida que no compró nada nuevo.
  let result: AutoClaimResult = "no_purchase";
  for (const product of products) {
    const r = await claimOne(db, userId, normalizeEmail(accountEmail), product);
    if (r === "claimed") return r;
    if (r === "purchase_taken" || (r === "already_mine" && result === "no_purchase")) result = r;
  }
  return result;
}

async function claimOne(db: Db, userId: string, email: string, product: string): Promise<AutoClaimResult> {
  const { data } = await db
    .from("purchases")
    .select("id, claimed_by")
    .eq("product", product)
    .eq("email", email)
    .maybeSingle();
  const p = data as { id: string; claimed_by: string | null } | null;
  if (!p) return "no_purchase";
  if (p.claimed_by && p.claimed_by !== userId) return "purchase_taken";
  if (p.claimed_by === userId) return "already_mine";
  return (await claimPurchase(db, userId, p.id)) ? "claimed" : "purchase_taken";
}

/** Productos a probar, con el del programa indicado primero. */
export function productsFor(program: "live" | "ondemand"): readonly string[] {
  return program === "ondemand" ? [ONDEMAND_PRODUCT, LIVE_PRODUCT] : [LIVE_PRODUCT, ONDEMAND_PRODUCT];
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
