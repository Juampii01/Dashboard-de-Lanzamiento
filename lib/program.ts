/**
 * Programas de la plataforma.
 *
 *   live     → challenge en vivo           → dboard.govbidder.net
 *   ondemand → versión grabada (US$500)    → ondemand.govbidder.net
 *
 * Una sola plataforma, una base de datos. El acceso lo decide users.program
 * (ver la migración 20261103000001). El dominio solo decide:
 *   - qué producto se reclama al registrarse,
 *   - a qué dominio apuntan los links de los emails.
 *
 * Módulo server-safe (sin "use client"): no importa nada de Next ni de Supabase.
 */

export type Program = "live" | "ondemand";

/** Producto del lanzamiento en vivo actual (ver lib/access/purchases.ts). */
export const LIVE_PRODUCT = "challenge-2026-11";
/** Producto de la versión grabada. No cambia entre lanzamientos. */
export const ONDEMAND_PRODUCT = "challenge-ondemand";

// El dominio del en vivo se fija a propósito: NEXT_PUBLIC_APP_URL en Vercel
// apunta al subdominio de Vercel (ver lib/auth/magic-link.ts).
export const LIVE_URL = "https://dboard.govbidder.net";
export const ONDEMAND_URL = (process.env.NEXT_PUBLIC_ONDEMAND_URL || "https://ondemand.govbidder.net").replace(/\/$/, "");

const ONDEMAND_HOST = safeHost(ONDEMAND_URL) ?? "ondemand.govbidder.net";

function safeHost(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

export function isProgram(v: unknown): v is Program {
  return v === "live" || v === "ondemand";
}

/**
 * Programa según el host del request. Cualquier host que empiece con
 * "ondemand." (producción, previews con dominio propio) cuenta como on demand.
 * En localhost se puede probar on demand con el host "ondemand.localhost:3000".
 */
export function programFromHost(host: string | null | undefined): Program {
  const h = (host ?? "").toLowerCase().split(",")[0].trim();
  if (!h) return "live";
  if (h === ONDEMAND_HOST || h.startsWith("ondemand.")) return "ondemand";
  return "live";
}

export function productForProgram(program: Program): string {
  return program === "ondemand" ? ONDEMAND_PRODUCT : LIVE_PRODUCT;
}

export function programForProduct(product: string | null | undefined): Program {
  return product === ONDEMAND_PRODUCT ? "ondemand" : "live";
}

export function baseUrlForProgram(program: Program): string {
  return program === "ondemand" ? ONDEMAND_URL : LIVE_URL;
}

/** Host canónico de cada programa (para redirigir a la persona a su dominio). */
export function hostForProgram(program: Program): string {
  return safeHost(baseUrlForProgram(program)) ?? (program === "ondemand" ? "ondemand.govbidder.net" : "dboard.govbidder.net");
}

/** Nombre visible del programa (emails, pantallas de acceso). */
export function programLabel(program: Program): string {
  return program === "ondemand" ? "Tu Primer Contrato Challenge · On Demand" : "Tu Primer Contrato Challenge";
}
