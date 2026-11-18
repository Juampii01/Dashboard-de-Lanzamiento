/**
 * Sectores NAICS (los 2 primeros dígitos del código), en español.
 * Se usa en los PDFs cuando no tenemos la descripción exacta del código:
 * así el participante al menos ve a qué sector pertenece.
 */
const SECTORS: Record<string, string> = {
  "11": "Agricultura, ganadería, pesca y caza",
  "21": "Minería y extracción de petróleo y gas",
  "22": "Servicios públicos (electricidad, agua y gas)",
  "23": "Construcción",
  "31": "Manufactura",
  "32": "Manufactura",
  "33": "Manufactura",
  "42": "Comercio al por mayor",
  "44": "Comercio al por menor",
  "45": "Comercio al por menor",
  "48": "Transporte y almacenamiento",
  "49": "Transporte y almacenamiento",
  "51": "Información y medios",
  "52": "Finanzas y seguros",
  "53": "Bienes raíces y alquiler",
  "54": "Servicios profesionales, científicos y técnicos",
  "55": "Administración de empresas",
  "56": "Servicios administrativos, de apoyo y de limpieza",
  "61": "Servicios educativos",
  "62": "Salud y asistencia social",
  "71": "Arte, entretenimiento y recreación",
  "72": "Alojamiento y servicios de comida",
  "81": "Otros servicios (reparación, mantenimiento y personales)",
  "92": "Administración pública",
};

export function naicsSector(code: string | null | undefined): string | null {
  const c = String(code ?? "").trim();
  if (!/^\d{2}/.test(c)) return null;
  return SECTORS[c.slice(0, 2)] ?? null;
}

/** Descripción del código principal: la exacta si la tenemos (Día 2), si no el sector. */
export function naicsLabel(
  code: string | null | undefined,
  relatedCodes?: Array<{ code?: string; description?: string; type?: string }> | null,
): { description: string | null; isSector: boolean } {
  const c = String(code ?? "").trim();
  const exact = (relatedCodes ?? []).find((r) => String(r.code ?? "").trim() === c && (r.type ?? "NAICS") === "NAICS");
  if (exact?.description) return { description: exact.description, isSector: false };
  const sector = naicsSector(c);
  return { description: sector ? `Sector: ${sector}` : null, isSector: true };
}
