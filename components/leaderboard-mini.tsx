"use client";

/**
 * LeaderboardMini
 * Versión compacta del leaderboard para el sidebar.
 * Muestra top 5 y, si el usuario no está entre ellos,
 * un separador "···" + su posición real debajo.
 */

import { useCallback, useEffect, useState } from "react";

interface LeaderEntry {
  rank: number;
  display_name: string;
  total_points: number;
  raffle_entries: number;
  is_current_user: boolean;
}

interface LeaderboardData {
  top: LeaderEntry[];
  me: Omit<LeaderEntry, "is_current_user"> | null;
  my_rank: number | null;
  in_top: boolean;
  total: number;
}

const RANK_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

export function LeaderboardMini() {
  const [board, setBoard] = useState<LeaderboardData | null>(null);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/leaderboard");
      const data = await res.json() as LeaderboardData;
      setBoard(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const top    = board?.top.slice(0, 5) ?? [];
  const me     = board?.me ?? null;
  const inTop  = board?.in_top ?? true;
  const myRank = board?.my_rank ?? null;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-arcade)",
            fontSize: "8px",
            fontWeight: 700,
            color: "#8DA2C4",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
          }}
        >
          🏆 Leaderboard
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "7px",
            fontWeight: 700,
            color: "#00D67A",
            background: "rgba(0,214,122,0.1)",
            border: "1px solid rgba(0,214,122,0.2)",
            borderRadius: "10px",
            padding: "1px 6px",
            letterSpacing: "0.08em",
          }}
        >
          EN VIVO
        </span>
      </div>

      {/* Top 5 rows */}
      {top.map((entry) => {
        const rankColor = RANK_COLORS[entry.rank] ?? "#8DA2C4";
        return (
          <div
            key={entry.rank}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderLeft: entry.is_current_user ? "3px solid #FFD60A" : "3px solid transparent",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
              background: entry.is_current_user ? "rgba(255,214,10,0.05)" : undefined,
            }}
          >
            <span
              style={{
                width: "22px",
                fontFamily: "var(--font-arcade)",
                fontSize: "9px",
                fontWeight: 700,
                textAlign: "center",
                flexShrink: 0,
                color: rankColor,
                textShadow: entry.rank <= 3 ? `0 0 6px ${rankColor}80` : "none",
              }}
            >
              #{entry.rank}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: "11px",
                color: entry.is_current_user ? "#FFD60A" : "#C8D6E8",
                fontWeight: entry.is_current_user ? 700 : 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {entry.display_name}
              {entry.is_current_user && (
                <span style={{ fontSize: "8px", opacity: 0.6, marginLeft: "3px" }}>(tú)</span>
              )}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                fontWeight: 700,
                color: entry.is_current_user
                  ? "#FFD60A"
                  : entry.rank <= 3
                  ? rankColor
                  : "#C9D6EC",
                flexShrink: 0,
              }}
            >
              {entry.total_points}
            </span>
          </div>
        );
      })}

      {/* Si el usuario no está en el top 5: separador + su fila */}
      {!inTop && me && myRank && (
        <>
          {/* Separador "···" */}
          <div
            style={{
              position: "relative",
              height: "1px",
              background: "#1E3A5C",
              margin: "4px 14px",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "#0A2540",
                padding: "0 6px",
                fontSize: "10px",
                color: "#8DA2C4",
                letterSpacing: "3px",
              }}
            >
              ···
            </span>
          </div>

          {/* Fila del usuario */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderLeft: "3px solid #FFD60A",
              background: "rgba(255,214,10,0.05)",
            }}
          >
            <span
              style={{
                width: "22px",
                fontFamily: "var(--font-arcade)",
                fontSize: "9px",
                fontWeight: 700,
                textAlign: "center",
                flexShrink: 0,
                color: "#FFD60A",
              }}
            >
              #{myRank}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: "11px",
                color: "#FFD60A",
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {me.display_name}{" "}
              <span style={{ fontSize: "8px", opacity: 0.6 }}>(tú)</span>
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                fontWeight: 700,
                color: "#FFD60A",
                flexShrink: 0,
              }}
            >
              {me.total_points}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
