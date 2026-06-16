import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia3Client } from "./client";
import { VideoCapsules } from "@/components/video-capsules";
import { AdminForceComplete } from "@/components/admin-force-complete";
import { LaunchCountdown } from "@/components/launch-countdown";
import { dayUnlockIso, isIsoUnlocked } from "@/lib/launch";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

export default async function Dia3Page() {
  if (DEV_MODE) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const devCompleted = cookieStore.get("dev_completed")?.value ?? "";
    const isDone = devCompleted.split(",").includes("3");
    const isAdmin = true;
    return (
      <div className="space-y-8">
        <VideoCapsules day={3} isAdmin={isAdmin} />
        <Dia3Client userId="dev" isCompleted={isDone} existingPreview={null} profile={null} keywordsExpanded={[]} devMode />
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

  // Pre-lanzamiento: se VE el día detrás, con el contador como overlay encima.
  const targetIso = dayUnlockIso(toggle?.scheduled_unlock_at, 3);
  const dateUnlocked = isIsoUnlocked(targetIso);
  const preLocked = !isAdmin && !dateUnlocked;

  const isUnlocked =
    isAdmin ||
    dateUnlocked ||
    (toggle?.is_globally_unlocked === true && prevProgress?.is_completed === true) ||
    progress?.is_unlocked === true;

  if (!preLocked && !isUnlocked) redirect("/dashboard");

  const { data: webPreview } = await supabase.from("web_previews").select("*").eq("user_id", user.id).maybeSingle();

  return (
    <div className="space-y-8" style={{ position: "relative" }}>
      <div className="flex items-center justify-between"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: "#C9D6EC", fontFamily: "var(--font-sans)" }}>← Dashboard</Link><AdminForceComplete day={3} isCompleted={progress?.is_completed ?? false} isAdmin={isAdmin} /></div>
      <VideoCapsules day={3} isAdmin={isAdmin} />
      <Dia3Client
      userId={user.id}
      isCompleted={progress?.is_completed ?? false}
      existingPreview={webPreview}
      profile={profile}
      keywordsExpanded={(expansion?.keywords_expanded as string[]) ?? []}
    />
      {preLocked && (
        <LaunchCountdown targetIso={targetIso} title="Día 3 — Web + Portales" subtitle="Tu presencia profesional y dónde registrarte para conseguir contratos. Se viene." />
      )}
    </div>
  );
}
