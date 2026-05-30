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
  { day: 5, label: "Ranking",   sub: "Premios y Posiciones",  href: "/dashboard/ranking" },
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
      style={{
        display: "flex",
        alignItems: "stretch",
        padding: "6px 10px",
        gap: "5px",
        background: "#0A2540",
        borderBottom: "1px solid #1E3A5C",
        flexShrink: 0,
        height: "58px",
      }}
    >
      {TABS.map(({ day, label, sub, href }) => {
        const isHome      = day === 0;
        const isRanking   = day === 5;
        const prog        = progressMap[day];
        const isActive    = isHome
          ? pathname === "/dashboard"
          : pathname === href || pathname.startsWith(href + "/");
        const isCompleted = prog?.is_completed ?? false;
        const isUnlocked  = isHome || isRanking ? true : (prog?.is_unlocked ?? false);
        const isLocked    = !isUnlocked;

        return (
          <div
            key={day}
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
                ? "1.5px solid #0056D6"
                : isLocked
                ? "1.5px solid rgba(30,58,92,0.4)"
                : "1.5px solid #1E3A5C",
              cursor: isLocked ? "not-allowed" : "pointer",
              transition: "background 0.15s, border-color 0.15s",
              background: isActive
                ? "linear-gradient(135deg, #0E3A7A 0%, #0056D6 100%)"
                : isLocked
                ? "rgba(10,37,64,0.4)"
                : "rgba(20,58,107,0.25)",
              boxShadow: isActive
                ? "0 2px 12px rgba(0,86,214,0.35), inset 0 1px 0 rgba(255,255,255,0.08)"
                : "none",
              userSelect: "none",
              opacity: isLocked ? 0.6 : 1,
              textAlign: "center",
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              if (!isLocked && !isActive) {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(20,58,107,0.55)";
                el.style.borderColor = "#2A5A8C";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLocked && !isActive) {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(20,58,107,0.25)";
                el.style.borderColor = "#1E3A5C";
              }
            }}
          >
            {/* Top row: number badge + day label */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {isHome ? (
                <span style={{ fontSize: "12px" }}>🏠</span>
              ) : isRanking ? (
                <span style={{ fontSize: "12px" }}>🏆</span>
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
                      ? "rgba(255,255,255,0.2)"
                      : isCompleted
                      ? "rgba(0,214,122,0.2)"
                      : "rgba(255,255,255,0.06)",
                    color: isCompleted && !isActive ? "#00D67A" : "#FFFFFF",
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
                  color: isActive ? "#FFFFFF" : isLocked ? "#3D4E6B" : "#A8B5CC",
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
                  color: isActive ? "rgba(255,255,255,0.75)" : isLocked ? "#2A3A50" : "#5A6B85",
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
