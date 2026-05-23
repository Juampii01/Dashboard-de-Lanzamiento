import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia4Client } from "./client";

export default async function Dia4Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [toggle, { data: progress }, { data: prevProgress }, { data: profile }, { data: expansion }] =
    await Promise.all([
      getAdminToggle(supabase, 4),
      supabase.from("day_progress").select("is_unlocked, is_completed").eq("user_id", user.id).eq("day_number", 4).single(),
      supabase.from("day_progress").select("is_completed").eq("user_id", user.id).eq("day_number", 3).single(),
      supabase.from("company_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("naics_expansions").select("*").eq("user_id", user.id).single(),
    ]);

  const isUnlocked =
    (toggle?.is_globally_unlocked === true && prevProgress?.is_completed === true) ||
    progress?.is_unlocked === true;

  if (!isUnlocked) redirect("/dashboard");

  const [{ data: capabilityStatement }, { data: sorteoSubmission }, { data: userProfile }] =
    await Promise.all([
      supabase.from("capability_statements").select("*").eq("user_id", user.id).single(),
      supabase.from("sorteo_submissions").select("*").eq("user_id", user.id).single(),
      supabase.from("users").select("full_name, access_expires_at").eq("id", user.id).single(),
    ]);

  return (
    <Dia4Client
      userId={user.id}
      isCompleted={progress?.is_completed ?? false}
      existingStatement={capabilityStatement}
      existingSorteo={sorteoSubmission}
      profile={profile}
      expansion={expansion}
      fullName={userProfile?.full_name ?? user.email ?? ""}
      accessExpiresAt={userProfile?.access_expires_at ?? null}
    />
  );
}
