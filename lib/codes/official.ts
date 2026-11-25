// Validación de códigos NAICS y PSC contra las listas oficiales.
// - PSC: PSC Manual, edición abril 2025 (acquisition.gov).
// - NAICS: NAICS 2022 (Census Bureau), solo códigos de 6 dígitos.
// La IA a veces inventa el código o le pone una descripción que no es la oficial
// (ej: "S202 Interior Cleaning", cuando S202 es "Housekeeping- Fire Protection").
// Todo código que se muestre al participante debe pasar por aquí.
import pscList from "./psc-2025-04.json";
import naicsList from "./naics-2022.json";

const PSC = pscList as Record<string, string>;
const NAICS = naicsList as Record<string, string>;

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

// Busca el PSC oficial cuyo título coincide con la descripción que dio la IA.
// Desempata por el título que queda más cubierto por la descripción
// ("Facilities Operations Support" gana sobre "Operation of Conference Space and Facilities").
function findPscByTitle(desc: string, service: boolean): string | null {
  let best: string | null = null;
  let bestScore = 0;
  let tie = false;
  for (const [code, title] of Object.entries(PSC)) {
    if (/^[A-Z]/.test(code) !== service) continue; // servicio con servicio, producto con producto
    const forward = overlap(desc, title);
    if (forward < 0.75) continue;
    const s = forward + overlap(title, desc) / 100;
    if (s > bestScore) { best = code; bestScore = s; tie = false; }
    else if (s === bestScore) tie = true;
  }
  return best && !tie ? best : null;
}

/**
 * Corrige un PSC propuesto por la IA:
 * - Si el código existe y su título oficial coincide con lo que la IA quiso decir → se queda,
 *   con el título oficial.
 * - Si el título oficial no tiene nada que ver, pero la descripción coincide claramente con
 *   otro código oficial (ej: "Interior Plantscaping" → S217) → se usa ese código.
 * - Si no, se descarta (mejor menos códigos que uno equivocado).
 */
export function fixPsc(code: string, aiDescription: string): { code: string; description: string } | null {
  const c = code.trim().toUpperCase();
  const official = PSC[c];
  const desc = (aiDescription ?? "").trim();
  if (official && (!desc || overlap(desc, official) >= 0.5)) {
    return { code: c, description: prettyTitle(official) };
  }
  if (desc) {
    const other = findPscByTitle(desc, /^[A-Z]/.test(c));
    if (other) return { code: other, description: prettyTitle(PSC[other]) };
  }
  return null;
}

/** NAICS: solo códigos que existen, con su título oficial. */
export function fixNaics(code: string): { code: string; description: string } | null {
  const c = code.trim();
  const official = NAICS[c];
  return official ? { code: c, description: official } : null;
}
