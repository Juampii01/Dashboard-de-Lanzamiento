import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia3Client } from "./client";
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

export default async function Dia3Page() {
  if (DEV_MODE) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const devCompleted = cookieStore.get("dev_completed")?.value ?? "";
    const isDone = devCompleted.split(",").includes("3");
    const isAdmin = true;
    return (
      <div className="space-y-8 gb-day-wide">
        <VideoCapsules day={3} isAdmin={isAdmin} over10k={false} />
        <Dia3Client userId="dev" isCompleted={isDone} existingPreview={null} profile={null} keywordsExpanded={[]} devMode />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const actor = await getActor(user.id);

  const [toggle, { data: progress }, { data: profile }, { data: expansion }, { data: adminUser }] =
    await Promise.all([
      getAdminToggle(supabase, 3),
      supabase.from("day_progress").select("is_unlocked, is_completed").eq("user_id", actor.userId).eq("day_number", 3).single(),
      supabase.from("company_profiles").select("*").eq("user_id", actor.userId).single(),
      supabase.from("naics_expansions").select("keywords_expanded").eq("user_id", actor.userId).single(),
      supabase.from("users").select("is_admin, total_points").eq("id", actor.userId).single(),
    ]);

  const isAdmin = adminUser?.is_admin === true;
  const over10k = (adminUser?.total_points ?? 0) >= 10000;

  // Desbloqueo 100% MANUAL (el admin abre el día tras la clase). El contador
  // apunta a la hora de la clase (7pm Miami) y es solo cosmético.
  const targetIso = dayUnlockIso(toggle?.scheduled_unlock_at, 3);
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
  const dayRec = program === "ondemand" ? (await getRecordings("ondemand"))[3] : undefined;
  const dayVideoId = youtubeId(dayRec?.url);
  const dayVideoTitle = dayRec?.title ?? null;

  const { data: webPreview } = await supabase.from("web_previews").select("*").eq("user_id", actor.userId).maybeSingle();

  return (
    <div className="space-y-8 gb-day-wide" style={{ position: "relative" }}>
      <div className="flex items-center justify-between"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>← Dashboard</Link><AdminForceComplete day={3} isCompleted={progress?.is_completed ?? false} isAdmin={isAdmin} /></div>
      {program === "ondemand" && (
        <OndemandRecording videoId={dayVideoId} title={dayVideoTitle || "Día 3 — Web + Portales"} kicker="Clase grabada · Día 3" />
      )}
      <VideoCapsules day={3} isAdmin={isAdmin} over10k={over10k} />
      <Dia3Client
      userId={actor.userId}
      isCompleted={progress?.is_completed ?? false}
      existingPreview={webPreview}
      profile={profile}
      keywordsExpanded={(expansion?.keywords_expanded as string[]) ?? []}
    />
      {preLocked && program === "ondemand" && (
        <OndemandDayLock day={3} title="Día 3 — Web + Portales" />
      )}
      {preLocked && program === "live" && (
        <LaunchCountdown
          targetIso={targetIso}
          day={3}
          over10k={over10k}
          callUrl={CLASS_LINKS[3]}
          title="Día 3 — Web + Portales"
          subtitle="Este día se desbloquea luego de la clase en vivo. Se habilita cuando el equipo lo abra."
          reachedSubtitle="¡Es la hora de la clase! El día se habilita cuando el equipo lo abra."
        />
      )}
    </div>
  );
}
