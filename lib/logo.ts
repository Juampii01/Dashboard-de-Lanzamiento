/**
 * Logo helpers — server-side only.
 * Converts a public logo URL to a base64 data URI so react-pdf can
 * embed it during server-side rendering without external HTTP requests.
 */

/**
 * Fetch a company logo URL and return it as a data URI.
 * Returns null if the URL is missing, empty, or the fetch fails.
 */
export async function fetchLogoDataUri(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Reads a static asset from /public and returns it as a base64 data URI so
 * react-pdf can embed it during SSR. Used for the Govbidder brand logo.
 */
export async function readPublicImageDataUri(
  fileName: string,
  mime = "image/png"
): Promise<string | null> {
  try {
    const { readFile } = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "public", fileName);
    const buf = await readFile(filePath);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Govbidder brand logo (halcón) como data URI, listo para react-pdf. */
export async function getBrandLogoDataUri(): Promise<string | null> {
  return readPublicImageDataUri("halcon.png");
}
