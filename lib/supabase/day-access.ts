import { createServiceClient } from "./server";

/**
 * Checks whether a user has access to a given day.
 *
 * Mirrors the gate used in /api/quiz/submit — three passes in order:
 *   1. User's own day_progress.is_unlocked
 *   2. admin_toggles.is_globally_unlocked for the day
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

  // 2. Global admin toggle
  const { data: toggle } = await service
    .from("admin_toggles")
    .select("is_globally_unlocked")
    .eq("day_number", dayNumber)
    .maybeSingle();

  if ((toggle as { is_globally_unlocked: boolean } | null)?.is_globally_unlocked) return true;

  // 3. User is admin
  const { data: profile } = await service
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return (profile as { is_admin: boolean } | null)?.is_admin === true;
}
