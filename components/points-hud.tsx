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

// Desglose: etiqueta + orden de presentación de cada origen de puntos.
const CATEGORY_LABEL: Record<string, string> = {
  time:     "⏱️ Tiempo en el dashboard",
  video:    "🎬 Videos",
  day:      "🚀 Días del challenge",
  mission:  "🎯 Misiones",
  streak:   "🔥 Racha diaria",
  referral: "🤝 Referidos",
  avatar:   "🕺 Avatar",
  quiz:     "🧠 Quizzes",
  call:     "📞 Llamadas en vivo",
  podcast:  "🎧 Podcast",
  ad:       "📺 Anuncios",
  other:    "✨ Otros",
};
const CATEGORY_ORDER = ["time", "video", "day", "mission", "streak", "referral", "avatar", "quiz", "call", "podcast", "ad", "other"];

interface Breakdown { total: number; tracked: number; by_category: Record<string, number>; }

export function PointsHUD({
  points: initialPoints,
}: PointsHUDProps) {
  const [flipping, setFlipping]         = useState(false);
  const [open, setOpen]                 = useState(false);
  const [currentPoints, setCurrentPoints] = useState(initialPoints);
  const [levelUp, setLevelUp]           = useState(false);
  const [tooltipPos, setTooltipPos]     = useState({ top: 0, right: 0 });
  const [breakdown, setBreakdown]       = useState<Breakdown | null>(null);
  const [bdLoading, setBdLoading]       = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const prevPointsRef = useRef(initialPoints);

  const fetchBreakdown = useCallback(async () => {
    setBdLoading(true);
    try {
      const r = await fetch("/api/xp/breakdown");
      const d = await r.json();
      if (d.ok) {
        setBreakdown({ total: d.total ?? 0, tracked: d.tracked ?? 0, by_category: d.by_category ?? {} });
      }
    } catch { /* noop */ }
    setBdLoading(false);
  }, []);

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
        fetchBreakdown();
      }
      return next;
    });
  }, [fetchBreakdown]);

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
      {open && (() => {
        const remainder = breakdown ? Math.max(0, breakdown.total - breakdown.tracked) : 0;
        const rows: [string, number][] = breakdown
          ? CATEGORY_ORDER
              .filter((k) => (breakdown.by_category[k] ?? 0) !== 0)
              .map((k) => [CATEGORY_LABEL[k] ?? k, breakdown.by_category[k]] as [string, number])
          : [];
        if (remainder > 0) rows.push([CATEGORY_LABEL.other, remainder]);
        const rowStyle: React.CSSProperties = {
          display: "flex", justifyContent: "space-between", gap: 14,
          fontFamily: "var(--font-mono)", fontSize: "10px", color: "#C9D6EC",
          fontWeight: 500, marginTop: "4px",
        };
        return (
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
              padding: "11px 14px",
              minWidth: "224px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 0 20px rgba(255,214,10,0.3)",
              transformOrigin: "top right",
            }}
          >
            {/* Total */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14,
              fontFamily: "var(--font-mono)", fontWeight: 700,
            }}>
              <span style={{ fontSize: "10px", color: "#647FA8", letterSpacing: "0.06em" }}>TUS PUNTOS</span>
              <span style={{ fontSize: "14px", color: "#FFD60A" }}>{currentPoints}</span>
            </div>

            {/* Desglose por origen */}
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: "9px", color: "#647FA8",
              letterSpacing: "0.1em", marginTop: "9px", marginBottom: "1px",
              borderTop: "1px solid #1E3A5C", paddingTop: "7px",
            }}>
              DE DÓNDE SALIERON
            </p>

            {bdLoading && rows.length === 0 ? (
              <p style={{ ...rowStyle, color: "#647FA8", justifyContent: "flex-start" }}>Cargando…</p>
            ) : rows.length > 0 ? (
              rows.map(([label, pts]) => (
                <div key={label} style={rowStyle}>
                  <span>{label}</span>
                  <span style={{ color: pts < 0 ? "#FF6B6B" : "#9FE9C2", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {pts > 0 ? `+${pts}` : pts}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "#647FA8", marginTop: "4px", lineHeight: 1.5 }}>
                Todavía no sumaste puntos. Quedate en el dashboard, mirá los videos y completá misiones para empezar a sumar.
              </p>
            )}

            {/* Sorteo */}
            <div style={{
              display: "flex", justifyContent: "space-between", gap: 14,
              fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, color: "#FFD60A",
              borderTop: "1px solid #1E3A5C", marginTop: "8px", paddingTop: "7px",
            }}>
              <span>🎟️ Entradas al sorteo</span>
              <span>{Math.max(1, Math.floor(currentPoints / 10))}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
