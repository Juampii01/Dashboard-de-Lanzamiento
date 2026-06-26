/**
 * Fechas de los CONTADORES (cosméticos) del pre-lanzamiento. Módulo SERVER-SAFE
 * (sin "use client") para que los Server Components lean el valor real.
 *
 * IMPORTANTE: el desbloqueo real es 100% MANUAL (el admin abre cada día/Inicio
 * desde el panel — `admin_toggles.is_globally_unlocked`). Estas fechas SOLO
 * alimentan el contador que ve el usuario; al llegar a 0 el contenido sigue
 * bloqueado hasta que el equipo lo abra.
 *
 * Clases a las 7:00 PM hora Miami (EDT = UTC-4 → 23:00 UTC):
 *   Día 1 → 29 jun · Día 2 → 30 jun · Día 3 → 1 jul · Día 4 → 2 jul
 */
export const DAY_UNLOCK_ISO: Record<number, string> = {
  1: "2026-06-29T23:00:00Z",
  2: "2026-06-30T23:00:00Z",
  3: "2026-07-01T23:00:00Z",
  4: "2026-07-02T23:00:00Z",
};

/** Contador del Inicio (dashboard): medianoche del 29/06 en hora Miami (EDT = 04:00 UTC). */
export const INICIO_UNLOCK_ISO = "2026-06-29T04:00:00Z";

/** El "dashboard se desbloquea" = arranca el challenge (Inicio). */
export const LAUNCH_ISO = INICIO_UNLOCK_ISO;

/**
 * Fecha/hora del contador de un día. Prioriza lo configurado por el admin en
 * `admin_toggles.scheduled_unlock_at`; si no hay nada, cae al default (7pm Miami).
 * Se guarda y compara en UTC (ISO); cada cliente lo muestra en su hora local.
 */
export function dayUnlockIso(
  scheduledUnlockAt: string | null | undefined,
  day: number
): string {
  return scheduledUnlockAt ?? DAY_UNLOCK_ISO[day] ?? "";
}

/** Fecha/hora del contador del Inicio (day 0). */
export function inicioUnlockIso(scheduledUnlockAt: string | null | undefined): string {
  return scheduledUnlockAt ?? INICIO_UNLOCK_ISO;
}

/** true si la fecha ISO ya pasó (o si no hay fecha → siempre desbloqueado). */
export function isIsoUnlocked(iso: string): boolean {
  return !iso || Date.now() >= Date.parse(iso);
}

/** true si la fecha del contador del día YA pasó (usa defaults hardcodeados). */
export function isDayDateUnlocked(day: number): boolean {
  return isIsoUnlocked(DAY_UNLOCK_ISO[day] ?? "");
}
