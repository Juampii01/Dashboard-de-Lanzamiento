import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ahora las filas de daily_missions NUNCA se borran (ver migración
 * 20260701000003_mission_history.sql) — se conservan como historial. Para que
 * el estado "sin misión activa" siga distinguiendo "caducó" de "Próximamente",
 * se marca CÓMO se cerró la última misión en `closed_as`.
 *
 * Resiliente: si la columna `closed_as` todavía no existe (falta correr la
 * migración), cae al heurístico viejo (cualquier fila = "expired").
 */
export async function getDailyMissionCloseState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: SupabaseClient<any>
): Promise<"expired" | "removed" | "none"> {
  const { data: latest, error } = await service
    .from("daily_missions")
    .select("closed_as")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && /closed_as/i.test(error.message)) {
    const { count } = await service.from("daily_missions").select("id", { count: "exact", head: true });
    return (count ?? 0) > 0 ? "expired" : "none";
  }

  const v = (latest as { closed_as?: string | null } | null)?.closed_as;
  return v === "expired" ? "expired" : v === "removed" ? "removed" : "none";
}
