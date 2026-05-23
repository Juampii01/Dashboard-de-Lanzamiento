import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia1Client } from "./client";

async function getDia1Data(userId: string) {
  const supabase = await createClient();

  const [toggle, { data: progress }, { data: profile }] =
    await Promise.all([
      getAdminToggle(supabase, 1),
      supabase
        .from("day_progress")
        .select("is_unlocked, is_completed")
        .eq("user_id", userId)
        .eq("day_number", 1)
        .single(),
      supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", userId)
        .single(),
    ]);

  return { progress, profile, toggle };
}

export default async function Dia1Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { progress, profile, toggle } = await getDia1Data(user.id);

  const isUnlocked =
    toggle?.is_globally_unlocked === true || progress?.is_unlocked === true;

  if (!isUnlocked) redirect("/dashboard");

  return (
    <Dia1Client
      userId={user.id}
      isCompleted={progress?.is_completed ?? false}
      existingProfile={profile}
    />
  );
}
