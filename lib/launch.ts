/**
 * Fechas de habilitación (lock de pre-lanzamiento). Módulo SERVER-SAFE
 * (sin "use client") para que los Server Components lean el valor real.
 *
 * Desbloqueo escalonado, 4:00 PM hora Miami (EDT = UTC-4 → 20:00 UTC):
 *   Día 1 → 29 jun · Día 2 → 30 jun · Día 3 → 1 jul · Día 4 → 2 jul
 */
export const DAY_UNLOCK_ISO: Record<number, string> = {
  1: "2026-06-29T20:00:00Z",
  2: "2026-06-30T20:00:00Z",
  3: "2026-07-01T20:00:00Z",
  4: "2026-07-02T20:00:00Z",
};

/** El "dashboard se desbloquea" = arranca el Día 1. */
export const LAUNCH_ISO = DAY_UNLOCK_ISO[1];

/** true si la fecha de desbloqueo del día YA pasó. */
export function isDayDateUnlocked(day: number): boolean {
  const iso = DAY_UNLOCK_ISO[day];
  return !iso || Date.now() >= Date.parse(iso);
}
