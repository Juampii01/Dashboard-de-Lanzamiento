import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia2Client } from "./client";
import { VideoCapsules } from "@/components/video-capsules";
import { AdminForceComplete } from "@/components/admin-force-complete";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

export default async function Dia2Page() {
  if (DEV_MODE) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const devCompleted = cookieStore.get("dev_completed")?.value ?? "";
    const isDone = devCompleted.split(",").includes("2");
    return (
      <div className="space-y-8">
        <Dia2Client userId="dev" isCompleted={isDone} existingExpansion={null} primaryNaics="" companyNiche="" devMode />
        <VideoCapsules day={2} isAdmin={isAdmin} />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [toggle, { data: progress }, { data: profile }, { data: prevProgress }, { data: adminUser }] =
    await Promise.all([
      getAdminToggle(supabase, 2),
      supabase.from("day_progress").select("is_unlocked, is_completed").eq("user_id", user.id).eq("day_number", 2).single(),
      supabase.from("company_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("day_progress").select("is_completed").eq("user_id", user.id).eq("day_number", 1).single(),
      supabase.from("users").select("is_admin").eq("id", user.id).single(),
    ]);

  const isAdmin = adminUser?.is_admin === true;
  const globallyUnlocked = toggle?.is_globally_unlocked === true;
  const prevCompleted = prevProgress?.is_completed === true;
  const userUnlocked = progress?.is_unlocked === true;
  const isUnlocked = isAdmin || (globallyUnlocked && prevCompleted) || userUnlocked;

  if (!isUnlocked) redirect("/dashboard");

  const { data: expansion } = await supabase.from("naics_expansions").select("*").eq("user_id", user.id).single();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}>← Dashboard</Link><AdminForceComplete day={2} isCompleted={progress?.is_completed ?? false} isAdmin={isAdmin} /></div>
      <Dia2Client
      userId={user.id}
      isCompleted={progress?.is_completed ?? false}
      existingExpansion={expansion}
      primaryNaics={profile?.primary_naics ?? ""}
      companyNiche={profile?.niche ?? ""}
    />
      <VideoCapsules day={2} isAdmin={isAdmin} />
    </div>
  );
}
