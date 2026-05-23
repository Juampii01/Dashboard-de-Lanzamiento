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
