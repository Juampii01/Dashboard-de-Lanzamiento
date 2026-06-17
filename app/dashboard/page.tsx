import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HomeClient } from "./home-client";
import { LaunchCountdown } from "@/components/launch-countdown";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { dayUnlockIso, isIsoUnlocked } from "@/lib/launch";

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

  // Contador de lanzamiento dentro del Inicio (solo usuarios, antes del Día 1).
  // La fecha/hora la configura el admin (admin_toggles.scheduled_unlock_at del Día 1).
  let launchIso = dayUnlockIso(null, 1);
  if (!devMode) {
    const toggle1 = await getAdminToggle(createServiceClient(), 1);
    launchIso = dayUnlockIso(toggle1?.scheduled_unlock_at, 1);
  }
  const beforeLaunch = !devMode && !isAdmin && !isIsoUnlocked(launchIso);

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
          title="El dashboard se habilita el día del lanzamiento"
          subtitle="Todavía no se puede usar: se desbloquea cuando arranque el challenge. Mientras tanto podés recorrerlo y ver todo lo que se viene."
        />
      )}
    </div>
  );
}
