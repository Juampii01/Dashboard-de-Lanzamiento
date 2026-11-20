"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { CupoPopup } from "@/lib/cupo-popup";

/**
 * Ventana a pantalla completa "¡Quiero mi cupo!". Se muestra una sola vez:
 * al tocar el botón (abre WhatsApp con el mensaje ya escrito) o al cerrarla,
 * queda registrado y no vuelve a aparecer. El equipo ve quién tocó el botón
 * en /admin/ventas.
 */
export function CupoPopupModal({ popup, name, email }: { popup: CupoPopup; name: string; email: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const message = `¡Quiero mi cupo! Soy ${name || "participante del challenge"}${email ? ` (${email})` : ""}`;
  const href = `https://wa.me/${popup.whatsapp}?text=${encodeURIComponent(message)}`;

  function track(button: "quiero_cupo" | "quiero_cupo_visto") {
    try {
      fetch("/api/proximo-paso/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ button }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* noop */ }
  }

  function close() {
    track("quiero_cupo_visto");
    setOpen(false);
  }

  function claim() {
    track("quiero_cupo");
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cupo-popup-title"
      style={{
        position: "fixed", inset: 0, zIndex: 99975,
        background: "linear-gradient(160deg, #101f5a 0%, #152978 55%, #1e3a9a 100%)",
        color: "#FFFFFF",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, overflowY: "auto",
      }}
    >
      <button
        onClick={close}
        aria-label="Cerrar"
        style={{
          position: "absolute", top: 18, right: 18, width: 44, height: 44, borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)",
          color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        <X size={22} />
      </button>

      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>🎟️</div>
        <h2 id="cupo-popup-title" style={{ margin: "18px 0 12px", fontSize: "clamp(30px, 6vw, 46px)", fontWeight: 900, lineHeight: 1.1 }}>
          {popup.title}
        </h2>
        <p style={{ margin: "0 auto 28px", fontSize: 17, lineHeight: 1.55, color: "rgba(255,255,255,0.85)", whiteSpace: "pre-line" }}>
          {popup.text}
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={claim}
          style={{
            display: "inline-block", background: "#E42D2C", color: "#FFFFFF", textDecoration: "none",
            borderRadius: 999, padding: "16px 36px", fontSize: 18, fontWeight: 900,
            boxShadow: "0 10px 30px rgba(228,45,44,0.45)",
          }}
        >
          {popup.button}
        </a>
        <div>
          <button
            onClick={close}
            style={{ marginTop: 18, background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 14, cursor: "pointer", textDecoration: "underline" }}
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
