import { createServiceClient } from "@/lib/supabase/server";

/**
 * Tope de puntos vigente (app_settings.points_cap hasta points_cap_until).
 * Devuelve null si no hay tope. El tope real lo aplica la base
 * (add_points + trigger users_enforce_points_cap); esto es solo para mostrarlo.
 */
export async function getPointsCap(): Promise<number | null> {
  const { data } = await createServiceClient()
    .from("app_settings")
    .select("key, value")
    .in("key", ["points_cap", "points_cap_until"]);
  const rows = (data ?? []) as Array<{ key: string; value: string | null }>;
  const cap = rows.find((r) => r.key === "points_cap")?.value ?? "";
  const until = rows.find((r) => r.key === "points_cap_until")?.value ?? "";
  if (!/^\d+$/.test(cap)) return null;
  if (until && Date.now() >= new Date(until).getTime()) return null;
  return Number(cap);
}
