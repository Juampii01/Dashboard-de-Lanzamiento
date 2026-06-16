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

/**
 * Fecha/hora efectiva de desbloqueo de un día. Prioriza lo configurado por el
 * admin en `admin_toggles.scheduled_unlock_at`; si no hay nada, cae al default.
 * Se guarda y compara en UTC (ISO); cada cliente lo muestra en su hora local.
 */
export function dayUnlockIso(
  scheduledUnlockAt: string | null | undefined,
  day: number
): string {
  return scheduledUnlockAt ?? DAY_UNLOCK_ISO[day] ?? "";
}

/** true si la fecha ISO ya pasó (o si no hay fecha → siempre desbloqueado). */
export function isIsoUnlocked(iso: string): boolean {
  return !iso || Date.now() >= Date.parse(iso);
}

/** true si la fecha de desbloqueo del día YA pasó (usa defaults hardcodeados). */
export function isDayDateUnlocked(day: number): boolean {
  return isIsoUnlocked(DAY_UNLOCK_ISO[day] ?? "");
}
