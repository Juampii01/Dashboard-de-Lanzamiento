import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia2Client } from "./client";
import { VideoCapsules } from "@/components/video-capsules";
import { AdminForceComplete } from "@/components/admin-force-complete";
import { LaunchCountdown } from "@/components/launch-countdown";
import { OndemandDayLock } from "@/components/ondemand-day-lock";
import { getUserProgram } from "@/lib/program-server";
import { getRecordings, youtubeId } from "@/lib/recordings";
import { OndemandRecording } from "@/components/ondemand-recording";
import { isDayOpenFor } from "@/lib/supabase/day-access";
import { CLASS_LINKS } from "@/lib/class-links";
import { dayUnlockIso } from "@/lib/launch";
import { getActor } from "@/lib/viewer";

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
      <div className="space-y-8 gb-day-wide">
        <VideoCapsules day={2} isAdmin={isAdmin} over10k={false} />
        <Dia2Client userId="dev" isCompleted={isDone} existingExpansion={null} primaryNaics="" companyNiche="" devMode />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const actor = await getActor(user.id);

  const [toggle, { data: progress }, { data: profile }, { data: adminUser }] =
    await Promise.all([
      getAdminToggle(supabase, 2),
      supabase.from("day_progress").select("is_unlocked, is_completed").eq("user_id", actor.userId).eq("day_number", 2).single(),
      supabase.from("company_profiles").select("*").eq("user_id", actor.userId).single(),
      supabase.from("users").select("is_admin, total_points").eq("id", actor.userId).single(),
    ]);

  const isAdmin = adminUser?.is_admin === true;
  const over10k = (adminUser?.total_points ?? 0) >= 10000;

  // Desbloqueo 100% MANUAL (el admin abre el día tras la clase). El contador
  // apunta a la hora de la clase (7pm Miami) y es solo cosmético.
  const targetIso = dayUnlockIso(toggle?.scheduled_unlock_at, 2);
  // En vivo lo abre el admin; en on demand se abre al completar el día anterior.
  const program = await getUserProgram(actor.userId);
  const isUnlocked = isDayOpenFor({
    program,
    isAdmin,
    globallyUnlocked: toggle?.is_globally_unlocked,
    userUnlocked: (progress as { is_unlocked?: boolean } | null)?.is_unlocked,
  });
  const preLocked = !isUnlocked;

  // On demand: la clase grabada del día va embebida arriba del contenido.
  const dayRec = program === "ondemand" ? (await getRecordings("ondemand"))[2] : undefined;
  const dayVideoId = youtubeId(dayRec?.url);
  const dayVideoTitle = dayRec?.title ?? null;

  const { data: expansion } = await supabase.from("naics_expansions").select("*").eq("user_id", actor.userId).maybeSingle();

  return (
    <div className="space-y-8 gb-day-wide" style={{ position: "relative" }}>
      <div className="flex items-center justify-between"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>← Dashboard</Link><AdminForceComplete day={2} isCompleted={progress?.is_completed ?? false} isAdmin={isAdmin} /></div>
      {program === "ondemand" && (
        <OndemandRecording videoId={dayVideoId} title={dayVideoTitle || "Día 2 — Mapa de Códigos"} kicker="Clase grabada · Día 2" />
      )}
      <VideoCapsules day={2} isAdmin={isAdmin} over10k={over10k} />
      <Dia2Client
      userId={actor.userId}
      isCompleted={progress?.is_completed ?? false}
      existingExpansion={expansion}
      primaryNaics={profile?.primary_naics ?? ""}
      companyNiche={profile?.niche ?? ""}
      usState={(profile as { us_state?: string | null } | null)?.us_state ?? ""}
    />
      {preLocked && program === "ondemand" && (
        <OndemandDayLock day={2} title="Día 2 — Mapa de Códigos" />
      )}
      {preLocked && program === "live" && (
        <LaunchCountdown
          targetIso={targetIso}
          day={2}
          over10k={over10k}
          callUrl={CLASS_LINKS[2]}
          title="Día 2 — Mapa de Códigos"
          subtitle="Este día se desbloquea luego de la clase en vivo. Se habilita cuando el equipo lo abra."
          reachedSubtitle="¡Es la hora de la clase! El día se habilita cuando el equipo lo abra."
        />
      )}
    </div>
  );
}
