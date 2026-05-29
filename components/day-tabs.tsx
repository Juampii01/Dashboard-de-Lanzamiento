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
  { day: 0, label: "Inicio",    href: "/dashboard" },
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
        alignItems: "stretch",
        padding: "0",
        gap: "0",
        background: "#0A2540",
        borderBottom: "1px solid #1E3A5C",
        flexShrink: 0,
        height: "42px",
      }}
    >
      {TABS.map(({ day, label, href }) => {
        const isHome      = day === 0;
        const prog        = progressMap[day];
        const isActive    = isHome
          ? pathname === "/dashboard"
          : pathname === href || pathname.startsWith(href + "/");
        const isCompleted = prog?.is_completed ?? false;
        // Inicio y días desbloqueados son siempre clickeables
        const isUnlocked  = isHome ? true : (prog?.is_unlocked ?? false);
        const isLocked    = !isUnlocked;

        return (
          <div
            key={day}
            onClick={(e) => handleTabClick(e, href, isUnlocked)}
            style={{
              flex: 1,                        /* ocupa el ancho completo equitativamente */
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "0 8px",
              borderRight: "1px solid #1E3A5C",
              height: "100%",
              position: "relative",
              cursor: isLocked ? "not-allowed" : "pointer",
              transition: "background 0.18s, color 0.18s",
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "#FFFFFF" : isLocked ? "#3D4E6B" : "#5A6B85",
              background: isActive ? "#0E2D4A" : "transparent",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              if (!isLocked && !isActive) {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLDivElement).style.color = "#A8B5CC";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLocked && !isActive) {
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
                (e.currentTarget as HTMLDivElement).style.color = "#5A6B85";
              }
            }}
          >
            {/* Línea roja en el fondo cuando está activa */}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "#D7263D",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Número / Ícono */}
            {/* Badge numérico — solo para días 1-4, no para Inicio */}
            {!isHome && (
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-arcade)",
                  fontSize: "9px",
                  fontWeight: 900,
                  flexShrink: 0,
                  background: isActive
                    ? "#D7263D"
                    : isCompleted
                    ? "rgba(0,214,122,0.18)"
                    : isLocked
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.07)",
                  color: isActive ? "#fff" : isCompleted ? "#00D67A" : "inherit",
                  boxShadow: isActive ? "0 0 6px rgba(215,38,61,0.5)" : "none",
                }}
              >
                {isLocked ? "🔒" : day}
              </span>
            )}

            {/* Ícono para Inicio */}
            {isHome && (
              <span style={{ fontSize: "13px", lineHeight: 1 }}>🏠</span>
            )}

            {/* Label */}
            <span style={{ whiteSpace: "nowrap" }}>{label}</span>

            {/* Check si completado */}
            {isCompleted && !isHome && (
              <span style={{ fontSize: "9px", color: "#00D67A" }}>✓</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
