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
 * Banner flotante de pre-lanzamiento para usuarios (no admins).
 * NO bloquea: el usuario puede recorrer todo el dashboard ("sentir que lo tiene")
 * mientras ve un contador en rojo de marca hacia LAUNCH_ISO.
 * Al llegar a 0 recarga para que el server re-evalúe.
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
    { value: t.days, label: "D" },
    { value: t.hours, label: "H" },
    { value: t.mins, label: "M" },
    { value: t.secs, label: "S" },
  ];

  return (
    <div
      style={{
        position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)",
        zIndex: 99990, width: "min(660px, calc(100vw - 28px))",
        pointerEvents: "auto", // solo el banner capta clicks; el dashboard queda libre
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        padding: "12px 18px", borderRadius: 16,
        background: "linear-gradient(135deg, rgba(13,26,61,0.97) 0%, rgba(8,15,36,0.97) 100%)",
        border: "1px solid rgba(228,45,44,0.45)",
        boxShadow: "0 16px 40px -12px rgba(0,0,0,0.6), 0 0 28px -10px rgba(228,45,44,0.5)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }}>
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/halcon.png" alt="" style={{ height: 34, width: "auto", flexShrink: 0 }} />

        {/* Texto */}
        <div style={{ flex: "1 1 180px", minWidth: 0, textAlign: "left" }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.12em", textTransform: "uppercase", color: "#E42D2C",
          }}>
            El dashboard se desbloquea
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginTop: 1 }}>
            {fechaTexto} <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>(hora Miami)</span>
          </div>
        </div>

        {/* Contador compacto */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {blocks.map((b) => (
            <div key={b.label} style={{
              minWidth: 44, padding: "6px 8px", borderRadius: 10, textAlign: "center",
              background: "rgba(228,45,44,0.10)", border: "1px solid rgba(228,45,44,0.35)",
            }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 900, lineHeight: 1,
                color: "#E42D2C", fontVariantNumeric: "tabular-nums",
                textShadow: "0 0 14px rgba(228,45,44,0.5)",
              }}>
                {String(b.value).padStart(2, "0")}
              </div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700,
                letterSpacing: "0.1em", color: "rgba(255,255,255,0.55)", marginTop: 3,
              }}>
                {b.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
