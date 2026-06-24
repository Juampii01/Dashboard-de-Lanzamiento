/**
 * Fuente única de las etiquetas/orden del desglose de puntos ("de dónde salieron").
 * La usan el pill del header (PointsHUD) y la card de puntos del inicio (PointsCard).
 */

export interface Breakdown {
  total: number;
  tracked: number;
  by_category: Record<string, number>;
}

export const CATEGORY_LABEL: Record<string, string> = {
  time:     "⏱️ Tiempo en el dashboard",
  video:    "🎬 Videos",
  day:      "🚀 Días del challenge",
  mission:  "🎯 Misiones",
  keyword:  "📞 Palabras clave",
  story:    "📸 Historia diaria",
  rafaga:   "⚡ Misiones ráfaga",
  streak:   "🔥 Racha diaria",
  referral: "🤝 Referidos",
  avatar:   "🕺 Avatar",
  quiz:     "🧠 Quizzes",
  call:     "📞 Llamadas en vivo",
  podcast:  "🎧 Podcast",
  ad:       "📺 Anuncios",
  other:    "✨ Otros",
};

export const CATEGORY_ORDER = [
  "time", "video", "day", "mission", "keyword", "story", "rafaga",
  "streak", "referral", "avatar", "quiz", "call", "podcast", "ad", "other",
];

/**
 * Devuelve las filas [etiqueta, puntos] a mostrar. Combina la categoría "other"
 * con el remanente no rastreado (total - tracked) en una sola fila "Otros".
 */
export function breakdownRows(b: Breakdown | null): [string, number][] {
  if (!b) return [];
  const rows: [string, number][] = [];
  for (const k of CATEGORY_ORDER) {
    if (k === "other") continue; // se maneja aparte para fusionar el remanente
    const v = b.by_category[k] ?? 0;
    if (v !== 0) rows.push([CATEGORY_LABEL[k], v]);
  }
  const remainder = Math.max(0, b.total - b.tracked);
  const otherTotal = (b.by_category.other ?? 0) + remainder;
  if (otherTotal !== 0) rows.push([CATEGORY_LABEL.other, otherTotal]);
  return rows;
}
