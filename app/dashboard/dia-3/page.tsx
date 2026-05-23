import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia3Client } from "./client";
import { VideoCapsules } from "@/components/video-capsules";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

export default async function Dia3Page() {
  if (DEV_MODE) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const devCompleted = cookieStore.get("dev_completed")?.value ?? "";
    const isDone = devCompleted.split(",").includes("3");
    return (
      <div className="space-y-8">
        <Dia3Client userId="dev" isCompleted={isDone} existingPreview={null} profile={null} keywordsExpanded={[]} devMode />
        <VideoCapsules day={3} />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [toggle, { data: progress }, { data: prevProgress }, { data: profile }, { data: expansion }, { data: adminUser }] =
    await Promise.all([
      getAdminToggle(supabase, 3),
      supabase.from("day_progress").select("is_unlocked, is_completed").eq("user_id", user.id).eq("day_number", 3).single(),
      supabase.from("day_progress").select("is_completed").eq("user_id", user.id).eq("day_number", 2).single(),
      supabase.from("company_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("naics_expansions").select("keywords_expanded").eq("user_id", user.id).single(),
      supabase.from("users").select("is_admin").eq("id", user.id).single(),
    ]);

  const isAdmin = adminUser?.is_admin === true;
  const isUnlocked =
    isAdmin ||
    (toggle?.is_globally_unlocked === true && prevProgress?.is_completed === true) ||
    progress?.is_unlocked === true;

  if (!isUnlocked) redirect("/dashboard");

  const { data: webPreview } = await supabase.from("web_previews").select("*").eq("user_id", user.id).single();

  return (
    <div className="space-y-8">
      <Dia3Client
      userId={user.id}
      isCompleted={progress?.is_completed ?? false}
      existingPreview={webPreview}
      profile={profile}
      keywordsExpanded={(expansion?.keywords_expanded as string[]) ?? []}
    />
      <VideoCapsules day={3} />
    </div>
  );
}
