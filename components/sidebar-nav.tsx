import Link from "next/link";
import { Shield, LogOut } from "lucide-react";
import { ResetTutorialButton } from "@/components/reset-tutorial-button";
import { ResetDashboardButton } from "@/components/reset-dashboard-button";
import { ProfileButton } from "@/components/profile-button";

// ─────────────────────────────────────────────────────────────────────────────
// Width exported as CSS variable so DayTabs can offset itself
// ─────────────────────────────────────────────────────────────────────────────
export const SIDEBAR_WIDTH = 240;

interface SidebarNavProps {
  profile: {
    full_name: string;
    total_points: number;
    is_admin: boolean;
    access_expires_at: string | null;
    has_seen_onboarding: boolean;
    last_ad_watched_at?: string | null;
    avatar_url?: string | null;
    hotmart_transaction_id?: string | null;
    combo_progress?: number;
  };
  email: string;
  progressMap: Record<number, { is_unlocked: boolean; is_completed: boolean }>;
  completedDays: number;
  devMode: boolean;
}

const DAY_META: Record<number, { label: string; href: string }> = {
  1: { label: "Perfil Estratégico", href: "/dashboard/dia-1" },
  2: { label: "Códigos NAICS",      href: "/dashboard/dia-2" },
  3: { label: "Web + Portales",     href: "/dashboard/dia-3" },
  4: { label: "Cap. Statement",     href: "/dashboard/dia-4" },
};

function DayNavItem({
  day,
  label,
  href,
  isCompleted,
  isUnlocked,
}: {
  day: number;
  label: string;
  href: string;
  isCompleted: boolean;
  isUnlocked: boolean;
}) {
  const isLocked = !isUnlocked;

  const content = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "9px",
        padding: "8px 14px",
        borderLeft: isCompleted
          ? "3px solid #00D67A"
          : isUnlocked
          ? "3px solid #D7263D"
          : "3px solid transparent",
        background: isUnlocked && !isCompleted
          ? "rgba(215,38,61,0.07)"
          : "transparent",
        opacity: isLocked ? 0.4 : 1,
        cursor: isLocked ? "not-allowed" : "pointer",
        transition: "background 0.15s",
      }}
    >
      {/* Day number box */}
      <div
        style={{
          width: "26px",
          height: "26px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-arcade)",
          fontSize: "11px",
          fontWeight: 900,
          flexShrink: 0,
          background: isCompleted
            ? "rgba(0,214,122,0.15)"
            : isUnlocked
            ? "rgba(215,38,61,0.15)"
            : "rgba(90,107,133,0.12)",
          color: isCompleted
            ? "#00D67A"
            : isUnlocked
            ? "#fff"
            : "#5A6B85",
          border: isCompleted
            ? "1px solid rgba(0,214,122,0.3)"
            : isUnlocked
            ? "1px solid rgba(215,38,61,0.3)"
            : "1px solid #1E3A5C",
        }}
      >
        {isLocked ? "🔒" : `0${day}`}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "11.5px",
            fontWeight: 700,
            color: isLocked ? "#5A6B85" : "#FFFFFF",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "9.5px",
            color: isCompleted ? "#00D67A" : isUnlocked ? "#D7263D" : "#5A6B85",
            marginTop: "1px",
          }}
        >
          {isCompleted ? "✓ Completado" : isUnlocked ? "En progreso" : "Bloqueado"}
        </div>
      </div>

      {/* Pulse dot for active */}
      {isUnlocked && !isCompleted && (
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#D7263D",
            boxShadow: "0 0 6px #D7263D",
            flexShrink: 0,
            animation: "sb-pulse 1.4s ease infinite",
          }}
        />
      )}
    </div>
  );

  if (isLocked) return content;
  return <Link href={href} style={{ textDecoration: "none" }}>{content}</Link>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entregable link
// ─────────────────────────────────────────────────────────────────────────────
function EntregableRow({
  icon,
  name,
  sub,
  href,
  available,
}: {
  icon: string;
  name: string;
  sub: string;
  href: string;
  available: boolean;
}) {
  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "7px 14px",
        opacity: available ? 1 : 0.45,
        cursor: available ? "pointer" : "not-allowed",
        transition: "background 0.15s",
      }}
    >
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "5px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "13px",
          flexShrink: 0,
          background: "rgba(30,58,92,0.6)",
          border: "1px solid #1E3A5C",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.2 }}>
          {name}
        </div>
        <div style={{ fontSize: "9px", color: "#5A6B85" }}>{sub}</div>
      </div>
      <span style={{ fontSize: available ? "11px" : "9px", color: "#5A6B85", flexShrink: 0 }}>
        {available ? "↓" : "🔒"}
      </span>
    </div>
  );

  if (!available) return inner;
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
      {inner}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export function SidebarNav({
  profile,
  email,
  progressMap,
  completedDays,
  devMode,
}: SidebarNavProps) {
  const day1Done = progressMap[1]?.is_completed ?? false;
  const day2Done = progressMap[2]?.is_completed ?? false;
  const day3Done = progressMap[3]?.is_completed ?? false;
  const day4Done = progressMap[4]?.is_completed ?? false;

  return (
    <>
      {/* Keyframes for the pulse dot */}
      <style>{`
        @keyframes sb-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
        .sb-nav-item:hover {
          background: rgba(255,255,255,0.04) !important;
        }
      `}</style>

      <aside
        style={{
          width: `${SIDEBAR_WIDTH}px`,
          minWidth: `${SIDEBAR_WIDTH}px`,
          background: "linear-gradient(180deg, #0D2E4D 0%, #0A2540 100%)",
          borderRight: "1px solid #1E3A5C",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
          flexShrink: 0,
          scrollbarWidth: "none",
          height: "100vh",
        }}
      >
        {/* ── Marca ── */}
        <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #1E3A5C", flexShrink: 0 }}>

          {/* Fila 1: Logo + producto */}
          <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "4px 8px", display: "inline-flex", alignItems: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.25)", flexShrink: 0 }}>
              <img src="/halcon.png" alt="Govbidder" style={{ height: "32px", width: "auto", display: "block" }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 900, color: "#FFFFFF", lineHeight: 1.2 }}>
                Govbidder
              </div>
              <div style={{ fontSize: "7px", color: "#5A6B85", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Programa Federal
              </div>
            </div>
          </Link>

          {/* Tarjeta de usuario — prominente, clickeable, affordance claro */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

            {/* Card clickeable (ProfileButton maneja el modal) */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid #1E3A5C",
                borderRadius: "10px",
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                transition: "background 0.15s, border-color 0.15s",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(255,255,255,0.09)";
                el.style.borderColor = "#3A5070";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(255,255,255,0.05)";
                el.style.borderColor = "#1E3A5C";
              }}
            >
              {/* ProfileButton: avatar circle + modal handler */}
              <ProfileButton
                fullName={profile.full_name}
                email={email}
                avatarUrl={profile.avatar_url ?? null}
              />

              {/* Texto del usuario */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "13px", fontWeight: 800, color: "#FFFFFF",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  lineHeight: 1.3,
                }}>
                  {profile.full_name}
                </div>
                <div style={{
                  fontSize: "9.5px", color: "#5A6B85",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {email}
                </div>
              </div>

              {/* Ícono de editar */}
              <span style={{ fontSize: "11px", color: "#3A5070", flexShrink: 0 }}>✏️</span>
            </div>

            {/* Logout separado del card */}
            <form action="/api/auth/signout" method="POST" style={{ flexShrink: 0 }}>
              <button
                type="submit"
                title="Cerrar sesión"
                style={{
                  width: "34px", height: "34px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid #1E3A5C",
                  borderRadius: "8px",
                  color: "#5A6B85", cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = "rgba(215,38,61,0.12)";
                  b.style.color = "#D7263D";
                  b.style.borderColor = "rgba(215,38,61,0.3)";
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = "rgba(255,255,255,0.04)";
                  b.style.color = "#5A6B85";
                  b.style.borderColor = "#1E3A5C";
                }}
              >
                <LogOut style={{ width: "14px", height: "14px" }} />
              </button>
            </form>
          </div>

          {/* Fila 3: Admin controls — solo si es admin, todo en una línea */}
          {profile.is_admin && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #1E3A5C" }}>
              <Link href="/admin" style={{ fontSize: "10px", fontWeight: 600, color: "#D7263D", display: "flex", alignItems: "center", gap: "3px", textDecoration: "none" }}>
                <Shield style={{ width: "10px", height: "10px" }} /> Admin
              </Link>
              <ResetTutorialButton />
              <ResetDashboardButton />
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div style={{ height: "1px", background: "#1E3A5C", margin: "10px 12px" }} />

        {/* ── Navegación días ── */}
        <div
          style={{
            fontSize: "8px",
            fontWeight: 700,
            color: "#5A6B85",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontFamily: "var(--font-arcade)",
            padding: "0 14px 5px",
          }}
        >
          Fases del Programa
        </div>

        {[1, 2, 3, 4].map((day) => {
          const prog      = progressMap[day];
          const isUnlocked  = prog?.is_unlocked  ?? (day === 1);
          const isCompleted = prog?.is_completed ?? false;
          const { label, href } = DAY_META[day];
          return (
            <DayNavItem
              key={day}
              day={day}
              label={label}
              href={href}
              isCompleted={isCompleted}
              isUnlocked={isUnlocked}
            />
          );
        })}

        {/* ── Divider ── */}
        <div style={{ height: "1px", background: "#1E3A5C", margin: "8px 12px" }} />

        {/* ── Mis entregables ── */}
        <div
          style={{
            fontSize: "8px",
            fontWeight: 700,
            color: "#5A6B85",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontFamily: "var(--font-arcade)",
            padding: "0 14px 5px",
          }}
        >
          Mis Entregables
        </div>

        <EntregableRow
          icon="📄"
          name="Análisis Día 1"
          sub="NAICS + Perfil · PDF"
          href="/api/pdf/day-1"
          available={day1Done}
        />
        <EntregableRow
          icon="📄"
          name="Códigos NAICS"
          sub="Keywords · PDF"
          href="/api/pdf/day-2"
          available={day2Done}
        />
        <EntregableRow
          icon="📄"
          name="Web Preview"
          sub="Disponible en Día 3"
          href="/api/pdf/day-3"
          available={day3Done}
        />
        <EntregableRow
          icon="📄"
          name="Capability Statement"
          sub="Disponible en Día 4"
          href="/api/pdf/capability-statement"
          available={day4Done}
        />

        <div style={{ height: "16px" }} />
      </aside>
    </>
  );
}
