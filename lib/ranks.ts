/**
 * Rangos del challenge. Subes de rango acumulando puntos; al cierre el premio
 * se SORTEA (ponderado: más puntos/rango = más chances).
 */
export interface Rank {
  key: "elevate" | "prime" | "legacy" | "expert";
  name: string;
  short: string;
  min: number;
  max: number;
  color: string;
  emoji: string;
  /** Premio que recibe CADA ganador (texto corto). */
  prize: string;
  /** Detalle del premio para la página de rangos. */
  prizeDetail: string;
  /** Cuántos ganadores se sortean en el rango (lo usa también el admin del sorteo). */
  winners: number;
}

// Premios del lanzamiento de noviembre 2026 (llamada con Santo del 31/10).
// Cada ganador recibe UN premio; "winners" es cuántos ganadores hay por rango.
export const RANKS: Rank[] = [
  {
    key: "elevate", name: "GovBidder Elevate", short: "Elevate", min: 0, max: 5000,
    color: "#CD7F32", emoji: "🔥", winners: 10,
    prize: "Auditoría con el Team GovBidder",
    prizeDetail: "Una auditoría de tu empresa con el Team GovBidder.",
  },
  {
    key: "prime", name: "GovBidder Prime", short: "Prime", min: 5000, max: 10000,
    color: "#C0C0C0", emoji: "⚡", winners: 1,
    prize: "US$500 para herramientas o servicios GovBidder",
    prizeDetail: "Cupón de US$500 para usar en herramientas o servicios de GovBidder (por ejemplo, meses de GovBidder Connect o la creación de tu LLC).",
  },
  {
    key: "legacy", name: "GovBidder Legacy", short: "Legacy", min: 10000, max: 15000,
    color: "#FFD700", emoji: "👑", winners: 5,
    prize: "US$1,000 de descuento en la Mentoría",
    prizeDetail: "Cupón de US$1,000 de descuento en la Mentoría GovBidder Tu Primer Contrato.",
  },
  {
    key: "expert", name: "GovBidder Expert", short: "Expert", min: 15000, max: Infinity,
    color: "#00D67A", emoji: "🏆", winners: 10,
    prize: "B Support: licitamos por ti (US$1,000)",
    prizeDetail: "B Support: un licitador del equipo GovBidder prepara y presenta por ti una licitación del gobierno. Valorado en US$1,000.",
  },
];

/** Cantidad de ganadores por rango, indexado por key. */
export const WINNERS_BY_RANK: Record<Rank["key"], number> = Object.fromEntries(
  RANKS.map((r) => [r.key, r.winners]),
) as Record<Rank["key"], number>;

export function getRank(points: number): Rank {
  const p = Math.max(0, points || 0);
  return RANKS.find((r) => p >= r.min && p < r.max) ?? RANKS[RANKS.length - 1];
}

export interface RankProgress {
  rank: Rank;
  next: Rank | null;     // null si ya está en el rango máximo
  pointsIntoRank: number; // puntos acumulados dentro del rango actual
  pointsToNext: number;   // puntos que faltan para el próximo rango (0 si es el máximo)
  pct: number;            // 0-100, progreso dentro del rango actual hacia el próximo
}

export function rankProgress(points: number): RankProgress {
  const p = Math.max(0, points || 0);
  const rank = getRank(p);
  const idx = RANKS.findIndex((r) => r.key === rank.key);
  const next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  if (!next) {
    return { rank, next: null, pointsIntoRank: p - rank.min, pointsToNext: 0, pct: 100 };
  }
  const span = next.min - rank.min;
  const into = p - rank.min;
  return {
    rank,
    next,
    pointsIntoRank: into,
    pointsToNext: Math.max(0, next.min - p),
    pct: Math.min(100, Math.round((into / span) * 100)),
  };
}
