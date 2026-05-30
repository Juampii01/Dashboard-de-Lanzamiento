"use client";

/**
 * DayTabs
 * Pestañas estilo botón debajo del combo bar.
 * Día activo: fondo azul + borde azul.
 * Días bloqueados: opacidad reducida + candado.
 */

import { usePathname, useRouter } from "next/navigation";
import { createParticleBurst } from "@/lib/wow-effects";
import { useRef } from "react";

interface DayTabsProps {
  progressMap: Record<number, { is_unlocked: boolean; is_completed: boolean }>;
}

const TABS = [
  { day: 0, label: "Inicio",  href: "/dashboard" },
  { day: 1, label: "Día 1",   href: "/dashboard/dia-1" },
  { day: 2, label: "Día 2",   href: "/dashboard/dia-2" },
  { day: 3, label: "Día 3",   href: "/dashboard/dia-3" },
  { day: 4, label: "Día 4",   href: "/dashboard/dia-4" },
];

export function DayTabs({ progressMap }: DayTabsProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const tabRef   = useRef<HTMLDivElement>(null);

  function handleTabClick(
    e: React.MouseEvent,
    href: string,
    isUnlocked: boolean
  ) {
    if (!isUnlocked) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    createParticleBurst(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      "gold",
      8
    );
    router.push(href);
  }

  return (
    <div
      ref={tabRef}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "6px 12px",
        gap: "6px",
        background: "#0A2540",
        borderBottom: "1px solid #1E3A5C",
        flexShrink: 0,
        height: "50px",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {TABS.map(({ day, label, href }) => {
        const isHome      = day === 0;
        const prog        = progressMap[day];
        const isActive    = isHome
          ? pathname === "/dashboard"
          : pathname === href || pathname.startsWith(href + "/");
        const isCompleted = prog?.is_completed ?? false;
        const isUnlocked  = isHome ? true : (prog?.is_unlocked ?? false);
        const isLocked    = !isUnlocked;

        return (
          <div
            key={day}
            data-tour-id={day === 1 ? "day-tab-1" : undefined}
            onClick={(e) => handleTabClick(e, href, isUnlocked)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              padding: "0 14px",
              height: "34px",
              borderRadius: "8px",
              border: isActive
                ? "1.5px solid #0056D6"
                : isLocked
                ? "1.5px solid rgba(30,58,92,0.5)"
                : "1.5px solid #1E3A5C",
              flexShrink: 0,
              cursor: isLocked ? "not-allowed" : "pointer",
              transition: "background 0.15s, border-color 0.15s, transform 0.1s",
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              fontWeight: isActive ? 700 : 500,
              color: isActive
                ? "#FFFFFF"
                : isLocked
                ? "#3D4E6B"
                : "#7A9AC0",
              background: isActive
                ? "linear-gradient(135deg, #0E3A7A 0%, #0056D6 100%)"
                : isLocked
                ? "rgba(10,37,64,0.4)"
                : "rgba(20,58,107,0.3)",
              boxShadow: isActive
                ? "0 2px 12px rgba(0,86,214,0.35), inset 0 1px 0 rgba(255,255,255,0.08)"
                : "none",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!isLocked && !isActive) {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(20,58,107,0.6)";
                el.style.borderColor = "#2A5A8C";
                el.style.color = "#FFFFFF";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLocked && !isActive) {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(20,58,107,0.3)";
                el.style.borderColor = "#1E3A5C";
                el.style.color = "#7A9AC0";
              }
            }}
          >
            {/* Ícono para Inicio */}
            {isHome && (
              <span style={{ fontSize: "12px", lineHeight: 1 }}>🏠</span>
            )}

            {/* Badge numérico — solo para días 1-4 */}
            {!isHome && (
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-arcade)",
                  fontSize: "8px",
                  fontWeight: 900,
                  flexShrink: 0,
                  background: isActive
                    ? "rgba(255,255,255,0.18)"
                    : isCompleted
                    ? "rgba(0,214,122,0.2)"
                    : isLocked
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(255,255,255,0.06)",
                  color: isActive
                    ? "#FFFFFF"
                    : isCompleted
                    ? "#00D67A"
                    : "inherit",
                }}
              >
                {isLocked ? "🔒" : day}
              </span>
            )}

            {/* Label */}
            <span>{label}</span>

            {/* ✓ si completado */}
            {isCompleted && !isHome && (
              <span style={{ fontSize: "9px", color: isActive ? "#7FFFC4" : "#00D67A", marginLeft: "1px" }}>✓</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
