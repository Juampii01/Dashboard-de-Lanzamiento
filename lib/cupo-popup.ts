/**
 * Ventana "¡Quiero mi cupo!" (pantalla completa, una sola vez por persona).
 * Se configura en app_settings desde /admin/ventas, sin deploy:
 *   cupo_popup_enabled   "true" para mostrarla
 *   cupo_popup_title     título
 *   cupo_popup_text      texto de la oferta
 *   cupo_popup_button    texto del botón
 *   cupo_popup_whatsapp  número (solo dígitos, con código de país)
 * Quién ya la vio sale de proximo_paso_clicks (quiero_cupo / quiero_cupo_visto).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type CupoPopup = { title: string; text: string; button: string; whatsapp: string };

export const CUPO_DEFAULTS: CupoPopup = {
  title: "¡Quiero mi cupo!",
  text: "Los cupos son limitados. Toca el botón y te escribimos por WhatsApp para reservar el tuyo.",
  button: "¡Quiero mi cupo!",
  whatsapp: "17329373088",
};

export const CUPO_KEYS = ["cupo_popup_enabled", "cupo_popup_title", "cupo_popup_text", "cupo_popup_button", "cupo_popup_whatsapp"];

/** Devuelve la ventana a mostrarle a este usuario, o null si no corresponde. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCupoPopupFor(db: SupabaseClient<any, any, any>, userId: string): Promise<CupoPopup | null> {
  const { data } = await db.from("app_settings").select("key, value").in("key", CUPO_KEYS);
  const s: Record<string, string> = {};
  for (const r of (data ?? []) as { key: string; value: string | null }[]) s[r.key] = (r.value ?? "").trim();
  if (s.cupo_popup_enabled !== "true") return null;

  const { count } = await db
    .from("proximo_paso_clicks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("button", ["quiero_cupo", "quiero_cupo_visto"]);
  if ((count ?? 0) > 0) return null;

  const whatsapp = (s.cupo_popup_whatsapp || CUPO_DEFAULTS.whatsapp).replace(/[^\d]/g, "");
  return {
    title: s.cupo_popup_title || CUPO_DEFAULTS.title,
    text: s.cupo_popup_text || CUPO_DEFAULTS.text,
    button: s.cupo_popup_button || CUPO_DEFAULTS.button,
    whatsapp,
  };
}
