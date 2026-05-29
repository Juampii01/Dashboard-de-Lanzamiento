"use client";

/**
 * DayTabs
 * Pestañas estilo browser debajo del combo bar.
 * Muestra 1 | 2 | 3 | 4 y resalta la activa según el pathname.
 * La tab activa se determina en el cliente (usePathname).
 */

import { usePathname, useRouter } from "next/navigation";
import { createParticleBurst } from "@/lib/wow-effects";
import { useRef } from "react";

interface DayTabsProps {
  progressMap: Record<number, { is_unlocked: boolean; is_completed: boolean }>;
}

const TABS = [
  { day: 1, label: "Perfil",    href: "/dashboard/dia-1" },
  { day: 2, label: "NAICS",     href: "/dashboard/dia-2" },
  { day: 3, label: "Portales",  href: "/dashboard/dia-3" },
  { day: 4, label: "Cap. Stmt", href: "/dashboard/dia-4" },
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

    // Burst particles from click position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    createParticleBurst(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      "gold",
      10
    );

    router.push(href);
  }

  return (
    <div
      ref={tabRef}
      style={{
        display: "flex",
        alignItems: "flex-end",
        padding: "0 20px",
        gap: "3px",
        background: "#0A2540",
        borderBottom: "1px solid #1E3A5C",
        flexShrink: 0,
        height: "42px",
      }}
    >
      {TABS.map(({ day, label, href }) => {
        const prog      = progressMap[day];
        const isActive  = pathname === href || pathname.startsWith(href + "/");
        const isCompleted = prog?.is_completed ?? false;
        const isUnlocked  = prog?.is_unlocked  ?? false;
        const isLocked    = !isUnlocked;

        return (
          <div
            key={day}
            onClick={(e) => handleTabClick(e, href, isUnlocked)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 18px",
              borderRadius: "8px 8px 0 0",
              border: "1px solid transparent",
              borderBottom: "none",
              height: "36px",
              position: "relative",
              cursor: isLocked ? "not-allowed" : "pointer",
              transition: "all 0.18s",
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              fontWeight: isActive ? 700 : 600,
              color: isActive ? "#FFFFFF" : isLocked ? "#3D4E6B" : "#5A6B85",
              background: isActive ? "#0E2D4A" : "transparent",
              borderColor: isActive ? "#1E3A5C" : "transparent",
              userSelect: "none",
              // Hover solo si está desbloqueado
              ...(isLocked ? {} : { ["--tab-hover" as string]: "1" }),
            }}
            onMouseEnter={(e) => {
              if (!isLocked && !isActive) {
                (e.currentTarget as HTMLDivElement).style.color   = "#A8B5CC";
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLocked && !isActive) {
                (e.currentTarget as HTMLDivElement).style.color   = "#5A6B85";
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }
            }}
          >
            {/* Línea de fondo cuando está activa (oculta el borde inferior) */}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: "#0E2D4A",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Número */}
            <span
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-arcade)",
                fontSize: "10px",
                fontWeight: 900,
                flexShrink: 0,
                background: isActive
                  ? "#D7263D"
                  : isCompleted
                  ? "rgba(0,214,122,0.15)"
                  : "rgba(255,255,255,0.07)",
                color: isActive
                  ? "#fff"
                  : isCompleted
                  ? "#00D67A"
                  : "inherit",
                boxShadow: isActive
                  ? "0 0 8px rgba(215,38,61,0.5)"
                  : "none",
              }}
            >
              {isLocked ? "🔒" : day}
            </span>

            {/* Label */}
            <span>{label}</span>

            {/* Check si completado */}
            {isCompleted && (
              <span style={{ fontSize: "10px", color: "#00D67A", marginLeft: "-3px" }}>
                ✓
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
