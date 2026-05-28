"use client";

import { useEffect, useState, useCallback } from "react";
import { createParticleBurst } from "@/lib/wow-effects";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderEntry {
  rank: number;
  display_name: string;
  total_points: number;
  raffle_entries: number;
  is_current_user: boolean;
}

interface LeaderboardData {
  top:     LeaderEntry[];
  me:      Omit<LeaderEntry, "is_current_user"> | null;
  my_rank: number | null;
  in_top:  boolean;
  total:   number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOP_COLORS: Record<number, string> = {
  1: "#FFD700",  // gold
  2: "#C0C0C0",  // silver
  3: "#CD7F32",  // bronze
};

// ─── RankBadge ───────────────────────────────────────────────────────────────

function RankBadge({ rank, small = false }: { rank: number; small?: boolean }) {
  const color = TOP_COLORS[rank] ?? "#5A6B85";
  const isTop3 = rank <= 3;

  return (
    <span
      className="w-8 text-center shrink-0 tabular-nums"
      style={{
        fontFamily: "var(--font-arcade)",
        fontSize: small ? "9px" : isTop3 ? "12px" : "9px",
        color,
        textShadow: isTop3
          ? `0 0 8px ${color}80, 0 0 2px ${color}`
          : "none",
        letterSpacing: isTop3 ? "0.02em" : "0.04em",
      }}
    >
      #{rank}
    </span>
  );
}

// ─── LeaderRow ────────────────────────────────────────────────────────────────

function LeaderRow({
  rank,
  display_name,
  total_points,
  raffle_entries,
  is_current_user,
  onClick,
}: LeaderEntry & { onClick?: (e: React.MouseEvent) => void }) {
  const isTop3 = rank <= 3;
  const rankColor = TOP_COLORS[rank] ?? "#5A6B85";
  const ptColor   = isTop3 ? rankColor : "#A8B5CC";

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-5 py-2.5 transition-all duration-200"
      style={{
        background:   is_current_user ? "rgba(255,214,10,0.07)" : undefined,
        cursor:       is_current_user ? "pointer" : "default",
        borderLeft:   is_current_user ? "3px solid #FFD60A" : "3px solid transparent",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <RankBadge rank={rank} />

      <span
        className="flex-1 text-sm truncate"
        style={{
          color:      is_current_user ? "#FFD60A" : "#C8D6E8",
          fontWeight: is_current_user ? 700 : 400,
          fontFamily: "var(--font-sans)",
        }}
      >
        {display_name}
        {is_current_user && (
          <span className="ml-2 text-[9px] opacity-60">(vos)</span>
        )}
      </span>

      <div className="text-right shrink-0">
        <p
          className="text-xs font-bold tabular-nums"
          style={{ color: ptColor, fontFamily: "var(--font-mono)" }}
        >
          {total_points} pts
        </p>
        <p className="text-[9px]" style={{ color: "#3A5070", fontFamily: "var(--font-mono)" }}>
          {raffle_entries} entr.
        </p>
      </div>
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export function Leaderboard() {
  const [board, setBoard]     = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/leaderboard");
      const data = await res.json() as LeaderboardData;
      setBoard(data);
    } catch {
      // silent — non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // A7 fix: no re-fetch on xp-gained (60 s poll is enough for ranking)

  const handleRowClick = (e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    createParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, "gold", 10);
  };

  const top   = board?.top ?? [];
  const me    = board?.me ?? null;
  const inTop = board?.in_top ?? true;
  const myRank = board?.my_rank ?? null;
  const total = board?.total ?? 0;

  // Build "me" as a full LeaderEntry for the out-of-top row
  const meEntry: LeaderEntry | null = me
    ? { ...me, rank: me.rank, is_current_user: true }
    : null;

  const isEmpty = !loading && top.length === 0;

  return (
    <div
      data-tour-id="leaderboard"
      className="rounded-xl border overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(20,58,107,0.88) 0%, rgba(10,37,64,0.92) 100%)",
        borderColor: "rgba(255,214,10,0.2)",
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
          {total > 0 && (
            <span
              className="text-[9px]"
              style={{ color: "#3A5070", fontFamily: "var(--font-mono)" }}
            >
              {total} participante{total !== 1 ? "s" : ""}
            </span>
          )}
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
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>

        {/* Loading skeletons */}
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className="skeleton w-8 h-3 rounded" />
              <div className="skeleton flex-1 h-3 rounded" />
              <div className="skeleton w-12 h-3 rounded" />
            </div>
          ))
        }

        {/* Empty state */}
        {isEmpty && (
          <p className="text-center py-8 text-sm" style={{ color: "#5A6B85" }}>
            Aún no hay participantes. ¡Sé el primero!
          </p>
        )}

        {/* Top 20 */}
        {!loading && top.map((entry) => (
          <LeaderRow
            key={entry.rank}
            {...entry}
            onClick={entry.is_current_user ? handleRowClick : undefined}
          />
        ))}

        {/* Divider + user row when outside top 20 */}
        {!loading && !inTop && meEntry && (
          <>
            {/* Divider — dots separator, no text */}
            <div
              className="flex items-center justify-center py-2"
              style={{ background: "rgba(0,0,0,0.2)" }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "#3A5070",
                  letterSpacing: "0.3em",
                }}
              >
                • • •
              </span>
            </div>

            {/* User's real position */}
            <LeaderRow {...meEntry} onClick={handleRowClick} />
          </>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-2.5 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        {!loading && !inTop && myRank && (
          <p className="text-[9px] mb-1" style={{ color: "#5A6B85", fontFamily: "var(--font-mono)" }}>
            Tu posición actual: #{myRank} de {total}
          </p>
        )}
        <p className="text-[9px]" style={{ color: "#3A5070", fontFamily: "var(--font-mono)" }}>
          Cada 10 pts = 1 entrada al sorteo · Se actualiza cada 60s
        </p>
      </div>
    </div>
  );
}
