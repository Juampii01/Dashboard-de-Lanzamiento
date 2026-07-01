"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Download, Sparkles, X, Loader2 } from "lucide-react";

/**
 * Modal de festejo que aparece al completar la tarea de un día.
 * Confetti + "¡Tu tarea ya fue resuelta!" + botón para descargar el entregable +
 * botón para ir a las misiones de video y sumar puntos extra.
 * Pensado grande y claro (usuarios grandes). Detrás sigue la página completa.
 */
export function TaskCompleteModal({
  open,
  onClose,
  onDownload,
  downloading = false,
  title = "¡Tu tarea ya fue resuelta!",
  subtitle = "¡Excelente trabajo! Ya podés descargar tu documento.",
  downloadLabel = "Descargar mi PDF",
}: {
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  downloading?: boolean;
  title?: string;
  subtitle?: string;
  downloadLabel?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (!prefersReduced) {
      confetti({
        particleCount: 60,
        spread: 70,
        startVelocity: 36,
        ticks: 140,
        origin: { y: 0.5 },
        colors: ["#E42D2C", "#152978", "#16A65F", "#FFD700"],
      });
    }
  }, [open]);

  if (!open) return null;

  const goMissions = () => {
    onClose();
    setTimeout(() => {
      document
        .querySelector('[data-tour-id="capsules"]')
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 220);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99990,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(4,10,25,0.7)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(440px, 100%)",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "28px 24px",
          textAlign: "center",
          boxShadow: "0 30px 90px -20px rgba(0,0,0,0.6)",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--muted-foreground)",
            padding: 6,
          }}
        >
          <X size={22} />
        </button>

        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 6 }}>🎉</div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 800,
            color: "var(--foreground)",
            margin: "0 0 8px",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h2>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: "0 0 22px", lineHeight: 1.5 }}>
          {subtitle}
        </p>

        {/* Acción principal: descargar el entregable */}
        <button
          onClick={onDownload}
          disabled={downloading}
          style={{
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "15px 20px",
            borderRadius: 14,
            border: "none",
            cursor: downloading ? "wait" : "pointer",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            fontSize: 16.5,
            fontWeight: 800,
            marginBottom: 10,
          }}
        >
          {downloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          {downloadLabel}
        </button>

        {/* Acción secundaria: ir a las misiones para sumar puntos extra */}
        <button
          onClick={goMissions}
          style={{
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "14px 20px",
            borderRadius: 14,
            border: "1.5px solid color-mix(in srgb, var(--primary) 45%, var(--border))",
            cursor: "pointer",
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "var(--foreground)",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          <Sparkles size={18} style={{ color: "var(--primary)" }} />
          Hacer las misiones y sumar puntos extra
        </button>

        <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", margin: "16px 0 0" }}>
          Tranqui: podés descargar tu documento cuando quieras desde esta misma página.
        </p>
      </div>
    </div>
  );
}
