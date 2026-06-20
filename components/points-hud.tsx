"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flyPoints } from "@/lib/wow-effects";

interface PointsHUDProps {
  points: number;
  // levelName / levelEmoji / levelPct removed — recomputed client-side from points
}

function getXpLevel(pts: number) {
  if (pts >= 500) return { name: "Gov Pro",     emoji: "🏆", min: 500, max: Infinity };
  if (pts >= 250) return { name: "Licitador",   emoji: "🏛️", min: 250, max: 500 };
  if (pts >= 100) return { name: "Contratista", emoji: "⚡",  min: 100, max: 250 };
  return            { name: "Rookie",           emoji: "🔰", min: 0,   max: 100 };
}

export function PointsHUD({
  points: initialPoints,
}: PointsHUDProps) {
  const [flipping, setFlipping]         = useState(false);
  const [open, setOpen]                 = useState(false);
  const [currentPoints, setCurrentPoints] = useState(initialPoints);
  const [levelUp, setLevelUp]           = useState(false);
  const [tooltipPos, setTooltipPos]     = useState({ top: 0, right: 0 });
  const pillRef = useRef<HTMLDivElement>(null);
  const prevPointsRef = useRef(initialPoints);

  // Recompute level from current points
  const lvl = getXpLevel(currentPoints);
  const levelPct =
    lvl.max === Infinity
      ? 100
      : Math.round(((currentPoints - lvl.min) / (lvl.max - lvl.min)) * 100);

  // Listen for XP gained events dispatched by XpEngine
  useEffect(() => {
    const handler = (e: Event) => {
      const { delta, total, source } = (
        e as CustomEvent<{ delta: number; total: number; source: string }>
      ).detail;

      const prevLvl = getXpLevel(prevPointsRef.current).name;
      const newLvl  = getXpLevel(total).name;
      prevPointsRef.current = total;

      setCurrentPoints(total);
      setFlipping(true);
      setTimeout(() => setFlipping(false), 780);

      // Level-up flash
      if (prevLvl !== newLvl) {
        setLevelUp(true);
        setTimeout(() => setLevelUp(false), 1800);
      }

      // Flying label from the pill upward
      if (pillRef.current) {
        const rect = pillRef.current.getBoundingClientRect();
        const label =
          source === "time"   ? `+${delta} XP ⏱️`
          : source === "avatar" ? `+${delta} XP 🕺`
          : source === "start"  ? `+${delta} XP 🚀`
          : source === "join"   ? `+${delta} XP 📞`
          : `+${delta} XP`;
        flyPoints(
          rect.left + rect.width  / 2,
          rect.top  + rect.height / 2,
          rect.left + rect.width  / 2,
          rect.top  - 60,
          label
        );
      }
    };

    window.addEventListener("xp-gained", handler);
    return () => window.removeEventListener("xp-gained", handler);
  }, []);

  const handleClick = useCallback(() => {
    setFlipping(true);
    setTimeout(() => setFlipping(false), 780);
    setOpen((v) => {
      const next = !v;
      if (next && pillRef.current) {
        const rect = pillRef.current.getBoundingClientRect();
        // Use the header's bottom edge as minimum top so tooltip never overlaps the progress bar
        const header = document.querySelector("header");
        const headerBottom = header ? header.getBoundingClientRect().bottom : rect.bottom;
        setTooltipPos({
          top:   Math.max(rect.bottom + 10, headerBottom + 8),
          right: window.innerWidth - rect.right,
        });
      }
      return next;
    });
  }, []);

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const closeScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", closeScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", closeScroll);
    };
  }, [open]);

  return (
    <div
      ref={pillRef}
      className="hidden sm:flex flex-col items-end gap-0.5 relative"
      style={{ perspective: "600px" }}
    >
      {/* Level name row */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px]">{lvl.emoji}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-wide"
          style={{
            color: levelUp ? "#00D67A" : "#FFD60A",
            fontFamily: "var(--font-arcade)",
            transition: "color 0.4s",
            textShadow: levelUp ? "0 0 12px rgba(0,214,122,0.9)" : undefined,
          }}
        >
          {levelUp ? "⬆ NIVEL UP!" : lvl.name}
        </span>
      </div>

      {/* Mini XP bar */}
      <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "#1E3A5C" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${levelPct}%`,
            background: levelUp ? "#00D67A" : "#FFD60A",
          }}
        />
      </div>

      {/* Points pill — click → 3D flip + detail */}
      <div
        onClick={handleClick}
        className={flipping ? "pts-pill-flip" : ""}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          background: "linear-gradient(135deg,#FFD60A 0%,#FFA500 100%)",
          color: "#0A2540",
          padding: "3px 10px 3px 8px",
          borderRadius: "12px",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer",
          boxShadow: levelUp
            ? "0 0 20px rgba(0,214,122,0.7)"
            : "0 0 12px rgba(255,214,10,0.35)",
          border: "1px solid rgba(255,255,255,0.25)",
          userSelect: "none",
          transition: "transform 0.2s, box-shadow 0.2s",
          transformStyle: "preserve-3d",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.06)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(255,214,10,0.55)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "";
          (e.currentTarget as HTMLElement).style.boxShadow = levelUp
            ? "0 0 20px rgba(0,214,122,0.7)"
            : "0 0 12px rgba(255,214,10,0.35)";
        }}
      >
        <span>★</span>
        <span>{currentPoints} pts</span>
      </div>

      {/* Detail tooltip — fixed position to escape header stacking context */}
      {open && (
        <div
          className="pts-detail-show"
          style={{
            position: "fixed",
            top:   tooltipPos.top,
            right: tooltipPos.right,
            zIndex: 99999,
            background: "#061528",
            border: "2px solid #FFD60A",
            borderRadius: "10px",
            padding: "10px 14px",
            minWidth: "170px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 0 20px rgba(255,214,10,0.3)",
            transformOrigin: "top right",
          }}
        >
          {[
            ["RANGO",  lvl.name],
            ["NIVEL",  `LVL ${Math.floor(currentPoints / 100) + 1}`],
            ["PUNTOS", `${currentPoints} pts`],
            ["SORTEO", `${Math.max(1, Math.floor(currentPoints / 10))} entradas`],
          ].map(([label, val], i) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: i >= 2 ? "#FFD60A" : "#C9D6EC",
                fontWeight: i >= 2 ? 700 : 500,
                borderTop: i === 2 ? "1px solid #1E3A5C" : undefined,
                paddingTop: i === 2 ? "6px" : undefined,
                marginTop: i === 2 ? "6px" : "3px",
              }}
            >
              <span>{label}</span>
              <span>{val}</span>
            </div>
          ))}
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              color: "#647FA8",
              marginTop: "8px",
              borderTop: "1px solid #1E3A5C",
              paddingTop: "6px",
            }}
          >
            +50 pts cada 10 min · +30 avatar · +250 pts/día
          </p>
        </div>
      )}
    </div>
  );
}
