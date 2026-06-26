import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia1Client } from "./client";
import { VideoCapsules } from "@/components/video-capsules";
import { AdminForceComplete } from "@/components/admin-force-complete";
import { LaunchCountdown } from "@/components/launch-countdown";
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
      <div className="space-y-8">
        <VideoCapsules day={1} />
        <Dia1Client userId="dev" isCompleted={isDone} existingProfile={null} devMode />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { progress, profile, toggle } = await getDia1Data(user.id);

  const { data: userProfile } = await createServiceClient()
    .from("users").select("is_admin").eq("id", user.id).maybeSingle();
  const isAdmin = userProfile?.is_admin ?? false;

  // Desbloqueo 100% MANUAL: el admin abre el día tras la clase. El contador
  // apunta a la hora de la clase (7pm Miami) y es solo cosmético; el día se VE
  // completo detrás, con el contador como overlay encima (no interactuable).
  const targetIso = dayUnlockIso(toggle?.scheduled_unlock_at, 1);
  const isUnlocked = isAdmin || toggle?.is_globally_unlocked === true;
  const preLocked = !isUnlocked;

  return (
    <div className="space-y-8" style={{ position: "relative" }}>
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}
        >
          ← Dashboard
        </Link>
        <AdminForceComplete day={1} isCompleted={progress?.is_completed ?? false} isAdmin={isAdmin} />
      </div>
      <VideoCapsules day={1} isAdmin={isAdmin} />
      <Dia1Client
        userId={user.id}
        isCompleted={progress?.is_completed ?? false}
        existingProfile={profile}
      />
      {preLocked && (
        <LaunchCountdown
          targetIso={targetIso}
          day={1}
          showJoinClass
          title="Día 1 — Perfil Estratégico"
          subtitle="Este día se desbloquea luego de la clase en vivo. El botón para unirte se habilita cuando el contador llegue a 0 (hora de la clase)."
          reachedSubtitle="¡Es la hora de la clase! Unite con el botón de abajo. El día se habilita cuando el equipo lo abra."
        />
      )}
    </div>
  );
}
