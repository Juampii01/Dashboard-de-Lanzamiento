"use client";

import { useState } from "react";
import { Maximize2, X } from "lucide-react";

/**
 * Textarea con botón "Expandir" que abre un editor grande en modal (letra más
 * grande, alto, con scroll para ver todo el texto). Pensado para el admin cuando
 * escribe descripciones largas de misiones. El valor se sincroniza en vivo con el
 * textarea inline, así que se puede escribir en cualquiera de los dos.
 */
export function ExpandableTextarea({
  value,
  onChange,
  placeholder,
  style,
  title = "Descripción",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ position: "relative" }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...style, paddingRight: 92 }}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Expandir para escribir cómodo"
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 6,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--muted-foreground)",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Maximize2 size={12} /> Expandir
        </button>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99990,
            background: "rgba(4,10,25,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              height: "min(80vh, 700px)",
              display: "flex",
              flexDirection: "column",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 30px 90px -20px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>{title}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "inline-flex", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            <textarea
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              style={{
                flex: 1,
                width: "100%",
                boxSizing: "border-box",
                resize: "none",
                border: "none",
                outline: "none",
                background: "var(--background)",
                color: "var(--foreground)",
                fontSize: 16,
                lineHeight: 1.6,
                padding: "16px 18px",
                fontFamily: "var(--font-sans)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{value.length} caracteres</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ padding: "9px 22px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14, background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
