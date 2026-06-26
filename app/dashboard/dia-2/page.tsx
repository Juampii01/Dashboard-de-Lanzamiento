import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia2Client } from "./client";
import { VideoCapsules } from "@/components/video-capsules";
import { AdminForceComplete } from "@/components/admin-force-complete";
import { LaunchCountdown } from "@/components/launch-countdown";
import { dayUnlockIso } from "@/lib/launch";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

export default async function Dia2Page() {
  if (DEV_MODE) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const devCompleted = cookieStore.get("dev_completed")?.value ?? "";
    const isDone = devCompleted.split(",").includes("2");
    const isAdmin = true;
    return (
      <div className="space-y-8">
        <VideoCapsules day={2} isAdmin={isAdmin} />
        <Dia2Client userId="dev" isCompleted={isDone} existingExpansion={null} primaryNaics="" companyNiche="" devMode />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [toggle, { data: progress }, { data: profile }, { data: adminUser }] =
    await Promise.all([
      getAdminToggle(supabase, 2),
      supabase.from("day_progress").select("is_unlocked, is_completed").eq("user_id", user.id).eq("day_number", 2).single(),
      supabase.from("company_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("users").select("is_admin").eq("id", user.id).single(),
    ]);

  const isAdmin = adminUser?.is_admin === true;

  // Desbloqueo 100% MANUAL (el admin abre el día tras la clase). El contador
  // apunta a la hora de la clase (7pm Miami) y es solo cosmético.
  const targetIso = dayUnlockIso(toggle?.scheduled_unlock_at, 2);
  const isUnlocked =
    isAdmin || toggle?.is_globally_unlocked === true || progress?.is_unlocked === true;
  const preLocked = !isUnlocked;

  const { data: expansion } = await supabase.from("naics_expansions").select("*").eq("user_id", user.id).maybeSingle();

  return (
    <div className="space-y-8" style={{ position: "relative" }}>
      <div className="flex items-center justify-between"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>← Dashboard</Link><AdminForceComplete day={2} isCompleted={progress?.is_completed ?? false} isAdmin={isAdmin} /></div>
      <VideoCapsules day={2} isAdmin={isAdmin} />
      <Dia2Client
      userId={user.id}
      isCompleted={progress?.is_completed ?? false}
      existingExpansion={expansion}
      primaryNaics={profile?.primary_naics ?? ""}
      companyNiche={profile?.niche ?? ""}
      usState={(profile as { us_state?: string | null } | null)?.us_state ?? ""}
    />
      {preLocked && (
        <LaunchCountdown
          targetIso={targetIso}
          day={2}
          showJoinClass
          title="Día 2 — Mapa de Códigos"
          subtitle="Este día se desbloquea luego de la clase en vivo. El botón para unirte se habilita cuando el contador llegue a 0 (hora de la clase)."
          reachedSubtitle="¡Es la hora de la clase! Unite con el botón de abajo. El día se habilita cuando el equipo lo abra."
        />
      )}
    </div>
  );
}
