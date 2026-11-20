// Puntos con hasta 2 decimales (ej. una misión de +1,97 pts).
// Misma regla que public.half_points() en la base: enteros → floor(p/2),
// decimales → se corta a 2 decimales.

export function halfPoints(p: number): number {
  if (Number.isInteger(p)) return Math.floor(p / 2);
  return Math.floor(Math.round(p * 100) / 2) / 100;
}

/** Valor que realmente suma alguien que ya pasó los 10.000. */
export function effectivePoints(p: number, over10k: boolean): number {
  return over10k && p > 0 ? halfPoints(p) : p;
}

/** "1.234", "1,97", "12.345,5" — sin decimales de más. */
export function formatPoints(p: number | null | undefined): string {
  return Number(p ?? 0).toLocaleString("es", { maximumFractionDigits: 2 });
}

/** Lee lo que escribe el admin ("1,97", "1.97", "1000") y redondea a 2 decimales. */
export function parsePointsInput(raw: unknown): number {
  const s = String(raw ?? "").trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}
