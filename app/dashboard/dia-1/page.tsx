import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia1Client } from "./client";
import { VideoCapsules } from "@/components/video-capsules";
import { AdminForceComplete } from "@/components/admin-force-complete";
import { LaunchCountdown } from "@/components/launch-countdown";
import { getUserProgram } from "@/lib/program-server";
import { getRecordings, youtubeId } from "@/lib/recordings";
import { OndemandRecording } from "@/components/ondemand-recording";
import { isDayOpenFor } from "@/lib/supabase/day-access";
import { CLASS_LINKS } from "@/lib/class-links";
import { dayUnlockIso } from "@/lib/launch";
import Link from "next/link";

async function getDia1Data(userId: string) {
  const supabase = await createClient();

  const [toggle, { data: progress }, { data: profile }] =
    await Promise.all([
      getAdminToggle(supabase, 1),
      supabase
        .from("day_progress")
        .select("is_unlocked, is_completed")
        .eq("user_id", userId)
        .eq("day_number", 1)
        .maybeSingle(),
      supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  return { progress, profile, toggle };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

export default async function Dia1Page() {
  if (DEV_MODE) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const devCompleted = cookieStore.get("dev_completed")?.value ?? "";
    const isDone = devCompleted.split(",").includes("1");
    return (
      <div className="space-y-8 gb-day-wide">
        <Dia1Client userId="dev" isCompleted={isDone} existingProfile={null} devMode missions={<VideoCapsules day={1} over10k={false} />} />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { progress, profile, toggle } = await getDia1Data(user.id);

  const { data: userProfile } = await createServiceClient()
    .from("users").select("is_admin, total_points").eq("id", user.id).maybeSingle();
  const isAdmin = userProfile?.is_admin ?? false;
  const over10k = (userProfile?.total_points ?? 0) >= 10000;

  // Desbloqueo 100% MANUAL: el admin abre el día tras la clase. El contador
  // apunta a la hora de la clase (7pm Miami) y es solo cosmético; el día se VE
  // completo detrás, con el contador como overlay encima (no interactuable).
  const targetIso = dayUnlockIso(toggle?.scheduled_unlock_at, 1);
  // En vivo lo abre el admin; en on demand se abre al completar el día anterior.
  const program = await getUserProgram(user.id);
  const isUnlocked = isDayOpenFor({
    program,
    isAdmin,
    globallyUnlocked: toggle?.is_globally_unlocked,
    userUnlocked: (progress as { is_unlocked?: boolean } | null)?.is_unlocked,
  });
  const preLocked = !isUnlocked;

  // On demand: la clase grabada del día va embebida arriba del contenido.
  const dayRec = program === "ondemand" ? (await getRecordings("ondemand"))[1] : undefined;
  const dayVideoId = youtubeId(dayRec?.url);
  const dayVideoTitle = dayRec?.title ?? null;

  return (
    <div className="space-y-6 gb-day-wide" style={{ position: "relative" }}>
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm transition-colors whitespace-nowrap"
          style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}
        >
          ← Dashboard
        </Link>
        <AdminForceComplete day={1} isCompleted={progress?.is_completed ?? false} isAdmin={isAdmin} />
      </div>
      {program === "ondemand" && (
        <OndemandRecording videoId={dayVideoId} title={dayVideoTitle || "Día 1 — Perfil Estratégico"} kicker="Clase grabada · Día 1" />
      )}
      <Dia1Client
        userId={user.id}
        isCompleted={progress?.is_completed ?? false}
        existingProfile={profile}
        missions={<VideoCapsules day={1} isAdmin={isAdmin} over10k={over10k} />}
      />
      {/* En on demand el Día 1 lo abre la compra (claim_purchase): sin overlay. */}
      {preLocked && program === "live" && (
        <LaunchCountdown
          targetIso={targetIso}
          day={1}
          over10k={over10k}
          callUrl={CLASS_LINKS[1]}
          title="Día 1 — Perfil Estratégico"
          subtitle="Este día se desbloquea luego de la clase en vivo. Se habilita cuando el equipo lo abra."
          reachedSubtitle="¡Es la hora de la clase! El día se habilita cuando el equipo lo abra."
        />
      )}
    </div>
  );
}
