import React from "react";

// Detecta URLs (http/https) en el texto y las convierte en enlaces clickeables.
const URL_RE = /(https?:\/\/[^\s]+)/g;
function linkify(text: string): React.ReactNode[] {
  return text.split(URL_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noreferrer"
        style={{ color: "var(--primary)", textDecoration: "underline", fontWeight: 600, wordBreak: "break-word" }}
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

/**
 * Renderiza el texto de una misión preservando la estructura que el admin escribe
 * en el textarea (que se perdía al meterlo en un solo <p>):
 *  - Bloques separados por línea en blanco  → párrafos con aire entre sí.
 *  - Bloque de varias líneas seguidas        → lista con viñetas (ejemplos, campos…).
 *  - Línea suelta terminada en ":"           → sub-título (resaltada).
 */
export function MissionText({ text, fontSize = 14.5 }: { text: string; fontSize?: number }) {
  const blocks = text.split(/\n\s*\n/);
  const blockGap = fontSize <= 13 ? 7 : 11;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: blockGap }}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;

        if (lines.length === 1) {
          const isLabel = lines[0].endsWith(":");
          return (
            <p key={i} style={{
              fontSize, lineHeight: 1.55, margin: 0,
              color: isLabel ? "var(--foreground)" : "var(--muted-foreground)",
              fontWeight: isLabel ? 700 : 400,
            }}>
              {linkify(lines[0])}
            </p>
          );
        }

        return (
          <ul key={i} style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {lines.map((line, j) => (
              <li key={j} style={{ display: "flex", gap: 8, fontSize, color: "var(--muted-foreground)", lineHeight: 1.45 }}>
                <span style={{ color: "var(--primary)", flexShrink: 0, fontWeight: 800 }}>›</span>
                <span>{linkify(line)}</span>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
