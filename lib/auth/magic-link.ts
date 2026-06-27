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
 */
export function buildMagicLinkUrl(
  appUrl: string,
  props: { hashed_token?: string; verification_type?: string } | null | undefined,
  next = "/dashboard"
): string | null {
  const token = props?.hashed_token;
  if (!token) return null;
  const type = props?.verification_type || "magiclink";
  const base = appUrl.replace(/\/$/, "");
  return `${base}/auth/confirm?token_hash=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&next=${encodeURIComponent(next)}`;
}
