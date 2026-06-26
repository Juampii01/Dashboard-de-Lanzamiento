"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Shield, LogOut, Menu, X, ChevronLeft, ChevronDown,
  CheckCircle2, Lock, FileText, CalendarDays, FolderDown, Pencil,
} from "lucide-react";
import { ResetTutorialButton } from "@/components/reset-tutorial-button";
import { ResetDashboardButton } from "@/components/reset-dashboard-button";
import { ProfileButton } from "@/components/profile-button";

// Exported so other layout pieces can offset against the expanded width.
export const SIDEBAR_WIDTH = 248;
const SIDEBAR_COLLAPSED_WIDTH = 76;

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

// ─── Day nav item ─────────────────────────────────────────────────────────────
function DayNavItem({
  day, label, href, isCompleted, isUnlocked, collapsed, active,
}: {
  day: number; label: string; href: string;
  isCompleted: boolean; isUnlocked: boolean; collapsed: boolean; active: boolean;
}) {
  const locked = !isUnlocked;
  const accent = isCompleted ? "var(--success)" : isUnlocked ? "var(--primary)" : "var(--muted-foreground)";

  const box = (
    <span
      className="sb-daybox"
      style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800,
        color: locked ? "var(--muted-foreground)" : isCompleted ? "var(--success)" : "var(--primary)",
        background: "color-mix(in srgb, " + accent + " 12%, transparent)",
        border: "1px solid color-mix(in srgb, " + accent + " 30%, transparent)",
      }}
    >
      {isCompleted ? <CheckCircle2 size={15} /> : locked ? <Lock size={13} /> : day}
    </span>
  );

  const inner = (
    <div
      className="sb-item"
      title={collapsed ? `Día ${day} — ${label}` : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 11,
        padding: collapsed ? "8px 0" : "8px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: 10,
        background: active ? "var(--sidebar-accent)" : "transparent",
        opacity: locked ? 0.55 : 1,
        cursor: locked ? "not-allowed" : "pointer",
        position: "relative",
      }}
    >
      {active && !collapsed && (
        <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: accent }} />
      )}
      {box}
      {!collapsed && (
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: "block", fontSize: 13, fontWeight: 600, lineHeight: 1.25,
            color: locked ? "var(--muted-foreground)" : "var(--sidebar-foreground)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{label}</span>
          <span style={{ display: "block", fontSize: 11, color: accent, fontWeight: 600 }}>
            {isCompleted ? "Completado" : isUnlocked ? "En progreso" : "Bloqueado"}
          </span>
        </span>
      )}
    </div>
  );

  if (locked) return <div style={{ display: "block", textDecoration: "none" }}>{inner}</div>;
  return <Link href={href} style={{ display: "block", textDecoration: "none" }}>{inner}</Link>;
}

// ─── Deliverable row ──────────────────────────────────────────────────────────
function EntregableRow({
  name, sub, href, available, collapsed,
}: {
  name: string; sub: string; href: string; available: boolean; collapsed: boolean;
}) {
  const inner = (
    <div
      className="sb-item"
      title={collapsed ? name : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 11,
        padding: collapsed ? "8px 0" : "8px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: 10,
        opacity: available ? 1 : 0.5,
        cursor: available ? "pointer" : "not-allowed",
      }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: available ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "var(--muted)",
        color: available ? "var(--primary)" : "var(--muted-foreground)",
        border: `1px solid ${available ? "color-mix(in srgb, var(--primary) 28%, transparent)" : "var(--sidebar-border)"}`,
      }}>
        <FileText size={15} />
      </span>
      {!collapsed && (
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: "block", fontSize: 12.5, fontWeight: 600, lineHeight: 1.25,
            color: "var(--sidebar-foreground)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{name}</span>
          <span style={{ display: "block", fontSize: 11, color: "var(--muted-foreground)" }}>{sub}</span>
        </span>
      )}
      {!collapsed && (
        <span style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }}>
          {available ? "↓" : <Lock size={12} />}
        </span>
      )}
    </div>
  );

  if (!available) return <div style={{ textDecoration: "none" }}>{inner}</div>;
  return <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>{inner}</a>;
}

// ─── Section header (accordion) ───────────────────────────────────────────────
function SectionHeader({
  icon, label, open, onToggle,
}: { icon: React.ReactNode; label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="sb-section-head"
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 8,
        padding: "6px 12px", background: "transparent", border: "none", cursor: "pointer",
        color: "var(--muted-foreground)",
      }}
    >
      <span style={{ display: "inline-flex", color: "var(--muted-foreground)" }}>{icon}</span>
      <span style={{
        flex: 1, textAlign: "left", fontSize: 10.5, fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
      }}>{label}</span>
      <ChevronDown
        size={14}
        style={{ transition: "transform 0.2s ease", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
      />
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function SidebarNav({ profile, email, progressMap }: SidebarNavProps) {
  const day1Done = progressMap[1]?.is_completed ?? false;
  const day2Done = progressMap[2]?.is_completed ?? false;
  const day3Done = progressMap[3]?.is_completed ?? false;
  const day4Done = progressMap[4]?.is_completed ?? false;

  const pathname = usePathname();

  // Mobile drawer
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);

  // Two-level collapse + accordions (persisted in localStorage)
  const [collapsed, setCollapsed] = useState(false);
  const [diasOpen, setDiasOpen] = useState(true);
  const [entregablesOpen, setEntregablesOpen] = useState(true);

  useEffect(() => {
    try {
      const c = localStorage.getItem("gb_sidebar_collapsed");
      if (c !== null) setCollapsed(c === "1");
      const d = localStorage.getItem("gb_section_dias");
      if (d !== null) setDiasOpen(d === "1");
      const e = localStorage.getItem("gb_section_entregables");
      if (e !== null) setEntregablesOpen(e === "1");
    } catch { /* localStorage unavailable */ }
  }, []);

  const persist = (key: string, val: boolean) => {
    try { localStorage.setItem(key, val ? "1" : "0"); } catch { /* ignore */ }
  };
  const toggleCollapsed = () => setCollapsed((v) => { persist("gb_sidebar_collapsed", !v); return !v; });
  const toggleDias = () => setDiasOpen((v) => { persist("gb_section_dias", !v); return !v; });
  const toggleEntregables = () => setEntregablesOpen((v) => { persist("gb_section_entregables", !v); return !v; });

  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <>
      <style>{`
        .sb-item { transition: background 0.15s ease; }
        .sb-item:hover { background: var(--sidebar-accent); }
        .sb-section-head:hover { color: var(--sidebar-foreground) !important; }
        .gb-sidebar { transition: width 0.22s cubic-bezier(0.4,0,0.2,1); }
        /* Accordion smooth height */
        .sb-acc { display: grid; transition: grid-template-rows 0.24s ease; }
        .sb-acc > .sb-acc-inner { overflow: hidden; min-height: 0; }
        @media (prefers-reduced-motion: reduce) {
          .gb-sidebar, .sb-acc, .sb-item { transition: none !important; }
        }
      `}</style>

      {/* Hamburger — mobile only (CSS) */}
      <button
        className="gb-hamburger"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && <div className="gb-overlay" onClick={() => setOpen(false)} />}

      <aside
        className={`gb-sidebar${open ? " gb-open" : ""}`}
        style={{
          width, minWidth: width,
          background: "var(--sidebar)",
          border: "1px solid var(--sidebar-border)",
          borderRadius: 16,
          boxShadow: "0 10px 34px -10px rgba(13,26,61,0.22), 0 2px 8px rgba(13,26,61,0.07)",
          margin: "10px 6px 10px 10px",
          height: "calc(100vh - 20px)",
          display: "flex", flexDirection: "column",
          overflowY: "auto", overflowX: "hidden",
          flexShrink: 0, scrollbarWidth: "none",
          color: "var(--sidebar-foreground)",
        }}
      >
        {/* ── Brand + collapse toggle ── */}
        <div style={{
          padding: collapsed ? "14px 0 10px" : "14px 14px 12px",
          borderBottom: "1px solid var(--sidebar-border)", flexShrink: 0,
          display: "flex",
          flexDirection: collapsed ? "column" : "row",
          alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 9,
        }}>
          <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{
              background: "#fff", borderRadius: 9, padding: "4px 7px",
              display: "inline-flex", alignItems: "center", flexShrink: 0,
              boxShadow: "0 1px 4px rgba(13,26,61,0.18)",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/halcon.png" alt="GovBidder" style={{ height: 28, width: "auto", display: "block" }} />
            </span>
            {!collapsed && (
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 800, lineHeight: 1.15, color: "var(--sidebar-foreground)" }}>
                  GovBidder
                </span>
                <span style={{ display: "block", fontSize: 8.5, color: "var(--muted-foreground)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Challenge
                </span>
              </span>
            )}
          </Link>

          {/* Collapse toggle — desktop only. In collapsed mode it sits below the logo. */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="sb-collapse-btn theme-toggle"
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            title={collapsed ? "Expandir" : "Colapsar"}
            style={{ width: 30, height: 30 }}
          >
            <ChevronLeft size={16} style={{ transition: "transform 0.2s ease", transform: collapsed ? "rotate(180deg)" : "none" }} />
          </button>
        </div>

        {/* ── User card ── */}
        <div style={{
          padding: collapsed ? "12px 0" : "12px 14px",
          display: "flex", alignItems: "center", gap: 8,
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: "1px solid var(--sidebar-border)", flexShrink: 0,
        }}>
          {collapsed ? (
            <ProfileButton fullName={profile.full_name} email={email} avatarUrl={profile.avatar_url ?? null} compact size={40} />
          ) : (
            <>
              <div
                className="sb-item"
                style={{
                  flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10,
                  background: "var(--muted)", border: "1px solid var(--sidebar-border)",
                  borderRadius: 10, padding: "7px 9px", cursor: "pointer",
                }}
              >
                <ProfileButton fullName={profile.full_name} email={email} avatarUrl={profile.avatar_url ?? null} compact size={32} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: "block", fontSize: 13, fontWeight: 700, color: "var(--sidebar-foreground)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3,
                  }}>{profile.full_name}</span>
                  <span style={{
                    display: "block", fontSize: 10.5, color: "var(--muted-foreground)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{email}</span>
                </span>
                <Pencil size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              </div>

              <form action="/api/auth/signout" method="POST" style={{ flexShrink: 0 }}>
                <button type="submit" title="Cerrar sesión" className="theme-toggle" style={{ width: 34, height: 34 }}>
                  <LogOut size={15} />
                </button>
              </form>
            </>
          )}
        </div>

        {/* ── Admin row ── */}
        {profile.is_admin && !collapsed && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 14px", borderBottom: "1px solid var(--sidebar-border)", flexShrink: 0,
          }}>
            <Link href="/admin" style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
              <Shield size={12} /> Admin
            </Link>
            <ResetTutorialButton />
            <ResetDashboardButton />
          </div>
        )}
        {profile.is_admin && collapsed && (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", borderBottom: "1px solid var(--sidebar-border)" }}>
            <Link href="/admin" title="Admin" style={{ color: "var(--primary)", display: "inline-flex" }}>
              <Shield size={16} />
            </Link>
          </div>
        )}

        {/* ── Section: Fases del Programa ── */}
        <div style={{ padding: "8px 6px 4px", flexShrink: 0 }}>
          {!collapsed && (
            <SectionHeader icon={<CalendarDays size={13} />} label="Fases del Programa" open={diasOpen} onToggle={toggleDias} />
          )}
          <div className="sb-acc" style={{ gridTemplateRows: collapsed || diasOpen ? "1fr" : "0fr" }}>
            <div className="sb-acc-inner">
              <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: collapsed ? "4px 6px" : "2px 6px" }}>
                {[1, 2, 3, 4].map((day) => {
                  const prog = progressMap[day];
                  const isUnlocked = prog?.is_unlocked ?? (day === 1);
                  const isCompleted = prog?.is_completed ?? false;
                  const { label, href } = DAY_META[day];
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <DayNavItem
                      key={day} day={day} label={label} href={href}
                      isCompleted={isCompleted} isUnlocked={isUnlocked}
                      collapsed={collapsed} active={active}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Mis Entregables ── */}
        <div style={{ padding: "4px 6px 8px", flexShrink: 0 }}>
          {!collapsed && (
            <SectionHeader icon={<FolderDown size={13} />} label="Mis Entregables" open={entregablesOpen} onToggle={toggleEntregables} />
          )}
          <div className="sb-acc" style={{ gridTemplateRows: collapsed || entregablesOpen ? "1fr" : "0fr" }}>
            <div className="sb-acc-inner">
              <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: collapsed ? "4px 6px" : "2px 6px" }}>
                <EntregableRow name="Análisis Día 1" sub="NAICS + Perfil · PDF" href="/api/pdf/day-1" available={day1Done} collapsed={collapsed} />
                <EntregableRow name="Manual NAICS 2022" sub="🎁 Regalo · Catálogo completo" href="/codigos-naics-2022.pdf" available={true} collapsed={collapsed} />
                <EntregableRow name="Códigos NAICS" sub="Keywords · PDF" href="/api/pdf/day-2" available={day2Done} collapsed={collapsed} />
                <EntregableRow name="Web Preview" sub="Descargar HTML · Día 3" href="/api/web/day-3" available={day3Done} collapsed={collapsed} />
                <EntregableRow name="Resumen Día 3" sub="Días 1-3 · PDF" href="/api/pdf/day-3" available={day3Done} collapsed={collapsed} />
                <EntregableRow name="Capability Statement" sub="Disponible en Día 4" href="/api/pdf/capability-statement" available={day4Done} collapsed={collapsed} />
                <EntregableRow name="Resumen Final" sub="Los 4 días · PDF" href="/api/pdf/day-4" available={day4Done} collapsed={collapsed} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />
      </aside>
    </>
  );
}
