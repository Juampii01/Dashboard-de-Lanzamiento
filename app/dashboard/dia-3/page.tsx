import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia3Client } from "./client";

export default async function Dia3Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [toggle, { data: progress }, { data: prevProgress }, { data: profile }, { data: expansion }] =
    await Promise.all([
      getAdminToggle(supabase, 3),
      supabase.from("day_progress").select("is_unlocked, is_completed").eq("user_id", user.id).eq("day_number", 3).single(),
      supabase.from("day_progress").select("is_completed").eq("user_id", user.id).eq("day_number", 2).single(),
      supabase.from("company_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("naics_expansions").select("keywords_expanded").eq("user_id", user.id).single(),
    ]);

  const isUnlocked =
    (toggle?.is_globally_unlocked === true && prevProgress?.is_completed === true) ||
    progress?.is_unlocked === true;

  if (!isUnlocked) redirect("/dashboard");

  const { data: webPreview } = await supabase.from("web_previews").select("*").eq("user_id", user.id).single();

  return (
    <Dia3Client
      userId={user.id}
      isCompleted={progress?.is_completed ?? false}
      existingPreview={webPreview}
      profile={profile}
      keywordsExpanded={(expansion?.keywords_expanded as string[]) ?? []}
    />
  );
}
