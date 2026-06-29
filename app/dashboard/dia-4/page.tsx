import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia4Client } from "./client";
import { VideoCapsules } from "@/components/video-capsules";
import { AdminForceComplete } from "@/components/admin-force-complete";
import { LaunchCountdown } from "@/components/launch-countdown";
import { dayUnlockIso } from "@/lib/launch";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

export default async function Dia4Page() {
  if (DEV_MODE) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const devCompleted = cookieStore.get("dev_completed")?.value ?? "";
    const isDone = devCompleted.split(",").includes("4");
    const isAdmin = true;
    return (
      <div className="space-y-8">
        <VideoCapsules day={4} isAdmin={isAdmin} />
        <Dia4Client userId="dev" isCompleted={isDone} existingStatement={null} existingSorteo={null} profile={null} expansion={null} fullName="Dev Preview" accessExpiresAt={null} devMode />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [toggle, { data: progress }, { data: profile }, { data: expansion }, { data: adminUser }] =
    await Promise.all([
      getAdminToggle(supabase, 4),
      supabase.from("day_progress").select("is_unlocked, is_completed").eq("user_id", user.id).eq("day_number", 4).single(),
      supabase.from("company_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("naics_expansions").select("*").eq("user_id", user.id).single(),
      supabase.from("users").select("is_admin").eq("id", user.id).single(),
    ]);

  const isAdmin = adminUser?.is_admin === true;

  // Desbloqueo 100% MANUAL (el admin abre el día tras la clase). El contador
  // apunta a la hora de la clase (7pm Miami) y es solo cosmético.
  const targetIso = dayUnlockIso(toggle?.scheduled_unlock_at, 4);
  const isUnlocked = isAdmin || toggle?.is_globally_unlocked === true;
  const preLocked = !isUnlocked;

  const [{ data: capabilityStatement }, { data: sorteoSubmission }, { data: userProfile }] =
    await Promise.all([
      supabase.from("capability_statements").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("sorteo_submissions").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("users").select("full_name, access_expires_at").eq("id", user.id).maybeSingle(),
    ]);

  return (
    <div className="space-y-8" style={{ position: "relative" }}>
      <div className="flex items-center justify-between"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>← Dashboard</Link><AdminForceComplete day={4} isCompleted={progress?.is_completed ?? false} isAdmin={isAdmin} /></div>
      <VideoCapsules day={4} isAdmin={isAdmin} />
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
      {preLocked && (
        <LaunchCountdown
          targetIso={targetIso}
          day={4}
          title="Día 4 — Capability Statement"
          subtitle="Este día se desbloquea luego de la clase en vivo. Se habilita cuando el equipo lo abra."
          reachedSubtitle="¡Es la hora de la clase! El día se habilita cuando el equipo lo abra."
        />
      )}
    </div>
  );
}
