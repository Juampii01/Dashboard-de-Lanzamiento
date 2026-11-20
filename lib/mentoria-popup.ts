/**
 * Ventana a pantalla completa de la mentoría "Tu Primer Contrato".
 *
 * - Se activa/desactiva desde /admin/ventas (app_settings.mentoria_popup_enabled).
 * - La ven todos los participantes del en vivo (hayan hecho el Día 4 o no),
 *   menos admins y viewers.
 * - Aparece UNA sola vez por persona: apenas se muestra se registra
 *   "mentoria_visto" en proximo_paso_clicks y no vuelve a salir, aunque cierre
 *   la pestaña sin responder.
 * - Respuestas: mentoria_pagar / mentoria_hablar / mentoria_no.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const MENTORIA_SETTING = "mentoria_popup_enabled";
export const MENTORIA_BUTTONS = ["mentoria_visto", "mentoria_pagar", "mentoria_hablar", "mentoria_no"] as const;
export type MentoriaButton = (typeof MENTORIA_BUTTONS)[number];

export const MENTORIA_PAYMENT_LINK =
  process.env.NEXT_PUBLIC_MENTORIA_PAYMENT_LINK ?? "https://payments.govbidder.net/tpcusa";
export const MENTORIA_WHATSAPP = (process.env.NEXT_PUBLIC_MENTORIA_WHATSAPP ?? "17329373088").replace(/\D/g, "");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export async function isMentoriaPopupEnabled(db: Db): Promise<boolean> {
  const { data } = await db.from("app_settings").select("value").eq("key", MENTORIA_SETTING).maybeSingle();
  return (data as { value?: string } | null)?.value === "true";
}

/** true si esta persona ya vio la ventana (o respondió). */
export async function hasSeenMentoriaPopup(db: Db, userId: string): Promise<boolean> {
  const { count } = await db
    .from("proximo_paso_clicks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("button", MENTORIA_BUTTONS as unknown as string[]);
  return (count ?? 0) > 0;
}

/** ¿Hay que mostrársela ahora? */
export async function shouldShowMentoriaPopup(db: Db, userId: string): Promise<boolean> {
  if (!(await isMentoriaPopupEnabled(db))) return false;
  return !(await hasSeenMentoriaPopup(db, userId));
}
