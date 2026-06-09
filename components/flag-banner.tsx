import Image from "next/image";

/**
 * FlagBanner — "isla oscura" reutilizable con la bandera de USA de la marca.
 *
 * PRESENTACIÓN PURA. Banner CONTENIDO (nunca fondo de toda la app, nunca detrás
 * de formularios/contenido de lectura). Encima de la imagen va SIEMPRE un overlay
 * navy de marca para garantizar contraste AA del texto blanco/dorado.
 *
 * Optimización: usa next/image (fill) → Next sirve AVIF/WebP responsivos.
 * Mientras el asset real no exista en /public, el degradado navy de base actúa
 * como placeholder elegante (si la imagen 404ea, se ve la base, no un ícono roto).
 *
 * ► ASSET: dejá la imagen en /public con este nombre exacto: `flag-usa.jpg`
 *   (alta resolución, horizontal; el foco con estrellas/franjas debe quedar
 *   visible al recortar con object-fit: cover).
 */

const FLAG_SRC = "/flag-usa.jpg";

/** Overlay por defecto: degradado navy de marca (contraste AA para texto blanco). */
const DEFAULT_OVERLAY =
  "linear-gradient(180deg, rgba(13,26,61,0.72), rgba(8,15,36,0.92))";

export function FlagBanner({
  children,
  minHeight = 160,
  overlay = DEFAULT_OVERLAY,
  rounded = true,
  /** Posición del recorte de la bandera (mantener estrellas/franjas a la vista). */
  objectPosition = "center 38%",
  /** LCP: poné priority en el banner above-the-fold (home/ranking). El resto lazy. */
  priority = false,
  contentStyle,
  className,
}: {
  children: React.ReactNode;
  minHeight?: number;
  overlay?: string;
  rounded?: boolean;
  objectPosition?: string;
  priority?: boolean;
  contentStyle?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        minHeight,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        borderRadius: rounded ? 16 : 0,
        border: "1px solid rgba(255,255,255,0.08)",
        // Base navy = placeholder elegante si el asset todavía no está.
        background: "linear-gradient(135deg, #0d1a3d 0%, #080f24 100%)",
        boxShadow: "0 10px 30px -16px rgba(8,15,36,0.5)",
      }}
    >
      {/* Bandera optimizada (AVIF/WebP vía next/image). 404 → se ve la base navy. */}
      <Image
        src={FLAG_SRC}
        alt=""
        aria-hidden
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 960px"
        style={{ objectFit: "cover", objectPosition }}
      />

      {/* Overlay navy de marca — garantiza contraste del texto. */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: overlay }} />

      {/* Contenido (texto blanco/dorado, tratamiento oscuro). */}
      <div
        style={{
          position: "relative",
          width: "100%",
          padding: "24px 28px",
          color: "#ffffff",
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
