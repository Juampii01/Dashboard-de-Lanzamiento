import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HomeClient } from "./home-client";
import { LaunchCountdown } from "@/components/launch-countdown";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { inicioUnlockIso } from "@/lib/launch";

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
      />
      {beforeLaunch && (
        <LaunchCountdown
          targetIso={launchIso}
          day={0}
          title="El dashboard se habilita el día del lanzamiento"
          subtitle="Todavía no arrancó el challenge. Mientras tanto podés recorrerlo y ver todo lo que se viene; se abre el día del lanzamiento."
          reachedSubtitle="Ya casi arranca. El dashboard se habilita apenas el equipo abra el challenge."
        />
      )}
    </div>
  );
}
