/**
 * Construye el magic link que loguea DIRECTO (un solo clic), apuntando a
 * /auth/confirm con `token_hash` (flujo verifyOtp).
 *
 * Por qué NO usar properties.action_link de admin.generateLink:
 * ese link (/auth/v1/verify) redirige a /auth/confirm SIN un `?code=` usable
 * (no hay PKCE verifier en el navegador del usuario), así que /auth/confirm
 * no puede crear la sesión y manda al login → el usuario tiene que volver a
 * pedir el mail ("dos emails"). Con token_hash, /auth/confirm hace verifyOtp
 * server-friendly y loguea directo.
 *
 * El dominio se fija a producción a propósito: si el link usara el dominio de
 * Vercel (govbidder-challenge.vercel.app), la sesión quedaría en ESE dominio y
 * el usuario no estaría logueado en dboard.govbidder.net. NEXT_PUBLIC_APP_URL en
 * Vercel está mal seteado al subdominio, así que no dependemos de esa env.
 */
const APP_BASE = "https://dboard.govbidder.net";

export function buildMagicLinkUrl(
  props: { hashed_token?: string; verification_type?: string } | null | undefined,
  next = "/dashboard"
): string | null {
  const token = props?.hashed_token;
  if (!token) return null;
  const type = props?.verification_type || "magiclink";
  return `${APP_BASE}/auth/confirm?token_hash=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&next=${encodeURIComponent(next)}`;
}
