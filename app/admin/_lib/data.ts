import { createClient } from "@/lib/supabase/server";
import { getAllAdminToggles } from "@/lib/supabase/helpers";
import type { AdminToggle, AdminUser, Progress, Sorteo } from "./types";

// Supabase/PostgREST corta cada respuesta en 1.000 filas por defecto. day_progress
// ya supera eso (usuarios × 4 días), así que sin paginar se pierden filas al azar
// (por eso a varios usuarios no les marcaba el check de día completado ni las
// tarjetas "Completaron Día N" contaban bien). Este helper trae TODAS las filas.
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error || !data) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export async function getUsersAndProgress() {
  const supabase = await createClient();

  const [users, allProgress, { data: sorteos }] = await Promise.all([
    fetchAllRows<AdminUser>((from, to) =>
      supabase
        .from("users")
        .select("id, email, full_name, total_points, access_expires_at, last_seen_at, is_admin, is_student")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    fetchAllRows<Progress>((from, to) =>
      supabase
        .from("day_progress")
        .select("user_id, day_number, is_completed, is_unlocked")
        .order("user_id")
        .range(from, to)
    ),
    supabase.from("sorteo_submissions").select("user_id, eligible, submitted_at"),
  ]);

  return { users, allProgress, sorteos: (sorteos ?? []) as Sorteo[] };
}

export async function getToggles(): Promise<AdminToggle[]> {
  const supabase = await createClient();
  return (await getAllAdminToggles(supabase)) as AdminToggle[];
}
