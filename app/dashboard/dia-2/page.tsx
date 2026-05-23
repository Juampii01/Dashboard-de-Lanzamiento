import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia2Client } from "./client";

export default async function Dia2Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [toggle, { data: progress }, { data: profile }, { data: prevProgress }] =
    await Promise.all([
      getAdminToggle(supabase, 2),
      supabase.from("day_progress").select("is_unlocked, is_completed").eq("user_id", user.id).eq("day_number", 2).single(),
      supabase.from("company_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("day_progress").select("is_completed").eq("user_id", user.id).eq("day_number", 1).single(),
    ]);

  const globallyUnlocked = toggle?.is_globally_unlocked === true;
  const prevCompleted = prevProgress?.is_completed === true;
  const userUnlocked = progress?.is_unlocked === true;
  const isUnlocked = (globallyUnlocked && prevCompleted) || userUnlocked;

  if (!isUnlocked) redirect("/dashboard");

  const { data: expansion } = await supabase.from("naics_expansions").select("*").eq("user_id", user.id).single();

  return (
    <Dia2Client
      userId={user.id}
      isCompleted={progress?.is_completed ?? false}
      existingExpansion={expansion}
      primaryNaics={profile?.primary_naics ?? ""}
      companyNiche={profile?.niche ?? ""}
    />
  );
}
