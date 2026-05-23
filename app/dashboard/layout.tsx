import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProgressBar } from "@/components/progress-bar";
import { daysLeft, isExpired } from "@/lib/utils";
import { LogOut, Shield } from "lucide-react";
import Link from "next/link";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
function isSupabaseConfigured() {
  return (
    SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder")
  );
}

const DEV_PROFILE = {
  full_name: "Dev Preview",
  access_expires_at: null,
  is_admin: true,
  total_points: 0,
};

async function getLayoutData(userId: string) {
  const supabase = await createClient();

  const [{ data: user }, { data: progress }] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, access_expires_at, is_admin, total_points")
      .eq("id", userId)
      .single(),
    supabase
      .from("day_progress")
      .select("day_number, is_completed")
      .eq("user_id", userId),
  ]);

  const completedDays = progress?.filter((p) => p.is_completed).length ?? 0;

  return { user, completedDays };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const devMode = !isSupabaseConfigured();

  let profile: typeof DEV_PROFILE | null = devMode ? DEV_PROFILE : null;
  let completedDays = 0;

  if (!devMode) {
    const supabase = await createClient();
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Red inaccesible — tratar como no autenticado
    }

    if (!user) redirect("/login");

    const layoutData = await getLayoutData(user.id);
    profile = layoutData.user ?? DEV_PROFILE;
    completedDays = layoutData.completedDays;
  }

  if (profile && isExpired(profile.access_expires_at)) {
    redirect("/dashboard/expirado");
  }

  const remaining = daysLeft(profile?.access_expires_at ?? null);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header superior con barra de progreso */}
      <header className="bg-primary text-primary-foreground px-4 py-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto">
          {/* Fila superior: logo + nombre + acciones */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-bold text-accent-foreground text-sm">
                G
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Govbidder</p>
                <p className="text-primary-foreground/60 text-xs">Code Challenge</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {profile?.is_admin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium truncate max-w-[140px]">
                  {profile?.full_name ?? "Usuario"}
                </p>
                {profile?.total_points ? (
                  <p className="text-xs text-accent">{profile.total_points} pts</p>
                ) : null}
              </div>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Barra de progreso */}
          <ProgressBar completedDays={completedDays} />
        </div>
      </header>

      {/* Banner de días restantes */}
      {remaining <= 3 && remaining > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <p className="text-amber-800 text-sm font-medium">
            ⏳ Te quedan <strong>{remaining} día{remaining !== 1 ? "s" : ""}</strong> de acceso al dashboard.
          </p>
        </div>
      )}

      {/* Contenido principal */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
}
