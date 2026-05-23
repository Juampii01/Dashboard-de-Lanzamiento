"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PointsHUDProps {
  points: number;
  levelName: string;
  levelEmoji: string;
  levelPct: number;
}

export function PointsHUD({ points, levelName, levelEmoji, levelPct }: PointsHUDProps) {
  const [flipping, setFlipping]   = useState(false);
  const [open, setOpen]           = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(() => {
    setFlipping(true);
    setTimeout(() => setFlipping(false), 780);
    setOpen((v) => !v);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={pillRef} className="hidden sm:flex flex-col items-end gap-0.5 relative" style={{ perspective: "600px" }}>
      {/* Level name row */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px]">{levelEmoji}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-wide"
          style={{ color: "#FFD60A", fontFamily: "var(--font-arcade)" }}
        >
          {levelName}
        </span>
      </div>

      {/* Mini XP bar */}
      <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "#1E3A5C" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${levelPct}%`, background: "#FFD60A" }}
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
          boxShadow: "0 0 12px rgba(255,214,10,0.35)",
          border: "1px solid rgba(255,255,255,0.25)",
          userSelect: "none",
          transition: "transform 0.2s,box-shadow 0.2s",
          transformStyle: "preserve-3d",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.06)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(255,214,10,0.55)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(255,214,10,0.35)";
        }}
      >
        <span style={{ transition: "transform 0.3s" }}>★</span>
        <span>{points} pts</span>
      </div>

      {/* Detail tooltip */}
      {open && (
        <div
          className="pts-detail-show absolute right-0 top-full mt-2 z-50"
          style={{
            background: "#061528",
            border: "2px solid #FFD60A",
            borderRadius: "10px",
            padding: "10px 14px",
            minWidth: "150px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 0 20px rgba(255,214,10,0.3)",
            transformOrigin: "top right",
          }}
        >
          {[
            ["RANGO",  levelName],
            ["NIVEL",  "LVL 1"],
            ["PUNTOS", `${points} pts`],
          ].map(([label, val], i) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: i === 2 ? "#FFD60A" : "#A8B5CC",
                fontWeight: i === 2 ? 700 : 500,
                borderTop: i === 2 ? "1px solid #1E3A5C" : undefined,
                paddingTop: i === 2 ? "6px" : undefined,
                marginTop: i === 2 ? "6px" : "3px",
              }}
            >
              <span>{label}</span>
              <span>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
