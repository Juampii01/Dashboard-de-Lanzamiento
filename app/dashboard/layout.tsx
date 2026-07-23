import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProgressBar } from "@/components/progress-bar";
import { UnlockEventListener } from "@/components/unlock-event-listener";
import { XpEngine } from "@/components/xp-engine";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { daysLeft, isExpired } from "@/lib/utils";
import { DashboardLockOverlay } from "@/components/dashboard-lock-overlay";
import { SidebarNav } from "@/components/sidebar-nav";
import { DayTabs } from "@/components/day-tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardAssistant } from "@/components/dashboard-assistant";


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
      .select("full_name, access_expires_at, is_admin, is_student, total_points, has_seen_onboarding, hotmart_transaction_id, last_ad_watched_at, avatar_url")
      .eq("id", userId)
      .single(),
    supabase
      .from("day_progress")
      .select("day_number, is_completed")
      .eq("user_id", userId),
  ]);

  // Registrar "ingreso al dashboard": marca last_seen_at la primera vez y luego
  // como máximo cada 10 min (evita un write por navegación). Query separada y
  // tolerante: si la columna last_seen_at aún no existe, no rompe el dashboard.
  if (user) {
    const { data: seenRow, error: seenErr } = await supabase
      .from("users")
      .select("last_seen_at")
      .eq("id", userId)
      .maybeSingle();
    if (!seenErr) {
      const lastSeen = (seenRow as { last_seen_at?: string | null } | null)?.last_seen_at ?? null;
      const seenStale = !lastSeen || Date.now() - Date.parse(lastSeen) > 10 * 60 * 1000;
      if (seenStale) {
        await supabase.from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
      }
    }
  }

  // Racha diaria (+300 desde el día 2). Idempotente por fecha. Tolerante si la
  // RPC/columnas aún no existen.
  let streak = 0;
  if (user) {
    try {
      const { data: streakRes, error: streakErr } = await supabase.rpc("claim_daily_streak", { p_user_id: userId });
      if (!streakErr && streakRes) {
        const r = streakRes as { streak?: number; total?: number };
        streak = r.streak ?? 0;
        if (typeof r.total === "number") (user as { total_points?: number }).total_points = r.total;
      }
    } catch { /* RPC no existe aún → ignorar */ }
  }

  const completedDays = progress?.filter((p) => p.is_completed).length ?? 0;

  // Los 4 días son SIEMPRE navegables (clickeables). El bloqueo NO es de
  // navegación: es el overlay de cada día (contador + botón) que tapa el
  // contenido hasta que el admin lo abre. Por eso is_unlocked = true acá.
  const completedByDay = new Map(
    (progress ?? []).map((p) => [p.day_number, p.is_completed])
  );
  const progressMap: Record<number, { is_unlocked: boolean; is_completed: boolean }> =
    Object.fromEntries(
      [1, 2, 3, 4].map((day) => [
        day,
        {
          is_unlocked: true,
          is_completed: completedByDay.get(day) ?? false,
        },
      ])
    );

  return { user, completedDays, progressMap, streak };
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
  let streak = 0;
  let progressMapFromLayout: Record<number, { is_unlocked: boolean; is_completed: boolean }> = {};

  if (devMode) {
    const cookieStore = await cookies();
    const devCompleted = cookieStore.get("dev_completed")?.value ?? "";
    const completedSet = new Set(devCompleted.split(",").filter(Boolean));
    completedDays = completedSet.size;
    for (let d = 1; d <= 4; d++) {
      progressMapFromLayout[d] = { is_unlocked: true, is_completed: completedSet.has(String(d)) };
    }
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
    progressMapFromLayout = layoutData.progressMap;
    streak = layoutData.streak ?? 0;

    // Admins see all days unlocked
    if (profile?.is_admin) {
      for (let d = 1; d <= 4; d++) {
        progressMapFromLayout[d] = {
          is_unlocked: true,
          is_completed: progressMapFromLayout[d]?.is_completed ?? false,
        };
      }
    }
  }

  // Cierre total de acceso (app_settings.access_closed = "true"): el admin
  // apagó el challenge para todos menos para sí mismo. Chequea ANTES que
  // expirado/paywall para que ningún caso se cuele.
  if (!devMode && profile && !profile.is_admin) {
    const { data: closedSetting } = await createServiceClient()
      .from("app_settings")
      .select("value")
      .eq("key", "access_closed")
      .maybeSingle();
    if ((closedSetting as { value?: string } | null)?.value === "true") {
      redirect("/acceso-cerrado");
    }
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
  // Los ALUMNOS (is_student) también: acceden gratis, sin compra. Marcarlos como
  // alumno alcanza para darles acceso (no necesitan transacción de Hotmart).
  if (
    !devMode &&
    profile &&
    !profile.is_admin &&
    !(profile as { is_student?: boolean }).is_student
  ) {
    const hasPurchase = !!(profile as { hotmart_transaction_id?: string | null })
      .hotmart_transaction_id;
    if (!hasPurchase) {
      redirect("/sin-acceso");
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const remaining = daysLeft(profile?.access_expires_at ?? null);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "row",     /* sidebar izquierdo, todo el resto a la derecha */
        background: "var(--background)",
        overflow: "hidden",
      }}
    >
      {/* Invisible global effects */}
      <UnlockEventListener />
      {!devMode && <XpEngine />}

      {/* ── SIDEBAR — columna izquierda, altura completa ── */}
      <SidebarNav
          profile={{
            full_name:               profile?.full_name ?? "Usuario",
            total_points:            profile?.total_points ?? 0,
            is_admin:                profile?.is_admin ?? false,
            access_expires_at:       profile?.access_expires_at ?? null,
            has_seen_onboarding:     profile?.has_seen_onboarding ?? false,
            last_ad_watched_at:      (profile as { last_ad_watched_at?: string | null })?.last_ad_watched_at ?? null,
            avatar_url:              (profile as { avatar_url?: string | null })?.avatar_url ?? null,
            hotmart_transaction_id:  (profile as { hotmart_transaction_id?: string | null })?.hotmart_transaction_id ?? null,
          }}
          email={userEmail}
          progressMap={progressMapFromLayout}
          completedDays={completedDays}
          devMode={devMode}
        />

        {/* ── Columna derecha: barras + tabs + contenido ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Barras de progreso — solo en la columna derecha */}
          <div
            data-tour-id="progress-bar"
            style={{
              background: "var(--card)",
              borderBottom: "1px solid var(--border)",
              padding: "8px 20px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <ProgressBar
                completedDays={completedDays}
                isAdmin={profile?.is_admin ?? false}
                avatarUrl={(profile as { avatar_url?: string | null })?.avatar_url ?? null}
              />
            </div>
            {streak > 0 && (
              <span
                title={`${streak} día${streak !== 1 ? "s" : ""} seguido${streak !== 1 ? "s" : ""} · +300 XP/día desde el 2º`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
                  fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 800,
                  color: "#FF7A00",
                  background: "color-mix(in srgb, #FF7A00 12%, transparent)",
                  border: "1px solid color-mix(in srgb, #FF7A00 35%, transparent)",
                  borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap",
                }}
              >
                🔥 {streak} {streak === 1 ? "día" : "días"}
              </span>
            )}
            <ThemeToggle />
          </div>

          {/* Expiry banner */}
          {remaining <= 3 && remaining > 0 && (
            <div style={{ padding: "6px 20px", textAlign: "center", fontSize: "13px", fontWeight: 600, background: "#A11D2E", color: "#FFFFFF", flexShrink: 0 }}>
              ⏳ Te quedan <strong>{remaining} día{remaining !== 1 ? "s" : ""}</strong> de acceso.
            </div>
          )}

          {/* Tabs */}
          <DayTabs progressMap={progressMapFromLayout} />

          {/* Contenido principal — contenedor centrado y con aire */}
          <main className="gb-main" style={{ flex: 1, overflowY: "auto", background: "var(--background)", padding: "40px 24px 64px" }}>
            <div style={{ maxWidth: "960px", margin: "0 auto", width: "100%" }}>
              {children}
            </div>
          </main>
        </div>

      {/* Onboarding tutorial */}
      {!devMode && (
        <OnboardingTutorial
          hasSeenOnboarding={profile?.has_seen_onboarding ?? false}
        />
      )}
      {!devMode && <DashboardLockOverlay isAdmin={profile?.is_admin ?? false} />}

      {/* Asistente de IA flotante — guía a todos los usuarios */}
      {!devMode && <DashboardAssistant />}
    </div>
  );
}
