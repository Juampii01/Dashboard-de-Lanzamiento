/**
 * Rangos del challenge. Subís de rango acumulando puntos; al cierre el premio
 * se SORTEA (ponderado: más puntos/rango = más chances).
 * Umbrales pensados para la escala ×10 (techo ~13.000 XP). Ajustables acá.
 */
export interface Rank {
  key: "elevate" | "prime" | "legacy";
  name: string;
  min: number;          // puntos mínimos (inclusive)
  max: number;          // puntos máximos (exclusive); Infinity en el último
  color: string;
  emoji: string;
}

export const RANKS: Rank[] = [
  { key: "elevate", name: "Elevate", min: 0,     max: 4000,     color: "#CD7F32", emoji: "🔥" },
  { key: "prime",   name: "Prime",   min: 4000,  max: 8000,     color: "#C0C0C0", emoji: "⚡" },
  { key: "legacy",  name: "Legacy",  min: 8000,  max: Infinity, color: "#FFD700", emoji: "👑" },
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
