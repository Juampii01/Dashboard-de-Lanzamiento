/**
 * Unsplash image fetch for the Capability Statement PDF.
 *
 * Needs UNSPLASH_ACCESS_KEY (free — https://unsplash.com/developers).
 * Degrades gracefully: if the key is missing or any request fails, returns
 * an empty array so the PDF still renders (just without photos).
 *
 * Returns data URIs (base64) so @react-pdf embeds them reliably during
 * server-side render, without depending on react-pdf's own URL fetching.
 */

const UNSPLASH_API = "https://api.unsplash.com/search/photos";

/**
 * Resuelve la API key de Unsplash tolerando distintos nombres de env var
 * (por si en Vercel quedó cargada como UNSPLASH_API_KEY, etc.).
 */
function getUnsplashKey(): string | undefined {
  return (
    process.env.UNSPLASH_ACCESS_KEY ||
    process.env.UNSPLASH_API_KEY ||
    process.env.UNSPLASH_KEY ||
    process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ||
    ""
  ).trim() || undefined;
}

/**
 * Fetch plain image URLs (not data URIs) for use in <img src> in a web page
 * rendered in the browser. Returns up to `count` Unsplash URLs.
 */
export async function fetchWebImageUrls(keywords: string[], count = 4): Promise<string[]> {
  const key = getUnsplashKey();
  if (!key || keywords.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const orientation = i === 0 ? "landscape" : i === 1 ? "landscape" : "squarish";
    const url = await searchOne(keywords[i % keywords.length], key, orientation);
    if (url) out.push(url);
  }
  return out;
}

/**
 * NICHE-LOCKED image fetch for the Day 3 web preview.
 *
 * Guarantees every photo comes from the company's actual niche, so a printing
 * business never gets cleaning photos (and vice-versa). Strategy:
 *   1. Pull several DISTINCT photos from a single `niche` search.
 *   2. If Unsplash doesn't return enough, top up with `${niche} ${term}`
 *      combos — still anchored to the niche, never the bare keyword.
 * The Day 2 procurement keywords are only used as niche-qualified refinements,
 * never as standalone queries.
 */
export async function fetchNicheImageUrls(
  niche: string,
  refineTerms: string[] = [],
  count = 4
): Promise<string[]> {
  const key = getUnsplashKey();
  const cleanNiche = niche?.trim();

  // Queries CONCISAS para Unsplash. Las keywords (Día 2, en inglés) son las
  // mejores búsquedas; el `niche` suele ser un párrafo largo que devuelve 0
  // resultados. Por eso usamos keywords primero y el niche solo como respaldo.
  const queries = [
    ...refineTerms.map((t) => t?.trim()).filter(Boolean) as string[],
    shortNiche(cleanNiche),
  ].filter(Boolean) as string[];

  if (queries.length === 0) return [];

  let out: string[] = [];

  // 1. Unsplash (mejor calidad) — solo si hay API key configurada.
  if (key) {
    for (const q of queries) {
      if (out.length >= count) break;
      const found = await searchMany(q, key, 2);
      for (const u of found) {
        if (!out.includes(u)) out.push(u);
        if (out.length >= count) break;
      }
    }
  }

  // 2. Fallback SIN key (LoremFlickr): garantiza que el sitio SIEMPRE tenga
  //    fotos reales relevantes al rubro, aunque Unsplash falle o no esté.
  if (out.length < count) {
    out = out.concat(loremFlickrUrls(cleanNiche ?? "", refineTerms, count - out.length));
  }

  return out.slice(0, count);
}

/** Reduce un niche largo (párrafo) a una query corta de ~4 palabras útiles. */
function shortNiche(niche?: string): string {
  if (!niche) return "";
  const stop = new Set(["de","la","el","los","las","y","para","con","que","una","un","del","en","servicios","ofrecemos","resolvemos"]);
  const words = niche.toLowerCase().replace(/[^a-záéíóúñ0-9\s]/gi, " ").split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));
  return words.slice(0, 4).join(" ");
}

/**
 * URLs de imágenes keyless (LoremFlickr) basadas en el rubro. No requiere API
 * key. Cada URL usa un `lock` distinto para devolver una foto diferente pero
 * siempre del mismo tema. Sirve de red de seguridad cuando Unsplash no está.
 */
function loremFlickrUrls(niche: string, refineTerms: string[], count: number): string[] {
  // Etiquetas concisas: priorizar keywords (cortas) sobre el niche (párrafo largo).
  const toTag = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/).slice(0, 2).join(",");

  const tags = refineTerms
    .map((t) => toTag(t))
    .filter(Boolean);

  if (tags.length === 0) {
    const nicheTag = toTag(niche);
    if (nicheTag) tags.push(nicheTag);
  }
  if (tags.length === 0) tags.push("business,office");

  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    const tag = tags[i % tags.length];
    urls.push(`https://loremflickr.com/1200/800/${encodeURIComponent(tag)}?lock=${i + 1}`);
  }
  return urls;
}

/** Fetch up to `count` DISTINCT photo URLs from a single query. */
async function searchMany(query: string, key: string, count: number): Promise<string[]> {
  try {
    const perPage = Math.max(count * 2, 6);
    const url = `${UNSPLASH_API}?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&content_filter=high`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Array<{ urls?: { regular?: string; small?: string } }> };
    const urls: string[] = [];
    for (const photo of json.results ?? []) {
      const u = photo?.urls?.regular ?? photo?.urls?.small;
      if (u && !urls.includes(u)) urls.push(u);
    }
    return urls;
  } catch {
    return [];
  }
}

async function searchOne(query: string, key: string, orientation: "landscape" | "squarish"): Promise<string | null> {
  try {
    const url = `${UNSPLASH_API}?query=${encodeURIComponent(query)}&per_page=1&orientation=${orientation}&content_filter=high`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      // Unsplash recommends caching; this also speeds up regenerations
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: Array<{ urls?: { regular?: string; small?: string } }> };
    const photo = json.results?.[0];
    return photo?.urls?.regular ?? photo?.urls?.small ?? null;
  } catch {
    return null;
  }
}

async function toDataUri(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Fetch up to `count` images for the given keywords, returned as data URIs.
 * Index 0 = cover hero (landscape), 1+ = squarish accents.
 */
export async function fetchCapabilityImages(
  keywords: string[],
  count = 2
): Promise<string[]> {
  const key = getUnsplashKey();
  if (!key || keywords.length === 0) return [];

  const queries: string[] = [];
  for (let i = 0; i < count; i++) queries.push(keywords[i % keywords.length]);

  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const orientation = i === 0 ? "landscape" : "squarish";
    const photoUrl = await searchOne(queries[i], key, orientation);
    if (!photoUrl) continue;
    const dataUri = await toDataUri(photoUrl);
    if (dataUri) out.push(dataUri);
  }
  return out;
}
