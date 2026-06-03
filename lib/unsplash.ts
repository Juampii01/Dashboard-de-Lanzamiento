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
 * Fetch plain image URLs (not data URIs) for use in <img src> in a web page
 * rendered in the browser. Returns up to `count` Unsplash URLs.
 */
export async function fetchWebImageUrls(keywords: string[], count = 4): Promise<string[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key || keywords.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const orientation = i === 0 ? "landscape" : i === 1 ? "landscape" : "squarish";
    const url = await searchOne(keywords[i % keywords.length], key, orientation);
    if (url) out.push(url);
  }
  return out;
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
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
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
