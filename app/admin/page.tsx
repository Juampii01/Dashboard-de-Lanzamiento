import { createClient } from "@/lib/supabase/server";
import { getAllAdminToggles } from "@/lib/supabase/helpers";
import { AdminClient } from "./client";

// Supabase/PostgREST corta cada respuesta en 1.000 filas por defecto. day_progress
// ya supera eso (usuarios × 4 días), así que sin paginar se pierden filas al azar
// (por eso a varios usuarios no les marcaba el check de día completado ni las
// tarjetas "Completaron Día N" contaban bien). Este helper trae TODAS las filas.
async function fetchAllRows<T>(
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

async function getAdminData() {
  const supabase = await createClient();

  const [toggles, users, allProgress, { data: sorteos }] = await Promise.all([
    getAllAdminToggles(supabase),
    fetchAllRows((from, to) =>
      supabase
        .from("users")
        .select("id, email, full_name, total_points, access_expires_at, last_seen_at")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("day_progress")
        .select("user_id, day_number, is_completed, is_unlocked")
        .order("user_id")
        .range(from, to)
    ),
    supabase.from("sorteo_submissions").select("user_id, eligible, submitted_at"),
  ]);

  return { toggles, users, allProgress, sorteos };
}

export default async function AdminPage() {
  const { toggles, users, allProgress, sorteos } = await getAdminData();

  return (
    <AdminClient
      initialToggles={toggles}
      users={users ?? []}
      allProgress={allProgress ?? []}
      sorteos={sorteos ?? []}
    />
  );
}
