"use client";

import { useEffect, useState, useCallback } from "react";
import { FlagBanner } from "@/components/flag-banner";

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
  if (rank >= 3 && rank <= 12) return "rgba(0,214,122,0.06)";
  return "transparent";
}

// ─── PrizeBadge ──────────────────────────────────────────────────────────────

function PrizeBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span style={{
        fontSize: "10px", fontWeight: 700,
        color: "#FFD60A",
        background: "rgba(255,214,10,0.15)",
        border: "1px solid rgba(255,214,10,0.4)",
        borderRadius: "5px", padding: "2px 7px",
        whiteSpace: "nowrap", fontFamily: "var(--font-mono)", flexShrink: 0,
      }}>🥇 Servicio $15K</span>
    );
  }
  if (rank === 2) {
    return (
      <span style={{
        fontSize: "10px", fontWeight: 700,
        color: "#C0C0C0",
        background: "rgba(192,192,192,0.1)",
        border: "1px solid rgba(192,192,192,0.3)",
        borderRadius: "5px", padding: "2px 7px",
        whiteSpace: "nowrap", fontFamily: "var(--font-mono)", flexShrink: 0,
      }}>🥈 1h con Santo</span>
    );
  }
  if (rank >= 3 && rank <= 12) {
    return (
      <span style={{
        fontSize: "10px", fontWeight: 700,
        color: "#00D67A",
        background: "rgba(0,214,122,0.08)",
        border: "1px solid rgba(0,214,122,0.25)",
        borderRadius: "5px", padding: "2px 7px",
        whiteSpace: "nowrap", fontFamily: "var(--font-mono)", flexShrink: 0,
      }}>🏆 Auditoría 1:1</span>
    );
  }
  return null;
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
  const inTop  = board?.in_top ?? true;
  const myRank = board?.my_rank ?? null;
  const total  = board?.total ?? 0;
  const meEntry: LeaderEntry | null = me ? { ...me, rank: me.rank, is_current_user: true } : null;

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 16px" }}>

      {/* Page title — banner celebratorio con la bandera de marca */}
      <FlagBanner minHeight={170} priority contentStyle={{ padding: "26px 28px" }} className="gb-ranking-hero">
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px", fontWeight: 700,
          color: "#FFD700", textTransform: "uppercase",
          letterSpacing: "0.14em", marginBottom: "8px",
        }}>
          🏆 Ranking Final
        </p>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "28px", fontWeight: 800,
          color: "#ffffff", lineHeight: 1.15,
          marginBottom: "6px",
        }}>
          Premios y Posiciones
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.78)", maxWidth: "48ch" }}>
          Los mejores ranqueados al cierre del challenge ganan premios reales.
        </p>
      </FlagBanner>
      <div style={{ height: "24px" }} />

      {/* Prize tiers */}
      <div style={{
        background: "rgba(10,37,64,0.8)",
        border: "1px solid #1E3A5C",
        borderRadius: "14px",
        overflow: "hidden",
        marginBottom: "24px",
      }}>
        <div style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1E3A5C",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ fontFamily: "var(--font-arcade)", fontSize: "9px", fontWeight: 700, color: "#FFD60A", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Premios del Challenge
          </span>
        </div>

        {/* 1st place */}
        <div style={{
          display: "flex", alignItems: "center", gap: "14px",
          padding: "14px 16px",
          background: "rgba(255,214,10,0.06)",
          borderBottom: "1px solid rgba(255,214,10,0.12)",
        }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>🥇</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 700, color: "#FFD60A", marginBottom: "2px" }}>
              1er lugar
            </p>
            <p style={{ fontSize: "13px", color: "#C8D6E8" }}>
              Servicio completo <strong style={{ color: "#FFFFFF" }}>«Te conseguimos tu contrato»</strong>
            </p>
          </div>
          <span style={{
            fontFamily: "var(--font-arcade)", fontSize: "9px", fontWeight: 700,
            color: "#FFD60A", background: "rgba(255,214,10,0.12)",
            border: "1px solid rgba(255,214,10,0.3)",
            borderRadius: "5px", padding: "4px 10px", whiteSpace: "nowrap",
          }}>$15,000 USD</span>
        </div>

        {/* 2nd place */}
        <div style={{
          display: "flex", alignItems: "center", gap: "14px",
          padding: "14px 16px",
          background: "rgba(192,192,192,0.04)",
          borderBottom: "1px solid rgba(192,192,192,0.1)",
        }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>🥈</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 700, color: "#C0C0C0", marginBottom: "2px" }}>
              2do lugar
            </p>
            <p style={{ fontSize: "13px", color: "#C8D6E8" }}>
              Consultoría 1:1 de 1 hora con <strong style={{ color: "#FFFFFF" }}>Santo</strong> — el roadmap exacto para venderle al gobierno
            </p>
          </div>
          <span style={{
            fontFamily: "var(--font-arcade)", fontSize: "9px", fontWeight: 700,
            color: "#C0C0C0", background: "rgba(192,192,192,0.08)",
            border: "1px solid rgba(192,192,192,0.25)",
            borderRadius: "5px", padding: "4px 10px", whiteSpace: "nowrap",
          }}>1 hora 1:1</span>
        </div>

        {/* 3rd–12th place */}
        <div style={{
          display: "flex", alignItems: "center", gap: "14px",
          padding: "14px 16px",
          background: "rgba(0,214,122,0.03)",
        }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>🏆</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 700, color: "#00D67A", marginBottom: "2px" }}>
              3ro al 12vo lugar
            </p>
            <p style={{ fontSize: "13px", color: "#C8D6E8" }}>
              Auditoría con el <strong style={{ color: "#FFFFFF" }}>Team Govbidder</strong> — el roadmap exacto para venderle al gobierno
            </p>
          </div>
          <span style={{
            fontFamily: "var(--font-arcade)", fontSize: "9px", fontWeight: 700,
            color: "#00D67A", background: "rgba(0,214,122,0.08)",
            border: "1px solid rgba(0,214,122,0.2)",
            borderRadius: "5px", padding: "4px 10px", whiteSpace: "nowrap",
          }}>10 lugares</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{
        background: "linear-gradient(135deg, rgba(20,58,107,0.88) 0%, rgba(10,37,64,0.92) 100%)",
        border: "1px solid rgba(255,214,10,0.2)",
        borderRadius: "14px",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,214,10,0.12)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>🏆</span>
            <span style={{
              fontFamily: "var(--font-arcade)", fontSize: "10px",
              fontWeight: 700, color: "#FFD60A",
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              Tabla de líderes
            </span>
            {total > 0 && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#647FA8" }}>
                {total} participante{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Rows */}
        <div>
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px" }}>
              <div className="skeleton" style={{ width: "32px", height: "12px", borderRadius: "4px" }} />
              <div className="skeleton" style={{ flex: 1, height: "12px", borderRadius: "4px" }} />
              <div className="skeleton" style={{ width: "60px", height: "12px", borderRadius: "4px" }} />
            </div>
          ))}

          {!loading && top.length === 0 && (
            <p style={{ textAlign: "center", padding: "32px 16px", fontSize: "14px", color: "#8DA2C4" }}>
              Aún no hay participantes. ¡Sé el primero!
            </p>
          )}

          {!loading && top.map((entry) => {
            const color  = TOP_COLORS[entry.rank] ?? "#8DA2C4";
            const isTop3 = entry.rank <= 3;
            const bg     = rowBg(entry.rank, entry.is_current_user);
            return (
              <div
                key={entry.rank}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 16px",
                  background: bg,
                  borderLeft: entry.is_current_user
                    ? "3px solid #FFD60A"
                    : entry.rank <= 12
                    ? `3px solid ${color}30`
                    : "3px solid transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  minHeight: "44px",
                }}
              >
                {/* Rank */}
                <span style={{
                  width: "32px", textAlign: "center", flexShrink: 0,
                  fontFamily: "var(--font-arcade)",
                  fontSize: isTop3 ? "13px" : "10px",
                  color,
                  textShadow: isTop3 ? `0 0 10px ${color}90` : "none",
                }}>
                  #{entry.rank}
                </span>

                {/* Name */}
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

                {/* Prize badge + points */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <PrizeBadge rank={entry.rank} />
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "12px",
                    fontWeight: 700,
                    color: isTop3 ? color : "#C9D6EC",
                  }}>
                    {entry.total_points} pts
                  </span>
                </div>
              </div>
            );
          })}

          {/* Divider + user row if outside visible list */}
          {!loading && !inTop && meEntry && (
            <>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "8px", background: "rgba(0,0,0,0.2)",
              }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#647FA8", letterSpacing: "0.3em" }}>
                  • • •
                </span>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 16px",
                background: "rgba(255,214,10,0.07)",
                borderLeft: "3px solid #FFD60A",
                minHeight: "44px",
              }}>
                <span style={{
                  width: "32px", textAlign: "center", flexShrink: 0,
                  fontFamily: "var(--font-arcade)", fontSize: "10px", color: "#8DA2C4",
                }}>
                  #{meEntry.rank}
                </span>
                <span style={{
                  flex: 1, fontSize: "13px", fontWeight: 700,
                  color: "#FFD60A", fontFamily: "var(--font-sans)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {meEntry.display_name}
                  <span style={{ marginLeft: "8px", fontSize: "9px", opacity: 0.6 }}>(vos)</span>
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "12px",
                  fontWeight: 700, color: "#C9D6EC",
                }}>
                  {meEntry.total_points} pts
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 16px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          textAlign: "center",
        }}>
          {!loading && !inTop && myRank && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#8DA2C4", marginBottom: "3px" }}>
              Tu posición actual: #{myRank} de {total}
            </p>
          )}
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#647FA8" }}>
            Los mejores ranqueados al final del challenge ganan premios reales
          </p>
        </div>
      </div>
    </div>
  );
}
