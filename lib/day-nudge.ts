import type { SupabaseClient } from "@supabase/supabase-js";

export type DayNudge = { day: number; title: string; href: string } | null;

const DAY_TITLES: Record<number, string> = {
  1: "Perfil Estratégico",
  2: "Mapa de Códigos",
  3: "Web + Portales",
  4: "Capability Statement",
};

/**
 * Próximo día ABIERTO (admin_toggles.is_globally_unlocked, o admin) que el
 * usuario todavía NO completó. Se usa para el aviso no bloqueante de Inicio
 * ("completá el Día N"): al completar ese día, automáticamente pasa a avisar
 * el siguiente. null si no hay ninguno pendiente (todo al día, o el próximo
 * día abierto aún no lo abrió el admin).
 */
export async function getNextIncompleteDay(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: SupabaseClient<any>,
  userId: string,
  isAdmin: boolean
): Promise<DayNudge> {
  const [{ data: progressRows }, { data: toggleRows }] = await Promise.all([
    service.from("day_progress").select("day_number, is_completed").eq("user_id", userId),
    service.from("admin_toggles").select("day_number, is_globally_unlocked"),
  ]);

  const completedByDay = new Map(
    ((progressRows ?? []) as { day_number: number; is_completed: boolean }[]).map((p) => [p.day_number, p.is_completed])
  );
  const unlockedByDay = new Map(
    ((toggleRows ?? []) as { day_number: number; is_globally_unlocked: boolean }[]).map((t) => [t.day_number, t.is_globally_unlocked])
  );

  for (const day of [1, 2, 3, 4]) {
    const unlocked = isAdmin || unlockedByDay.get(day) === true;
    const completed = completedByDay.get(day) === true;
    if (unlocked && !completed) {
      return { day, title: DAY_TITLES[day], href: `/dashboard/dia-${day}` };
    }
  }
  return null;
}
