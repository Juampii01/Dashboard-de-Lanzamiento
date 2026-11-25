// Validación de códigos contra listas oficiales.
// - PSC: PSC Manual, edición abril 2025 (acquisition.gov).
// - NAICS: NAICS 2022 (Census Bureau), solo códigos de 6 dígitos.
// - SIC: SIC 1987 (OSHA), 4 dígitos.
// - UNSPSC: catálogo UNSPSC, códigos de 8 dígitos.
// - NIGP: la lista completa es de pago (Periscope). Solo se aceptan los códigos que vimos
//   publicados por compras estatales (NJSTART y OregonBuys), con su descripción.
// La IA a veces inventa el código o le pone una descripción que no es la oficial
// (ej: "S202 Interior Cleaning", cuando S202 es "Housekeeping- Fire Protection").
// Todo código que se muestre al participante debe pasar por aquí.
import pscList from "./psc-2025-04.json";
import naicsList from "./naics-2022.json";
import sicList from "./sic-1987.json";
import unspscList from "./unspsc.json";
import nigpList from "./nigp.json";

const PSC = pscList as Record<string, string>;
const NAICS = naicsList as Record<string, string>;

export type CodeType = "NAICS" | "PSC" | "SIC" | "UNSPSC" | "NIGP";

const LISTS: Record<CodeType, Record<string, string>> = {
  PSC,
  NAICS,
  SIC: sicList as Record<string, string>,
  UNSPSC: unspscList as Record<string, string>,
  NIGP: nigpList as Record<string, string>,
};

const ACRONYMS = new Set([
  "IT", "ADP", "HVAC", "US", "USA", "NEC", "ATM", "TV", "CD", "DVD", "GPS", "ID", "UAV",
  "AV", "PC", "LAN", "WAN", "RF", "UV", "LED", "FAA", "DOD", "R&D", "A&E", "RDT&E", "NASA",
]);

const SMALL_WORDS = new Set(["and", "or", "of", "the", "for", "to", "in", "a", "an", "with", "on", "by"]);

// El manual PSC viene en mayúsculas; se muestra como "Housekeeping- Custodial Janitorial".
function prettyTitle(title: string): string {
  return title
    .split(/(\s+|\/|-)/)
    .map((w, i) => {
      const bare = w.replace(/[(),.]/g, "");
      if (!bare || /\s|\/|-/.test(w)) return w;
      if (ACRONYMS.has(bare) || /\d/.test(bare) || bare.includes("&")) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

export function officialPscTitle(code: string): string | null {
  const t = PSC[code.trim().toUpperCase()];
  return t ? prettyTitle(t) : null;
}

export function officialNaicsTitle(code: string): string | null {
  return NAICS[code.trim()] ?? null;
}

const STOPWORDS = new Set([
  "and", "or", "of", "the", "for", "to", "in", "a", "an", "with", "other", "misc", "miscellaneous",
  "services", "service", "svcs", "housekeeping", "general", "support", "nec",
]);

// Singular simple para que "facility" y "facilities" cuenten como la misma palabra.
function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

// Qué parte de las palabras de `desc` aparecen en `official` (0 a 1).
function overlap(desc: string, official: string): number {
  const d = tokens(desc);
  if (!d.length) return 0;
  const o = new Set(tokens(official));
  return d.filter((w) => o.has(w)).length / d.length;
}

// Palabras de cada título oficial, calculadas una sola vez por lista.
const TOKEN_CACHE = new Map<CodeType, [string, Set<string>, string][]>();
function tokenized(type: CodeType): [string, Set<string>, string][] {
  let t = TOKEN_CACHE.get(type);
  if (!t) {
    t = Object.entries(LISTS[type]).map(([code, title]) => [code, new Set(tokens(title)), title]);
    TOKEN_CACHE.set(type, t);
  }
  return t;
}

// Busca el código oficial cuyo título coincide con la descripción que dio la IA.
// Desempata por el título que queda más cubierto por la descripción
// ("Facilities Operations Support" gana sobre "Operation of Conference Space and Facilities").
function findByTitle(type: CodeType, desc: string, sameKind: (code: string) => boolean): string | null {
  const d = tokens(desc);
  if (!d.length) return null;
  let best: string | null = null;
  let bestScore = 0;
  let tie = false;
  for (const [code, set, title] of tokenized(type)) {
    if (!sameKind(code)) continue;
    const forward = d.filter((w) => set.has(w)).length / d.length;
    if (forward < 0.75) continue;
    const s = forward + overlap(title, desc) / 100;
    if (s > bestScore) { best = code; bestScore = s; tie = false; }
    else if (s === bestScore) tie = true;
  }
  return best && !tie ? best : null;
}

function display(type: CodeType, title: string): string {
  return type === "PSC" ? prettyTitle(title) : title;
}

/**
 * Corrige un código propuesto por la IA:
 * - Si el código existe y su título oficial coincide con lo que la IA quiso decir → se queda,
 *   con el título oficial. Sin descripción, alcanza con que exista.
 * - Si el título oficial no tiene nada que ver, pero la descripción coincide claramente con
 *   otro código oficial (ej: PSC "Interior Plantscaping" → S217) → se usa ese código.
 * - Si no, se descarta (mejor menos códigos que uno equivocado).
 */
export function fixCode(type: CodeType, code: string, aiDescription?: string): { code: string; description: string } | null {
  const list = LISTS[type];
  if (!list) return null;
  const c = type === "PSC" ? code.trim().toUpperCase() : code.trim();
  const official = list[c];
  const desc = (aiDescription ?? "").trim();
  if (official && (!desc || overlap(desc, official) >= 0.5)) {
    return { code: c, description: display(type, official) };
  }
  if (desc) {
    // PSC: servicio con servicio (empieza con letra), producto con producto (4 dígitos).
    const sameKind = type === "PSC" ? (x: string) => /^[A-Z]/.test(x) === /^[A-Z]/.test(c) : () => true;
    const other = findByTitle(type, desc, sameKind);
    if (other) return { code: other, description: display(type, list[other]) };
  }
  return null;
}

export function fixPsc(code: string, aiDescription: string): { code: string; description: string } | null {
  return fixCode("PSC", code, aiDescription);
}

/** NAICS: solo códigos que existen, con su título oficial. Con descripción, además debe coincidir. */
export function fixNaics(code: string, aiDescription?: string): { code: string; description: string } | null {
  return fixCode("NAICS", code, aiDescription);
}

export function isValidNaics(code: string): boolean {
  return !!NAICS[String(code ?? "").trim()];
}

// Peso de cada palabra según qué tan rara es en la lista ("janitorial" pesa más que "construction").
const IDF_CACHE = new Map<CodeType, Map<string, number>>();
function idf(type: CodeType): Map<string, number> {
  let m = IDF_CACHE.get(type);
  if (!m) {
    const df = new Map<string, number>();
    const rows = tokenized(type);
    for (const [, set] of rows) for (const w of set) df.set(w, (df.get(w) ?? 0) + 1);
    m = new Map([...df].map(([w, n]) => [w, Math.log(rows.length / n)]));
    IDF_CACHE.set(type, m);
  }
  return m;
}

/**
 * Códigos oficiales cuyos títulos coinciden con las palabras del negocio (keywords, nicho).
 * Se le pasan a la IA para que elija de la lista oficial en lugar de recordar de memoria.
 * Cada frase suma según qué parte de sus palabras (ponderadas por rareza) aparecen en el título.
 */
export function candidatesFor(type: CodeType, terms: string[], limit: number): { code: string; title: string }[] {
  const weights = idf(type);
  const phrases = terms.map((t) => [...new Set(tokens(t))].filter((w) => w.length > 2)).filter((p) => p.length);
  if (!phrases.length) return [];
  const scored: { code: string; title: string; score: number }[] = [];
  for (const [code, set, title] of tokenized(type)) {
    let score = 0;
    for (const p of phrases) {
      let hit = 0, total = 0;
      for (const w of p) {
        const wt = weights.get(w) ?? 0;
        total += wt;
        if (set.has(w)) hit += wt;
      }
      if (total > 0) score += (hit / total) ** 2;
    }
    if (score <= 0) continue;
    scored.push({ code, title: display(type, title), score: score / Math.sqrt(set.size || 1) });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ code, title }) => ({ code, title }));
}
