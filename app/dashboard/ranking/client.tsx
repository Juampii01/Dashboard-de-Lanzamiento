"use client";

import { useEffect, useState, useCallback } from "react";
import { FlagBanner } from "@/components/flag-banner";
import { getRank, rankProgress, RANKS } from "@/lib/ranks";

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
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

function rowBg(rank: number, isCurrentUser: boolean): string {
  if (isCurrentUser) return "rgba(255,214,10,0.07)";
  if (rank === 1)    return "rgba(255,214,10,0.12)";
  if (rank === 2)    return "rgba(192,192,192,0.08)";
  if (rank === 3)    return "rgba(205,127,50,0.08)";
  return "transparent";
}

// ─── RankBadge ───────────────────────────────────────────────────────────────
function RankBadge({ points }: { points: number }) {
  const r = getRank(points);
  return (
    <span style={{
      fontSize: "10px", fontWeight: 700,
      color: r.color,
      background: `color-mix(in srgb, ${r.color} 14%, transparent)`,
      border: `1px solid color-mix(in srgb, ${r.color} 40%, transparent)`,
      borderRadius: "5px", padding: "2px 7px",
      whiteSpace: "nowrap", fontFamily: "var(--font-mono)", flexShrink: 0,
    }}>{r.emoji} {r.short}</span>
  );
}

// ─── MyRankCard ──────────────────────────────────────────────────────────────
function MyRankCard({ points }: { points: number }) {
  const { rank, next, pointsToNext, pct } = rankProgress(points);
  return (
    <div style={{
      background: `radial-gradient(600px circle at 0% 0%, color-mix(in srgb, ${rank.color} 18%, transparent), transparent 60%), linear-gradient(135deg, rgba(20,58,107,0.85) 0%, rgba(10,37,64,0.92) 100%)`,
      border: `1px solid color-mix(in srgb, ${rank.color} 45%, transparent)`,
      borderRadius: "14px", padding: "18px 20px", marginBottom: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
            Tu rango
          </p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "30px", fontWeight: 800, color: rank.color, lineHeight: 1.1, textShadow: `0 0 18px color-mix(in srgb, ${rank.color} 50%, transparent)` }}>
            {rank.emoji} {rank.name}
          </p>
          <p style={{ fontSize: "13px", color: "#C8D6E8", marginTop: 2 }}>
            {points.toLocaleString()} pts
          </p>
          <p style={{ fontSize: "12.5px", color: "#C8D6E8", marginTop: 6 }}>
            🎁 Participando por: <strong style={{ color: rank.color }}>{rank.prize}</strong>
          </p>
        </div>
        {next && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)" }}>Próximo rango</p>
            <p style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "14px", color: next.color }}>{next.emoji} {next.name}</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${rank.color}, ${next?.color ?? rank.color})`, transition: "width .5s ease" }} />
        </div>
        <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
          {next
            ? <>Te faltan <strong style={{ color: "#fff" }}>{pointsToNext.toLocaleString()} pts</strong> para subir a <strong style={{ color: next.color }}>{next.name}</strong> y competir por <strong style={{ color: next.color }}>{next.prize}</strong>.</>
            : <>¡Estás en <strong style={{ color: rank.color }}>{rank.name}</strong>, el rango máximo! 🎉 Competís por el premio mayor.</>}
        </p>
      </div>
    </div>
  );
}

// ─── RankLeaderboard — tabla para un rango específico ─────────────────────────
function RankLeaderboard({
  rankKey,
  entries,
  loading,
  meEntry,
}: {
  rankKey: string;
  entries: LeaderEntry[];
  loading: boolean;
  meEntry: (LeaderEntry & { is_current_user: true }) | null;
}) {
  const rankDef = RANKS.find((r) => r.key === rankKey);
  if (!rankDef) return null;

  // Check if current user is in this rank table
  const meInThisRank = meEntry && getRank(meEntry.total_points).key === rankKey;
  const meInList = entries.some((e) => e.is_current_user);
  const showMeRow = meInThisRank && !meInList && meEntry;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(20,58,107,0.88) 0%, rgba(10,37,64,0.92) 100%)",
      border: `1px solid color-mix(in srgb, ${rankDef.color} 35%, #1E3A5C)`,
      borderRadius: "14px",
      overflow: "hidden",
      marginBottom: "20px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "12px 16px",
        borderBottom: `1px solid color-mix(in srgb, ${rankDef.color} 20%, transparent)`,
        background: `color-mix(in srgb, ${rankDef.color} 6%, transparent)`,
      }}>
        <span style={{ fontSize: "18px" }}>{rankDef.emoji}</span>
        <div style={{ flex: 1 }}>
          <span style={{
            fontFamily: "var(--font-arcade)", fontSize: "10px",
            fontWeight: 700, color: rankDef.color,
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            {rankDef.name}
          </span>
          <p style={{ fontSize: "11px", color: "#8DA2C4", margin: "1px 0 0" }}>
            🎁 {rankDef.prize}
          </p>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "10px",
          color: rankDef.color,
          background: `color-mix(in srgb, ${rankDef.color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${rankDef.color} 30%, transparent)`,
          borderRadius: "5px", padding: "2px 8px",
        }}>
          {rankDef.min.toLocaleString()}+ pts
        </span>
      </div>

      {/* Rows */}
      <div>
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px" }}>
            <div className="skeleton" style={{ width: "32px", height: "12px", borderRadius: "4px" }} />
            <div className="skeleton" style={{ flex: 1, height: "12px", borderRadius: "4px" }} />
            <div className="skeleton" style={{ width: "60px", height: "12px", borderRadius: "4px" }} />
          </div>
        ))}

        {!loading && entries.length === 0 && !showMeRow && (
          <p style={{ textAlign: "center", padding: "24px 16px", fontSize: "13px", color: "#8DA2C4" }}>
            Nadie en este rango todavía.
          </p>
        )}

        {!loading && entries.map((entry) => {
          const color = TOP_COLORS[entry.rank] ?? "#8DA2C4";
          const isTop3 = entry.rank <= 3;
          const bg = rowBg(entry.rank, entry.is_current_user);
          return (
            <div
              key={entry.rank}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 16px",
                background: bg,
                borderLeft: entry.is_current_user
                  ? "3px solid #FFD60A"
                  : isTop3
                  ? `3px solid ${color}30`
                  : "3px solid transparent",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                minHeight: "44px",
              }}
            >
              <span style={{
                width: "32px", textAlign: "center", flexShrink: 0,
                fontFamily: "var(--font-arcade)",
                fontSize: isTop3 ? "13px" : "10px",
                color,
                textShadow: isTop3 ? `0 0 10px ${color}90` : "none",
              }}>
                #{entry.rank}
              </span>
              <span style={{
                flex: 1, fontSize: "13px",
                color: entry.is_current_user ? "#FFD60A" : "#C8D6E8",
                fontWeight: entry.is_current_user ? 700 : 400,
                fontFamily: "var(--font-sans)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {entry.display_name}
                {entry.is_current_user && (
                  <span style={{ marginLeft: "8px", fontSize: "9px", opacity: 0.6 }}>(vos)</span>
                )}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "12px",
                fontWeight: 700,
                color: isTop3 ? color : "#C9D6EC",
              }}>
                {entry.total_points} pts
              </span>
            </div>
          );
        })}

        {/* Current user row if not in list but belongs to this rank */}
        {!loading && showMeRow && (
          <>
            {entries.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px", background: "rgba(0,0,0,0.2)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#647FA8", letterSpacing: "0.3em" }}>• • •</span>
              </div>
            )}
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "10px 16px",
              background: "rgba(255,214,10,0.07)",
              borderLeft: "3px solid #FFD60A",
              minHeight: "44px",
            }}>
              <span style={{ width: "32px", textAlign: "center", flexShrink: 0, fontFamily: "var(--font-arcade)", fontSize: "10px", color: "#8DA2C4" }}>
                #{meEntry.rank}
              </span>
              <span style={{ flex: 1, fontSize: "13px", fontWeight: 700, color: "#FFD60A", fontFamily: "var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {meEntry.display_name}
                <span style={{ marginLeft: "8px", fontSize: "9px", opacity: 0.6 }}>(vos)</span>
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: "#C9D6EC" }}>
                {meEntry.total_points} pts
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── RankingClient ────────────────────────────────────────────────────────────

export function RankingClient() {
  const [board, setBoard]     = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/leaderboard");
      const data = await res.json() as LeaderboardData;
      setBoard(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const top    = board?.top ?? [];
  const me     = board?.me ?? null;
  const myRank = board?.my_rank ?? null;
  const total  = board?.total ?? 0;
  const meEntry: (LeaderEntry & { is_current_user: true }) | null = me
    ? { ...me, rank: myRank ?? me.rank, is_current_user: true }
    : null;

  // Filter entries per rank (from highest to lowest)
  const rankOrder = ["expert", "legacy", "prime", "elevate"] as const;

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 16px" }}>

      {/* Page title */}
      <FlagBanner minHeight={170} priority contentStyle={{ padding: "26px 28px" }} className="gb-ranking-hero">
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px", fontWeight: 700,
          color: "#FFD700", textTransform: "uppercase",
          letterSpacing: "0.14em", marginBottom: "8px",
        }}>
          🏆 Rangos y Premios
        </p>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "28px", fontWeight: 800,
          color: "#ffffff", lineHeight: 1.15,
          marginBottom: "6px",
        }}>
          Subí de rango, ganá premios
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.78)", maxWidth: "52ch" }}>
          Acumulá puntos y subí de rango. <strong style={{ color: "#fff" }}>Cada rango compite por su propio premio</strong> — se <strong style={{ color: "#fff" }}>sortea</strong> al cierre del challenge.
        </p>
      </FlagBanner>
      <div style={{ height: "24px" }} />

      {/* Tu rango */}
      {!loading && <MyRankCard points={me?.total_points ?? 0} />}

      {/* Prize tiers */}
      <div style={{
        background: "rgba(10,37,64,0.8)",
        border: "1px solid #1E3A5C",
        borderRadius: "14px",
        overflow: "hidden",
        marginBottom: "28px",
      }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1E3A5C" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 800, color: "#FFD60A", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Premios del Challenge
          </span>
          <p style={{ fontSize: "12px", color: "#8DA2C4", marginTop: "3px" }}>
            Cada premio se sortea entre los del rango al cierre. Subí para competir por uno más grande. 🎲
          </p>
        </div>

        {/* Expert */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "rgba(0,214,122,0.06)", borderBottom: "1px solid rgba(0,214,122,0.12)" }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>🏆</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 700, color: "#00D67A", marginBottom: "2px" }}>
              🏆 GovBidder Expert · 15,000+ pts
            </p>
            <p style={{ fontSize: "13px", color: "#C8D6E8" }}>
              Servicio completo <strong style={{ color: "#FFFFFF" }}>«Te conseguimos tu contrato»</strong>
            </p>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 800, color: "#00D67A", background: "rgba(0,214,122,0.1)", border: "1px solid rgba(0,214,122,0.3)", borderRadius: "5px", padding: "4px 10px", whiteSpace: "nowrap" }}>$15,000 USD</span>
        </div>

        {/* Legacy */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "rgba(255,214,10,0.04)", borderBottom: "1px solid rgba(255,214,10,0.1)" }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>👑</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 700, color: "#FFD700", marginBottom: "2px" }}>
              👑 GovBidder Legacy · 10,000–14,999 pts
            </p>
            <p style={{ fontSize: "13px", color: "#C8D6E8" }}>
              Cupón de <strong style={{ color: "#FFFFFF" }}>$1,000 USD</strong> para productos GovBidder
            </p>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 800, color: "#FFD700", background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: "5px", padding: "4px 10px", whiteSpace: "nowrap" }}>$1,000 USD</span>
        </div>

        {/* Prime */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "rgba(192,192,192,0.04)", borderBottom: "1px solid rgba(192,192,192,0.1)" }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 700, color: "#C0C0C0", marginBottom: "2px" }}>
              ⚡ GovBidder Prime · 5,000–9,999 pts
            </p>
            <p style={{ fontSize: "13px", color: "#C8D6E8" }}>
              Consultoría 1:1 de 1 hora con <strong style={{ color: "#FFFFFF" }}>Santo</strong>
            </p>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 800, color: "#C0C0C0", background: "rgba(192,192,192,0.08)", border: "1px solid rgba(192,192,192,0.25)", borderRadius: "5px", padding: "4px 10px", whiteSpace: "nowrap" }}>1 hora 1:1</span>
        </div>

        {/* Elevate */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px" }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>🔥</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 700, color: "#CD7F32", marginBottom: "2px" }}>
              🔥 GovBidder Elevate · 0–4,999 pts
            </p>
            <p style={{ fontSize: "13px", color: "#C8D6E8" }}>
              <strong style={{ color: "#FFFFFF" }}>10 auditorías</strong> con el Team GovBidder
            </p>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 800, color: "#CD7F32", background: "rgba(205,127,50,0.08)", border: "1px solid rgba(205,127,50,0.25)", borderRadius: "5px", padding: "4px 10px", whiteSpace: "nowrap" }}>10 lugares</span>
        </div>
      </div>

      {/* 4 leaderboards separados por rango */}
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 800, color: "#8DA2C4", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "14px" }}>
        Tablas de líderes por rango
      </p>

      {rankOrder.map((key) => {
        const rankEntries = top.filter((e) => getRank(e.total_points).key === key);
        return (
          <RankLeaderboard
            key={key}
            rankKey={key}
            entries={rankEntries}
            loading={loading}
            meEntry={meEntry}
          />
        );
      })}

      {/* Footer */}
      {!loading && (
        <p style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "9px", color: "#647FA8", marginTop: 8 }}>
          {total > 0 ? `${total} participante${total !== 1 ? "s" : ""} · ` : ""}
          Al cierre del challenge los premios se sortean — más rango, más chances
        </p>
      )}
    </div>
  );
}
