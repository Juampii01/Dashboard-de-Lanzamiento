"use client";

import { useEffect, useState, useCallback } from "react";
import { FlagBanner } from "@/components/flag-banner";
import { getRank, rankProgress, RANKS } from "@/lib/ranks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FullEntry {
  rank: number;            // posición global (no se usa para mostrar)
  display_name: string;
  total_points: number;
  is_current_user: boolean;
}

interface FullData {
  all: FullEntry[];
  my_global_rank: number | null;
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOP_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

const MAX_PER_RANK = 20;
const RANK_ORDER = ["expert", "legacy", "prime", "elevate"] as const;

// ─── PositionBadge — número de posición a la izquierda, bien legible ──────────
function PositionBadge({ position }: { position: number }) {
  const medal = TOP_COLORS[position];
  if (medal) {
    return (
      <span style={{
        width: 28, height: 28, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: "50%",
        background: `color-mix(in srgb, ${medal} 20%, transparent)`,
        border: `1.5px solid ${medal}`,
        color: medal, fontFamily: "var(--font-arcade)", fontSize: 12, fontWeight: 800,
        textShadow: `0 0 8px ${medal}90`,
      }}>{position}</span>
    );
  }
  return (
    <span style={{
      width: 28, height: 28, flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800,
      color: "#D6E2F5",
    }}>{position}</span>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────────
function LeaderRow({
  position, name, points, isCurrentUser,
}: { position: number; name: string; points: number; isCurrentUser: boolean }) {
  const medal = TOP_COLORS[position];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px",
      background: isCurrentUser ? "rgba(255,214,10,0.10)" : "transparent",
      borderLeft: isCurrentUser ? "3px solid #FFD60A" : "3px solid transparent",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      minHeight: 42,
    }}>
      <PositionBadge position={position} />
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 12.5,
        color: isCurrentUser ? "#FFD60A" : "#C8D6E8",
        fontWeight: isCurrentUser ? 700 : 500,
        fontFamily: "var(--font-sans)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {name}
        {isCurrentUser && <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.6 }}>(vos)</span>}
      </span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
        color: medal ?? "#9FB4D4", flexShrink: 0,
      }}>
        {points.toLocaleString()}
      </span>
    </div>
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

// ─── RankColumn — una tabla por rango (top 20 + fila propia si está más abajo) ─
function RankColumn({ rankKey, all, loading }: { rankKey: string; all: FullEntry[]; loading: boolean }) {
  const rankDef = RANKS.find((r) => r.key === rankKey);
  if (!rankDef) return null;

  // `all` viene ordenado por puntos desc → el bucket también lo está.
  const bucket = all.filter((e) => getRank(e.total_points).key === rankKey);
  const top = bucket.slice(0, MAX_PER_RANK);
  const meIdx = bucket.findIndex((e) => e.is_current_user);
  const showMeRow = meIdx >= MAX_PER_RANK;          // está en el rango pero fuera del top 20
  const meEntry = showMeRow ? bucket[meIdx] : null;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(20,58,107,0.88) 0%, rgba(10,37,64,0.92) 100%)",
      border: `1px solid color-mix(in srgb, ${rankDef.color} 35%, #1E3A5C)`,
      borderRadius: "12px",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px",
        borderBottom: `1px solid color-mix(in srgb, ${rankDef.color} 22%, transparent)`,
        background: `color-mix(in srgb, ${rankDef.color} 8%, transparent)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 16 }}>{rankDef.emoji}</span>
          <span style={{
            fontFamily: "var(--font-arcade)", fontSize: 10, fontWeight: 700,
            color: rankDef.color, textTransform: "uppercase", letterSpacing: "0.06em",
          }}>{rankDef.short}</span>
        </div>
        <p style={{ fontSize: 10.5, color: "#8DA2C4", margin: "4px 0 0", lineHeight: 1.3 }}>
          {rankDef.min.toLocaleString()}{rankDef.max === Infinity ? "+" : `–${(rankDef.max - 1).toLocaleString()}`} pts
        </p>
        <p style={{ fontSize: 10.5, color: rankDef.color, margin: "2px 0 0", lineHeight: 1.3, opacity: 0.9 }}>
          🎁 {rankDef.prize}
        </p>
      </div>

      {/* Rows */}
      <div style={{ flex: 1 }}>
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
            <div className="skeleton" style={{ width: 28, height: 12, borderRadius: 4 }} />
            <div className="skeleton" style={{ flex: 1, height: 12, borderRadius: 4 }} />
          </div>
        ))}

        {!loading && top.length === 0 && !showMeRow && (
          <p style={{ textAlign: "center", padding: "20px 12px", fontSize: 12, color: "#8DA2C4" }}>
            Nadie en este rango todavía.
          </p>
        )}

        {!loading && top.map((entry, idx) => (
          <LeaderRow
            key={idx}
            position={idx + 1}
            name={entry.display_name}
            points={entry.total_points}
            isCurrentUser={entry.is_current_user}
          />
        ))}

        {/* Fila propia cuando el usuario está fuera del top 20 de su rango */}
        {!loading && showMeRow && meEntry && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px", background: "rgba(0,0,0,0.22)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#647FA8", letterSpacing: "0.3em" }}>• • •</span>
            </div>
            <LeaderRow
              position={meIdx + 1}
              name={meEntry.display_name}
              points={meEntry.total_points}
              isCurrentUser
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── RankingClient ────────────────────────────────────────────────────────────

export function RankingClient() {
  const [board, setBoard]     = useState<FullData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/leaderboard/ranks");
      const data = await res.json() as FullData;
      setBoard(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const all   = board?.all ?? [];
  const total = board?.total ?? 0;
  const me    = all.find((e) => e.is_current_user) ?? null;

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px 16px" }}>

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
              Servicio <strong style={{ color: "#FFFFFF" }}>Done For You</strong> — lo hacemos por vos
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

      {/* Tablas de líderes — 4 columnas, una por rango */}
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 800, color: "#8DA2C4", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "14px" }}>
        Tablas de líderes por rango · top {MAX_PER_RANK} por rango
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 12,
        alignItems: "start",
      }}>
        {RANK_ORDER.map((key) => (
          <RankColumn key={key} rankKey={key} all={all} loading={loading} />
        ))}
      </div>

      {/* Footer */}
      {!loading && (
        <p style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "9px", color: "#647FA8", marginTop: 16 }}>
          {total > 0 ? `${total} participante${total !== 1 ? "s" : ""} · ` : ""}
          Al cierre del challenge los premios se sortean — más rango, más chances
        </p>
      )}
    </div>
  );
}
