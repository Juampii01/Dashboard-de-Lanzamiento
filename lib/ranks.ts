/**
 * Rangos del challenge. Subís de rango acumulando puntos; al cierre el premio
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
  prize: string;
}

export const RANKS: Rank[] = [
  { key: "elevate", name: "GovBidder Elevate", short: "Elevate", min: 0,      max: 5000,     color: "#CD7F32", emoji: "🔥", prize: "10 auditorías con el Team GovBidder" },
  { key: "prime",   name: "GovBidder Prime",   short: "Prime",   min: 5000,   max: 10000,    color: "#C0C0C0", emoji: "⚡", prize: "Consultoría 1:1 de 1h con Santo" },
  { key: "legacy",  name: "GovBidder Legacy",  short: "Legacy",  min: 10000,  max: 15000,    color: "#FFD700", emoji: "👑", prize: "Cupón $1,000 para productos GovBidder" },
  { key: "expert",  name: "GovBidder Expert",  short: "Expert",  min: 15000,  max: Infinity, color: "#00D67A", emoji: "🏆", prize: "Servicio «Te conseguimos tu contrato» · $15K" },
];

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
