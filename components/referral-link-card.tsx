"use client";

import { useState } from "react";
import { Copy, CheckCircle2, Link2, HelpCircle, X } from "lucide-react";

/**
 * Tarjeta "Comparte tu link" — muestra el link de referido del usuario con
 * botón de copiar. Theme-aware (light + dark). El link se arma server-side.
 */
export function ReferralLinkCard({ link, xp, over10k = false }: { link: string; xp: number; over10k?: boolean }) {
  // Sobre 10.000 pts cada acción cuenta la mitad → mostrar lo que realmente va a sumar.
  const shownXp = over10k ? Math.floor(xp / 2) : xp;
  const refPtsLabel = over10k ? "+500" : "+1.000";
  const [copied, setCopied] = useState(false);
  const [showHow, setShowHow] = useState(false);

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
        <button
          type="button"
          onClick={() => setShowHow(true)}
          style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5,
            background: "color-mix(in srgb, var(--primary) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 35%, transparent)",
            color: "var(--primary)", borderRadius: 999, padding: "5px 11px",
            fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          <HelpCircle size={14} /> ¿Cómo funciona?
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>
        Compártelo y suma{" "}
        <strong style={{ color: "var(--foreground)" }}>+{shownXp} pts</strong> por cada persona que invitas al lanzamiento.
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

      {/* Ventana emergente: cómo funciona el sistema de referidos */}
      {showHow && (
        <div
          onClick={() => setShowHow(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(4,10,25,0.66)", backdropFilter: "blur(2px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(440px, 100%)", maxHeight: "90vh", overflowY: "auto",
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "22px 20px",
              boxShadow: "0 30px 80px -24px rgba(0,0,0,0.7)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
              <p style={{ fontWeight: 800, fontSize: 17, color: "var(--foreground)" }}>🤝 Cómo funciona el sistema de referidos</p>
              <button
                type="button" onClick={() => setShowHow(false)} aria-label="Cerrar"
                style={{ flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "inline-flex", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {[
              { n: "1", icon: "📤", title: "Comparte tu link", text: "Mándale tu link de referido a la persona que quieras invitar al challenge." },
              { n: "2", icon: "✍️", title: "La persona ingresa su email", text: "Al abrir tu link, escribe su email y se la redirige a la página donde debe ingresar al lanzamiento." },
              { n: "3", icon: "🎉", title: `Ganas ${refPtsLabel} pts`, text: `Cuando esa persona ingresa al challenge, se te acreditan automáticamente ${refPtsLabel} puntos.` },
            ].map((s) => (
              <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "11px 0", borderTop: s.n === "1" ? "none" : "1px solid var(--border)" }}>
                <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--primary) 14%, transparent)", color: "var(--primary)", fontWeight: 800, fontSize: 14 }}>{s.n}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>{s.icon} {s.title}</p>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5, marginTop: 2 }}>{s.text}</p>
                </div>
              </div>
            ))}

            <button
              type="button" onClick={() => setShowHow(false)}
              style={{ marginTop: 16, width: "100%", padding: "11px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
