"use client";

import { useState } from "react";

/**
 * FieldHelp — ícono "?" con un tooltip que explica cómo completar el campo.
 * Aparece al pasar el mouse (desktop) o al tocar (mobile). Presentación pura.
 */
export function FieldHelp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle", marginLeft: 6 }}>
      <button
        type="button"
        aria-label="Ayuda"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        style={{
          width: 16, height: 16, borderRadius: "50%",
          border: "1px solid var(--border)", background: "var(--muted)",
          color: "var(--muted-foreground)", fontSize: 11, fontWeight: 700, lineHeight: 1,
          cursor: "help", display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, padding: 0,
        }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 60,
            width: 250, maxWidth: "70vw",
            background: "var(--secondary)", color: "#fff",
            fontSize: 11.5, lineHeight: 1.45, fontWeight: 400,
            padding: "9px 11px", borderRadius: 8,
            boxShadow: "0 8px 26px rgba(0,0,0,0.35)",
            whiteSpace: "normal",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
