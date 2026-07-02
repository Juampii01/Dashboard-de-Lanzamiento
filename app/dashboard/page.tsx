import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HomeClient } from "./home-client";
import { LaunchCountdown } from "@/components/launch-countdown";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { inicioUnlockIso } from "@/lib/launch";
import { getNextIncompleteDay, type DayNudge } from "@/lib/day-nudge";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
function isSupabaseConfigured() {
  return (
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("placeholder")
  );
}

export default async function DashboardPage() {
  const devMode = !isSupabaseConfigured();

  let initialPoints = 0;
  let fullName = "Usuario";
  let avatarUrl: string | null = null;
  let isAdmin = false;
  const recordings: (string | null)[] = [null, null, null, null];
  let tutorialVideoId = "2A6EB_cDk-A"; // default; el admin lo puede cambiar
  let nextDayNudge: DayNudge = null;

  if (devMode) {
    // Dev mode — use cookie-based completed days, no real auth
    await cookies(); // satisfy dynamic rendering
    fullName = "Dev Preview";
    initialPoints = 0;
  } else {
    const supabase = await createClient();
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Network unreachable
    }
    if (!user) redirect("/login");

    const { data: profile } = await createServiceClient()
      .from("users")
      .select("full_name, total_points, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    fullName = profile?.full_name ?? "Usuario";
    initialPoints = (profile?.total_points as number | null) ?? 0;
    avatarUrl = (profile as { avatar_url?: string | null })?.avatar_url ?? null;
    isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin === true;

    // Aviso no bloqueante de Inicio: próximo día ya abierto que todavía no completó.
    nextDayNudge = await getNextIncompleteDay(createServiceClient(), user.id, isAdmin);

    // Grabaciones de las clases (1-4) que el admin configura. Cada botón abre su
    // link de YouTube; si un número no tiene link, su botón queda deshabilitado.
    const { data: recs } = await createServiceClient()
      .from("class_recordings")
      .select("recording_number, youtube_url");
    for (const r of (recs ?? []) as { recording_number: number; youtube_url: string | null }[]) {
      if (r.recording_number >= 1 && r.recording_number <= 4) {
        recordings[r.recording_number - 1] = r.youtube_url ?? null;
      }
    }

    // Video del tutorial (editable desde /admin). Si existe la fila, usamos su
    // valor (vacío = "coming soon"); si no existe la tabla/fila aún, queda el default.
    const { data: tut } = await createServiceClient()
      .from("app_settings")
      .select("value")
      .eq("key", "tutorial_youtube")
      .maybeSingle();
    if (tut && typeof (tut as { value?: string | null }).value === "string") {
      tutorialVideoId = (tut as { value: string }).value;
    }
  }

  // Contador de Inicio (day 0). El desbloqueo es MANUAL (el admin abre el Inicio
  // desde el panel). La fecha del contador es solo cosmética (29/06 00:00 Miami).
  let launchIso = inicioUnlockIso(null);
  let inicioLocked = false;
  if (!devMode) {
    const inicioToggle = await getAdminToggle(createServiceClient(), 0);
    launchIso = inicioUnlockIso(inicioToggle?.scheduled_unlock_at);
    // Solo bloquea si existe la fila de Inicio y NO está abierta (tolera ausencia).
    inicioLocked = !!inicioToggle && inicioToggle.is_globally_unlocked !== true;
  }
  const beforeLaunch = !devMode && !isAdmin && inicioLocked;

  return (
    <div className="space-y-8" style={{ position: "relative" }}>
      <HomeClient
        initialPoints={initialPoints}
        fullName={fullName}
        devMode={devMode}
        avatarUrl={avatarUrl}
        recordings={recordings}
        tutorialVideoId={tutorialVideoId}
        nextDayNudge={nextDayNudge}
      />
      {beforeLaunch && (
        <LaunchCountdown
          targetIso={launchIso}
          day={0}
          title="El dashboard se habilita el día del lanzamiento"
          subtitle="Todavía no arrancó el challenge. Mientras tanto puedes recorrerlo y ver todo lo que se viene; se abre el día del lanzamiento."
          reachedSubtitle="Ya casi arranca. El dashboard se habilita apenas el equipo abra el challenge."
        />
      )}
    </div>
  );
}
