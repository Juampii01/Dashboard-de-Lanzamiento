import { createClient } from "@/lib/supabase/server";
import { getAllAdminToggles } from "@/lib/supabase/helpers";
import { AdminClient } from "./client";

async function getAdminData() {
  const supabase = await createClient();

  const [toggles, { data: users }, { data: allProgress }, { data: sorteos }] =
    await Promise.all([
      getAllAdminToggles(supabase),
      supabase.from("users").select("id, email, full_name, total_points, access_expires_at").order("created_at", { ascending: false }),
      supabase.from("day_progress").select("user_id, day_number, is_completed, is_unlocked"),
      supabase.from("sorteo_submissions").select("user_id, eligible, submitted_at"),
    ]);

  // last_seen_at en query separada y tolerante (por si la columna aún no existe).
  let seenMap: Record<string, string | null> = {};
  const { data: seenRows } = await supabase.from("users").select("id, last_seen_at");
  if (seenRows) {
    seenMap = Object.fromEntries(
      (seenRows as Array<{ id: string; last_seen_at: string | null }>).map((r) => [r.id, r.last_seen_at])
    );
  }
  const usersWithSeen = (users ?? []).map((u) => ({
    ...(u as Record<string, unknown>),
    last_seen_at: seenMap[(u as { id: string }).id] ?? null,
  }));

  return { toggles, users: usersWithSeen, allProgress, sorteos };
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
