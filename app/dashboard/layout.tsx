import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProgressBar } from "@/components/progress-bar";
import { ParticleBackground } from "@/components/particle-background";
import { BootSequence } from "@/components/boot-sequence";
import { CountdownTimer } from "@/components/countdown-timer";
import { UnlockEventListener } from "@/components/unlock-event-listener";
import { PointsHUD } from "@/components/points-hud";
import { ArcadeAmbient } from "@/components/arcade-ambient";
import { XpEngine } from "@/components/xp-engine";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { daysLeft, isExpired } from "@/lib/utils";
import { LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { ResetTutorialButton } from "@/components/reset-tutorial-button";
import { ResetDashboardButton } from "@/components/reset-dashboard-button";
import { DashboardLockOverlay } from "@/components/dashboard-lock-overlay";
import { ComboBar } from "@/components/combo-bar";
import { AdButton } from "@/components/ad-button";
import { ProfileButton } from "@/components/profile-button";


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
  has_seen_onboarding: true, // always skip onboarding in dev mode
  hotmart_transaction_id: "dev-mode" as string | null,
};

// Safe fallback for authenticated users whose DB profile doesn't exist yet
// (e.g. webhook race condition). NEVER admin, NEVER expires, NO purchase.
// hotmart_transaction_id: null → will be caught by paywall gate below.
const SAFE_EMPTY_PROFILE = {
  full_name: "Usuario",
  access_expires_at: null,
  is_admin: false,
  total_points: 0,
  has_seen_onboarding: false,
  hotmart_transaction_id: null as string | null,
};

async function getLayoutData(userId: string) {
  // Use service client so RLS never blocks reading the user's own profile/progress
  const supabase = createServiceClient();

  const [{ data: user }, { data: progress }] = await Promise.all([
    supabase
      .from("users")
      // hotmart_transaction_id included so the paywall gate below can verify
      // that this user has a real Hotmart purchase on record.
      .select("full_name, access_expires_at, is_admin, total_points, has_seen_onboarding, hotmart_transaction_id, combo_progress, last_ad_watched_at, avatar_url")
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
  // devMode = true only when Supabase is NOT configured (placeholder URL).
  // localhost intentionally uses real Supabase auth so the full login flow
  // can be tested locally without deploying first.
  const devMode = !isSupabaseConfigured();

  let profile: typeof DEV_PROFILE | null = devMode ? DEV_PROFILE : null;
  let completedDays = 0;
  let userEmail = "";

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

    userEmail = user.email ?? "";

    const layoutData = await getLayoutData(user.id);
    // Use SAFE_EMPTY_PROFILE (not DEV_PROFILE) so that users without a DB row
    // never accidentally get is_admin: true
    profile = layoutData.user ?? SAFE_EMPTY_PROFILE;
    completedDays = layoutData.completedDays;
  }

  if (profile && isExpired(profile.access_expires_at)) {
    redirect("/dashboard/expirado");
  }

  // ── C2 fix (part 2 of 2): server-side paywall gate ───────────────────────
  // Non-admin users must have a verified Hotmart purchase on record.
  // This blocks:
  //   • accounts created directly in Supabase Auth (no webhook fired)
  //   • accounts whose trigger ran but the webhook never set the transaction id
  //   • SAFE_EMPTY_PROFILE fallback (no DB row at all)
  // Admins bypass this check (hotmart_transaction_id = null is fine for them).
  if (!devMode && profile && !profile.is_admin) {
    const hasPurchase = !!(profile as { hotmart_transaction_id?: string | null })
      .hotmart_transaction_id;
    if (!hasPurchase) {
      redirect("/sin-acceso");
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const remaining = daysLeft(profile?.access_expires_at ?? null);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0A2540" }}>
      {/* Global overlays & ambient effects */}
      <ParticleBackground />
      <ArcadeAmbient />
      <BootSequence />
      <UnlockEventListener />
      {/* XP Engine: invisible heartbeat + avatar XP listener */}
      {!devMode && <XpEngine />}
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
            {/* Logo */}
            <Link href="/dashboard" className="hover:opacity-80 transition-opacity shrink-0">
              <img
                src="/halcon.png"
                alt="Govbidder Challenge"
                style={{
                  height: "56px",
                  width: "auto",
                  display: "block",
                  filter: "drop-shadow(0 0 10px rgba(255,255,255,0.35))",
                }}
              />
            </Link>

            {/* Right: countdown + admin + xp + user + logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Countdown to next unlock */}
              <div className="hidden md:block">
                <CountdownTimer />
              </div>

              {profile?.is_admin && (
                <div className="flex items-center gap-2">
                  <Link
                    href="/admin"
                    className="flex items-center gap-1 text-xs text-[#D7263D] hover:text-[#ff4d6d] transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </Link>
                  <ResetTutorialButton />
                  <ResetDashboardButton />
                </div>
              )}

              {/* Ad button — +20 XP por ver un anuncio, cooldown 10 min */}
              {!devMode && (
                <AdButton
                  initialLastAdAt={
                    (profile as { last_ad_watched_at?: string | null })?.last_ad_watched_at ?? null
                  }
                />
              )}

              {/* XP level + points (client component with 3D flip) */}
              <div data-tour-id="xp-pill">
                <PointsHUD points={profile?.total_points ?? 0} />
              </div>

              <ProfileButton
                fullName={profile?.full_name ?? "Usuario"}
                email={userEmail}
                avatarUrl={(profile as { avatar_url?: string | null })?.avatar_url ?? null}
              />

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
          <div data-tour-id="progress-bar">
            <ProgressBar
            completedDays={completedDays}
            isAdmin={profile?.is_admin ?? false}
            avatarUrl={(profile as { avatar_url?: string | null })?.avatar_url ?? null}
          />
          </div>

          {/* Combo bar — thin fill bar below progress bar */}
          {!devMode && (
            <ComboBar
              initialProgress={(profile as { combo_progress?: number })?.combo_progress ?? 0}
            />
          )}
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
        className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 relative"
        style={{ background: "#0A2540" }}
      >
        {children}
      </main>

      {/* Onboarding tutorial — only on first visit */}
      {!devMode && (
        <OnboardingTutorial
          hasSeenOnboarding={profile?.has_seen_onboarding ?? false}
        />
      )}

      {/* Dashboard lock overlay — polling every 20s, appears automatically during live calls */}
      {!devMode && <DashboardLockOverlay />}
    </div>
  );
}
