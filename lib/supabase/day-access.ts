import { createServiceClient } from "./server";
import type { Program } from "@/lib/program";

/**
 * ¿El día está abierto para esta persona? (para las páginas de cada día)
 *
 *   en vivo   → lo abre el admin (admin_toggles.is_globally_unlocked)
 *   on demand → se abre al completar el día anterior (day_progress.is_unlocked;
 *               el Día 1 lo abre claim_purchase)
 *   admins    → siempre
 */
export function isDayOpenFor(opts: {
  program: Program;
  isAdmin: boolean;
  globallyUnlocked: boolean | null | undefined;
  userUnlocked: boolean | null | undefined;
}): boolean {
  if (opts.isAdmin) return true;
  if (opts.program === "ondemand") return opts.userUnlocked === true;
  return opts.globallyUnlocked === true;
}

/**
 * Checks whether a user has access to a given day.
 *
 * Mirrors the gate used in /api/quiz/submit — three passes in order:
 *   1. User's own day_progress.is_unlocked
 *   2. admin_toggles.is_globally_unlocked for the day (solo en vivo: en on
 *      demand el admin no abre días, se abren al completar el anterior)
 *   3. users.is_admin
 *
 * Returns true if any of the three conditions holds, false otherwise.
 */
export async function isDayUnlocked(userId: string, dayNumber: number): Promise<boolean> {
  const service = createServiceClient();

  // 1. User's own progress row
  const { data: dayAccess } = await service
    .from("day_progress")
    .select("is_unlocked")
    .eq("user_id", userId)
    .eq("day_number", dayNumber)
    .maybeSingle();

  if ((dayAccess as { is_unlocked: boolean } | null)?.is_unlocked) return true;

  // 3. User is admin (se lee antes del toggle para saber el programa)
  const { data: profile } = await service
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if ((profile as { is_admin: boolean } | null)?.is_admin === true) return true;

  // On demand: el toggle global del en vivo no abre nada. Query aparte y
  // tolerante (si la columna program no existe todavía, se asume en vivo).
  const { data: prog, error: progErr } = await service
    .from("users")
    .select("program")
    .eq("id", userId)
    .maybeSingle();
  if (!progErr && (prog as { program?: string } | null)?.program === "ondemand") return false;

  // 2. Global admin toggle
  const { data: toggle } = await service
    .from("admin_toggles")
    .select("is_globally_unlocked")
    .eq("day_number", dayNumber)
    .maybeSingle();

  return (toggle as { is_globally_unlocked: boolean } | null)?.is_globally_unlocked === true;
}
