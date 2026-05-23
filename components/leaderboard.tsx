"use client";

import { useEffect, useState, useCallback } from "react";
import { createParticleBurst } from "@/lib/wow-effects";

interface LeaderEntry {
  rank: number;
  display_name: string;
  total_points: number;
  raffle_entries: number;
  is_current_user: boolean;
}

const RANK_COLORS = ["#FFD60A", "#C0C0C0", "#CD7F32"] as const;
const RANK_EMOJI  = ["🥇", "🥈", "🥉"] as const;

export function Leaderboard() {
  const [entries, setEntries]   = useState<LeaderEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(0);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/leaderboard");
      const data = await res.json() as { top: LeaderEntry[] };
      setEntries(data.top ?? []);
    } catch {
      // silent — non-critical
    } finally {
      setLoading(false);
      setLastRefresh(Date.now());
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // refresh every minute
    return () => clearInterval(t);
  }, [load]);

  // Update leaderboard when XP is earned
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("xp-gained", handler);
    return () => window.removeEventListener("xp-gained", handler);
  }, [load]);

  const handleRowClick = (e: React.MouseEvent, entry: LeaderEntry) => {
    if (!entry.is_current_user) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    createParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, "gold", 10);
  };

  return (
    <div
      data-tour-id="leaderboard"
      className="rounded-xl border overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(20,58,107,0.5) 0%, rgba(10,37,64,0.7) 100%)",
        borderColor: "rgba(255,214,10,0.2)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,214,10,0.12)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🏆</span>
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#FFD60A", fontFamily: "var(--font-arcade)" }}
          >
            Tabla de líderes
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full bg-[#00D67A] animate-pulse inline-block"
            style={{ verticalAlign: "middle" }}
          />
          <span className="text-[9px]" style={{ color: "#5A6B85", fontFamily: "var(--font-mono)" }}>
            EN VIVO
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className="skeleton w-5 h-3 rounded" />
              <div className="skeleton flex-1 h-3 rounded" />
              <div className="skeleton w-12 h-3 rounded" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: "#5A6B85" }}>
            Aún no hay participantes. ¡Sé el primero!
          </p>
        ) : (
          entries.map((entry) => {
            const isTop3 = entry.rank <= 3;
            const rankColor = isTop3 ? RANK_COLORS[entry.rank - 1] : "#5A6B85";
            return (
              <div
                key={entry.rank}
                onClick={(e) => handleRowClick(e, entry)}
                className="flex items-center gap-3 px-5 py-2.5 transition-all duration-200"
                style={{
                  background: entry.is_current_user
                    ? "rgba(255,214,10,0.07)"
                    : undefined,
                  cursor: entry.is_current_user ? "pointer" : "default",
                  borderLeft: entry.is_current_user
                    ? "3px solid #FFD60A"
                    : "3px solid transparent",
                }}
              >
                {/* Rank */}
                <span
                  className="w-7 text-center shrink-0"
                  style={{
                    fontFamily: "var(--font-arcade)",
                    fontSize: isTop3 ? "14px" : "9px",
                    color: rankColor,
                  }}
                >
                  {isTop3 ? RANK_EMOJI[entry.rank - 1] : `#${entry.rank}`}
                </span>

                {/* Name */}
                <span
                  className="flex-1 text-sm truncate"
                  style={{
                    color: entry.is_current_user ? "#FFD60A" : "#C8D6E8",
                    fontWeight: entry.is_current_user ? 700 : 400,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {entry.display_name}
                  {entry.is_current_user && (
                    <span className="ml-2 text-[9px] opacity-60">(vos)</span>
                  )}
                </span>

                {/* Points + entries */}
                <div className="text-right shrink-0">
                  <p
                    className="text-xs font-bold tabular-nums"
                    style={{ color: isTop3 ? rankColor : "#A8B5CC", fontFamily: "var(--font-mono)" }}
                  >
                    {entry.total_points} pts
                  </p>
                  <p className="text-[9px]" style={{ color: "#3A5070", fontFamily: "var(--font-mono)" }}>
                    {entry.raffle_entries} entr.
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-2.5 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <p className="text-[9px]" style={{ color: "#3A5070", fontFamily: "var(--font-mono)" }}>
          Cada 10 pts = 1 entrada al sorteo · Se actualiza cada 60s
        </p>
      </div>
    </div>
  );
}
