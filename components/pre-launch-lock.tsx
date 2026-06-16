"use client";

import { useEffect, useState } from "react";
import { LAUNCH_ISO } from "@/lib/launch";

function diffParts(targetMs: number) {
  const total = Math.max(0, targetMs - Date.now());
  const s = Math.floor(total / 1000);
  return {
    total,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

/**
 * Pantalla de pre-lanzamiento que reemplaza TODO el dashboard para usuarios
 * (no admins) hasta LAUNCH_ISO. Muestra un contador en rojo de marca.
 * Al llegar a 0 recarga para que el layout (server) re-evalúe y desbloquee.
 */
export function PreLaunchLock({ targetIso = LAUNCH_ISO }: { targetIso?: string }) {
  const targetMs = Date.parse(targetIso);
  const [t, setT] = useState(() => diffParts(targetMs));

  useEffect(() => {
    const id = setInterval(() => {
      const next = diffParts(targetMs);
      setT(next);
      if (next.total <= 0) {
        clearInterval(id);
        // El momento llegó → recargar para que el server desbloquee el dashboard.
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const fechaTexto = new Date(targetMs).toLocaleString("es-US", {
    timeZone: "America/New_York",
    day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true,
  });

  const blocks: { value: number; label: string }[] = [
    { value: t.days, label: "Días" },
    { value: t.hours, label: "Horas" },
    { value: t.mins, label: "Min" },
    { value: t.secs, label: "Seg" },
  ];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, textAlign: "center", overflow: "auto",
        background: "radial-gradient(900px circle at 50% 25%, rgba(228,45,44,0.10), transparent 60%), linear-gradient(160deg, #0d1a3d 0%, #080f24 100%)",
      }}
    >
      <div style={{ width: "min(680px, 100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        {/* Logo */}
        <div style={{ background: "#fff", borderRadius: 18, padding: "12px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/halcon.png" alt="Govbidder Challenge" style={{ height: 78, width: "auto", display: "block" }} />
        </div>

        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
          letterSpacing: "0.18em", textTransform: "uppercase", color: "#E42D2C",
        }}>
          Govbidder Challenge
        </p>

        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 800,
          color: "#fff", lineHeight: 1.1, margin: 0,
        }}>
          El dashboard se desbloquea pronto
        </h1>

        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.78)", maxWidth: "46ch", margin: 0 }}>
          Estamos terminando de prepararlo todo. Falta poco para que arranque tu desafío.
        </p>

        {/* Contador */}
        <div style={{ display: "flex", gap: "clamp(8px, 2.5vw, 18px)", marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {blocks.map((b) => (
            <div key={b.label} style={{
              minWidth: 78, padding: "16px 14px", borderRadius: 16,
              background: "rgba(228,45,44,0.10)", border: "1px solid rgba(228,45,44,0.35)",
              boxShadow: "0 0 28px -8px rgba(228,45,44,0.45)",
            }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "clamp(30px, 7vw, 46px)", fontWeight: 900,
                color: "#E42D2C", lineHeight: 1, fontVariantNumeric: "tabular-nums",
                textShadow: "0 0 22px rgba(228,45,44,0.5)",
              }}>
                {String(b.value).padStart(2, "0")}
              </div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.65)", marginTop: 8,
              }}>
                {b.label}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
          Se habilita el <strong style={{ color: "#fff" }}>{fechaTexto}</strong> (hora Miami).
        </p>
      </div>
    </div>
  );
}
