"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * FieldHelp — ícono "?" con un tooltip que explica cómo completar el campo.
 * Usa posición `fixed` calculada desde el botón y clampeada al viewport, así
 * NUNCA se corta ni se sale del modal (que recorta con overflow). Presentación pura.
 */
export function FieldHelp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const WIDTH = 250;

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left), window.innerWidth - WIDTH - 8);
    const top = r.top - 8; // el tooltip se ubica arriba (translateY(-100%))
    setPos({ top, left });
  }, [open]);

  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle", marginLeft: 6 }}>
      <button
        ref={btnRef}
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
      {open && pos && (
        <span
          role="tooltip"
          style={{
            position: "fixed", top: pos.top, left: pos.left, transform: "translateY(-100%)",
            width: WIDTH, maxWidth: "92vw", zIndex: 100000,
            background: "var(--secondary)", color: "#fff",
            fontSize: 11.5, lineHeight: 1.45, fontWeight: 400,
            padding: "9px 11px", borderRadius: 8,
            boxShadow: "0 8px 26px rgba(0,0,0,0.4)",
            whiteSpace: "normal", pointerEvents: "none",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
