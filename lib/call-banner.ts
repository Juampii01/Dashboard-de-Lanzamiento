/**
 * Banner de la llamada en vivo (arriba de todo el dashboard).
 * Se configura en app_settings, sin deploy:
 *   call_banner_id         identificador de la llamada (cambiarlo = nueva llamada, se puede volver a sumar)
 *   call_banner_url        link de Zoom
 *   call_banner_starts_at  hora de inicio (ISO UTC)
 *   call_banner_ends_at    hasta cuándo se muestra (ISO UTC)
 *   call_banner_points     puntos por entrar desde el banner (no respeta el tope de 1.600)
 * Si falta el id o la URL, o ya pasó ends_at, no se muestra.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type CallBanner = { id: string; url: string; startsAt: string; endsAt: string; points: number };

/** Se muestra desde 6 h antes del inicio. */
export const CALL_BANNER_LEAD_MS = 6 * 60 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCallBanner(db: SupabaseClient<any, any, any>): Promise<CallBanner | null> {
  const { data } = await db
    .from("app_settings")
    .select("key, value")
    .in("key", ["call_banner_id", "call_banner_url", "call_banner_starts_at", "call_banner_ends_at", "call_banner_points"]);
  const s: Record<string, string> = {};
  for (const r of (data ?? []) as { key: string; value: string | null }[]) s[r.key] = (r.value ?? "").trim();
  const id = s.call_banner_id;
  const url = s.call_banner_url;
  const start = Date.parse(s.call_banner_starts_at ?? "");
  const end = Date.parse(s.call_banner_ends_at ?? "");
  if (!id || !/^https:\/\//.test(url ?? "") || !start || !end) return null;
  const now = Date.now();
  if (now > end || now < start - CALL_BANNER_LEAD_MS) return null;
  const points = Number(s.call_banner_points);
  return {
    id,
    url,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
    points: Number.isFinite(points) && points > 0 ? Math.floor(points) : 0,
  };
}
