"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Regalo: 1 mes gratis de GovBidder Connect al completar el challenge. Card
// desplegable. Se muestra en el Ranking.
export function GiftCard() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: 14,
      border: "1.5px solid color-mix(in srgb, var(--cert-gold) 50%, transparent)",
      background: "color-mix(in srgb, var(--cert-gold) 8%, var(--card))",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 11,
          padding: "14px 16px", background: "none", border: "none", cursor: "pointer",
          textAlign: "left", font: "inherit",
        }}
      >
        <span style={{ fontSize: 26, flexShrink: 0 }}>🎁</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "var(--cert-gold)" }}>
            Mi regalo para vos
          </span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--muted-foreground)", marginTop: 1 }}>
            Por completar el challenge — tocá para abrir
          </span>
        </span>
        <ChevronDown size={20} style={{ flexShrink: 0, color: "var(--muted-foreground)", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid color-mix(in srgb, var(--cert-gold) 22%, transparent)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: "14px 0 6px" }}>
            🎁 1 mes GRATIS de GovBidder Connect
          </h3>
          <p style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.55, margin: 0 }}>
            Si completás los <strong>4 días del challenge</strong>, te regalo <strong style={{ color: "var(--cert-gold)" }}>1 mes de acceso gratuito a GovBidder Connect</strong> — la plataforma para <strong>buscar y encontrar licitaciones y grants</strong> (todas tus oportunidades en un solo lugar).
          </p>
          <p style={{ fontSize: 13.5, color: "var(--muted-foreground)", lineHeight: 1.5, marginTop: 10, fontStyle: "italic" }}>
            Es mi forma de agradecerte por llegar hasta el final. 🦅 — <strong style={{ color: "var(--foreground)" }}>Santo</strong>
          </p>
        </div>
      )}
    </div>
  );
}
