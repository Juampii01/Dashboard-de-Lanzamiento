"use client";

import { usePathname, useRouter } from "next/navigation";
import { createParticleBurst } from "@/lib/wow-effects";
import { useRef } from "react";

interface DayTabsProps {
  progressMap: Record<number, { is_unlocked: boolean; is_completed: boolean }>;
}

const TABS = [
  { day: 0, label: "Inicio",    sub: null,                    href: "/dashboard" },
  { day: 1, label: "Día 1",     sub: "Perfil Estratégico",    href: "/dashboard/dia-1" },
  { day: 2, label: "Día 2",     sub: "Mapa de Códigos",       href: "/dashboard/dia-2" },
  { day: 3, label: "Día 3",     sub: "Web + Portales",        href: "/dashboard/dia-3" },
  { day: 4, label: "Día 4",     sub: "Cap. Statement",        href: "/dashboard/dia-4" },
  { day: 7, label: "Suma Puntos", sub: "Ganá más XP",          href: "/dashboard/suma-puntos" },
  { day: 5, label: "Ranking",   sub: "Premios y Posiciones",  href: "/dashboard/ranking" },
  { day: 6, label: "Tu próximo paso", sub: "Después del challenge", href: "/dashboard/proximo-paso" },
];

export function DayTabs({ progressMap }: DayTabsProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const tabRef   = useRef<HTMLDivElement>(null);

  function handleTabClick(e: React.MouseEvent, href: string, isUnlocked: boolean) {
    if (!isUnlocked) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    createParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, "gold", 8);
    router.push(href);
  }

  return (
    <div
      ref={tabRef}
      className="gb-daytabs"
      style={{
        display: "flex",
        alignItems: "stretch",
        padding: "6px 10px",
        gap: "5px",
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        height: "58px",
      }}
    >
      {TABS.map(({ day, label, sub, href }) => {
        const isHome      = day === 0;
        const isRanking   = day === 5;
        const isNextStep  = day === 6;
        const isSumaPuntos = day === 7;
        const prog        = progressMap[day];
        const isActive    = isHome
          ? pathname === "/dashboard"
          : pathname === href || pathname.startsWith(href + "/");
        const isCompleted = prog?.is_completed ?? false;
        const isUnlocked  = isHome || isRanking || isNextStep || isSumaPuntos ? true : (prog?.is_unlocked ?? false);
        const isLocked    = !isUnlocked;

        return (
          <div
            key={day}
            className="gb-daytab"
            data-tour-id={day === 1 ? "day-tab-1" : undefined}
            onClick={(e) => handleTabClick(e, href, isUnlocked)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "1px",
              padding: "0 8px",
              borderRadius: "8px",
              border: isActive
                ? "1.5px solid var(--secondary)"
                : "1.5px solid var(--border)",
              cursor: isLocked ? "not-allowed" : "pointer",
              transition: "background 0.15s, border-color 0.15s",
              background: isActive
                ? "var(--secondary)"
                : isLocked
                ? "transparent"
                : "var(--muted)",
              boxShadow: isActive
                ? "0 2px 12px -2px color-mix(in srgb, var(--secondary) 55%, transparent)"
                : "none",
              userSelect: "none",
              opacity: isLocked ? 0.55 : 1,
              textAlign: "center",
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              if (!isLocked && !isActive) {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "var(--sidebar-accent)";
                el.style.borderColor = "color-mix(in srgb, var(--secondary) 40%, transparent)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLocked && !isActive) {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "var(--muted)";
                el.style.borderColor = "var(--border)";
              }
            }}
          >
            {/* Top row: number badge + day label */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {isHome ? (
                <span style={{ fontSize: "12px" }}>🏠</span>
              ) : isRanking ? (
                <span style={{ fontSize: "12px" }}>🏆</span>
              ) : isNextStep ? (
                <span style={{ fontSize: "12px" }}>🚀</span>
              ) : isSumaPuntos ? (
                <span style={{ fontSize: "12px" }}>⚡</span>
              ) : (
                <span
                  style={{
                    width: "15px",
                    height: "15px",
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-arcade)",
                    fontSize: "7px",
                    fontWeight: 900,
                    flexShrink: 0,
                    background: isActive
                      ? "rgba(255,255,255,0.22)"
                      : isCompleted
                      ? "color-mix(in srgb, var(--success) 16%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 8%, transparent)",
                    color: isActive ? "#FFFFFF" : isCompleted ? "var(--success)" : "var(--muted-foreground)",
                  }}
                >
                  {isLocked ? "🔒" : isCompleted ? "✓" : day}
                </span>
              )}
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: isActive ? "#FFFFFF" : isLocked ? "var(--muted-foreground)" : "var(--foreground)",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>

            {/* Subtitle — only for days 1-4 */}
            {sub && (
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "9px",
                  fontWeight: 500,
                  color: isActive ? "rgba(255,255,255,0.8)" : "var(--muted-foreground)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                  lineHeight: 1.2,
                }}
              >
                {sub}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
