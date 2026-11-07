import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Interruptor global "Mostrar misiones a los participantes"
 * (app_settings.missions_visible). Cubre la misión diaria y las ráfagas.
 *
 * Con el interruptor apagado los admins siguen viendo y editando todo en
 * /admin/misiones, pero los participantes no ven las misiones en Misiones
 * Extra y el servidor rechaza sus respuestas. Si la fila no existe, las
 * misiones se muestran (comportamiento anterior).
 */
export const MISSIONS_VISIBLE_KEY = "missions_visible";

export async function areMissionsVisible(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: SupabaseClient<any>
): Promise<boolean> {
  const { data, error } = await service
    .from("app_settings")
    .select("value")
    .eq("key", MISSIONS_VISIBLE_KEY)
    .maybeSingle();
  if (error || !data) return true;
  return (data as { value?: string | null }).value !== "false";
}
