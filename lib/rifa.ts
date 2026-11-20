import type { SupabaseClient } from "@supabase/supabase-js";

// Rifa en vivo de la clase final. Participan solo quienes tocaron
// "¡Quiero participar!" mientras el banner estaba activo (es decir, quienes
// estaban en la llamada). Se sortea ganador por ganador desde /admin/sorteo.

export const RIFA_SETTING = "rifa_banner_enabled";

export async function isRifaEnabled(service: SupabaseClient): Promise<boolean> {
  const { data } = await service.from("app_settings").select("value").eq("key", RIFA_SETTING).maybeSingle();
  return (data as { value?: string } | null)?.value === "true";
}

export async function hasJoinedRifa(service: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await service.from("rifa_participants").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

/** Puede participar: en vivo, no admin, no estudiante, no viewer, con compra. */
export function canJoinRifa(u: {
  program?: string | null; is_admin?: boolean | null; is_student?: boolean | null;
  viewer_of?: string | null; hotmart_transaction_id?: string | null;
} | null): boolean {
  return !!u && u.program === "live" && !u.is_admin && !u.is_student && !u.viewer_of && !!u.hotmart_transaction_id;
}

const ORDINALS = ["Primer", "Segundo", "Tercer", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo"];
export function ordinalWinner(n: number): string {
  return `${ORDINALS[n - 1] ?? `${n}.º`} ganador`;
}
