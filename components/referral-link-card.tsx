"use client";

import { useState } from "react";
import { Copy, CheckCircle2, Link2 } from "lucide-react";

/**
 * Tarjeta "Compartí tu link" — muestra el link de referido del usuario con
 * botón de copiar. Theme-aware (light + dark). El link se arma server-side.
 */
export function ReferralLinkCard({ link, xp }: { link: string; xp: number }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link2 size={16} style={{ color: "var(--primary)" }} />
        <p style={{ fontWeight: 800, color: "var(--foreground)", fontSize: 15 }}>Tu link de referido</p>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>
        Compártelo y suma{" "}
        <strong style={{ color: "var(--foreground)" }}>+{xp} pts</strong> por cada persona que invitas al lanzamiento.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          style={{
            flex: 1,
            minWidth: 200,
            background: "var(--background)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--foreground)",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            padding: "10px 12px",
            outline: "none",
          }}
        />
        <button
          onClick={copy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: "nowrap",
            background: copied ? "color-mix(in srgb, var(--success) 16%, transparent)" : "var(--primary)",
            color: copied ? "var(--success)" : "var(--primary-foreground)",
            transition: "background 0.15s",
          }}
        >
          {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>

      <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0, opacity: 0.9 }}>
        Una vez que la persona que refieres ingresa al lanzamiento, se te suman los puntos automáticamente.
      </p>
    </div>
  );
}
