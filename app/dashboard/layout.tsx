import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProgressBar } from "@/components/progress-bar";
import { ParticleBackground } from "@/components/particle-background";
import { BootSequence } from "@/components/boot-sequence";
import { CountdownTimer } from "@/components/countdown-timer";
import { UnlockEventListener } from "@/components/unlock-event-listener";
import { daysLeft, isExpired } from "@/lib/utils";
import { LogOut, Shield } from "lucide-react";
import Link from "next/link";

function getXpLevel(pts: number) {
  if (pts >= 500) return { name: "Gov Pro", emoji: "🏆", min: 500, max: Infinity };
  if (pts >= 250) return { name: "Licitador", emoji: "🏛️", min: 250, max: 500 };
  if (pts >= 100) return { name: "Contratista", emoji: "⚡", min: 100, max: 250 };
  return { name: "Rookie", emoji: "🔰", min: 0, max: 100 };
}

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

  if (devMode) {
    const cookieStore = await cookies();
    const devCompleted = cookieStore.get("dev_completed")?.value ?? "";
    completedDays = devCompleted.split(",").filter(Boolean).length;
  } else {
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
      {/* Global overlays & ambient effects */}
      <ParticleBackground />
      <BootSequence />
      <UnlockEventListener />
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

            {/* Right: countdown + admin + xp + user + logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Countdown to next unlock */}
              <div className="hidden md:block">
                <CountdownTimer />
              </div>

              {profile?.is_admin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 text-xs text-[#D7263D] hover:text-[#ff4d6d] transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}

              {/* XP level + points */}
              {(() => {
                const pts = profile?.total_points ?? 0;
                const lvl = getXpLevel(pts);
                const pct = lvl.max === Infinity ? 100 : Math.round(((pts - lvl.min) / (lvl.max - lvl.min)) * 100);
                return (
                  <div className="hidden sm:flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">{lvl.emoji}</span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: "#FFD60A", fontFamily: "var(--font-arcade)" }}
                      >
                        {lvl.name}
                      </span>
                    </div>
                    {/* Mini XP bar */}
                    <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "#1E3A5C" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: "#FFD60A" }}
                      />
                    </div>
                    <span
                      className="text-[9px] tabular-nums"
                      style={{ color: "#5A6B85", fontFamily: "var(--font-mono)" }}
                    >
                      {pts} pts
                    </span>
                  </div>
                );
              })()}

              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-white truncate max-w-[120px]">
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
        className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 relative z-10"
        style={{ background: "#0A2540" }}
      >
        {children}
      </main>
    </div>
  );
}
