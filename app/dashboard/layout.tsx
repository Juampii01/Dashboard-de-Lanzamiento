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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const devMode = !isSupabaseConfigured() || appUrl.includes("localhost");

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
    <div className="min-h-screen flex flex-col" style={{ background: "#0A2540" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-4 shadow-xl"
        style={{
          background: "linear-gradient(180deg, #0A2540 0%, #143A6B 100%)",
          borderBottom: "1px solid #1E3A5C",
        }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            {/* Logo + brand */}
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                style={{
                  background: "#D7263D",
                  boxShadow: "0 2px 12px rgba(215,38,61,0.4)",
                  fontFamily: "var(--font-display)",
                }}
              >
                G
              </div>
              <div>
                <p
                  className="font-bold text-sm leading-tight text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Govbidder
                </p>
                <p className="text-[11px] text-[#A8B5CC] tracking-wide">
                  Code Challenge
                </p>
              </div>
            </div>

            {/* Right: admin + points + user + logout */}
            <div className="flex items-center gap-3">
              {profile?.is_admin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 text-xs text-[#D7263D] hover:text-[#ff4d6d] transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}

              {/* Points capsule */}
              {(profile?.total_points ?? 0) > 0 && (
                <div
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: "#FFD60A",
                    color: "#0A2540",
                    fontFamily: "var(--font-mono)",
                    boxShadow: "0 2px 8px rgba(255,214,10,0.3)",
                  }}
                >
                  ⭐ {profile?.total_points} pts
                </div>
              )}

              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-white truncate max-w-[140px]">
                  {profile?.full_name ?? "Usuario"}
                </p>
              </div>

              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="p-2 rounded-lg text-[#A8B5CC] hover:text-white hover:bg-white/10 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Progress bar */}
          <ProgressBar completedDays={completedDays} />
        </div>
      </header>

      {/* Expiry banner */}
      {remaining <= 3 && remaining > 0 && (
        <div
          className="px-4 py-2 text-center text-sm font-medium"
          style={{ background: "#A11D2E", color: "#FFFFFF" }}
        >
          ⏳ Te quedan <strong>{remaining} día{remaining !== 1 ? "s" : ""}</strong> de acceso.
        </div>
      )}

      {/* Main content */}
      <main
        className="flex-1 max-w-5xl mx-auto w-full px-4 py-8"
        style={{ background: "#0A2540" }}
      >
        {children}
      </main>
    </div>
  );
}
