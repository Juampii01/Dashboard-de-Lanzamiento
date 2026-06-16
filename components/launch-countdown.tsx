"use client";

import { useEffect, useState } from "react";

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
 * Contador de desbloqueo — se renderiza DENTRO del dashboard (no es overlay).
 * Se usa para el bloqueo por día (visible pero bloqueado) y para el aviso de
 * lanzamiento. Al llegar a 0 recarga para que el server re-evalúe y desbloquee.
 */
export function LaunchCountdown({
  targetIso,
  kicker = "Govbidder Challenge",
  title,
  subtitle,
}: {
  targetIso: string;
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
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
    { value: t.days, label: "Días" },
    { value: t.hours, label: "Horas" },
    { value: t.mins, label: "Min" },
    { value: t.secs, label: "Seg" },
  ];

  return (
    <div
      style={{
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", gap: 20, padding: "clamp(28px, 6vw, 60px) 24px",
        borderRadius: 20, minHeight: "min(60vh, 520px)",
        background: "radial-gradient(700px circle at 50% 0%, rgba(228,45,44,0.12), transparent 60%), linear-gradient(160deg, #0d1a3d 0%, #080f24 100%)",
        border: "1px solid rgba(228,45,44,0.25)",
      }}
    >
      <div style={{ background: "#fff", borderRadius: 16, padding: "10px 16px", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/halcon.png" alt="" style={{ height: 60, width: "auto", display: "block" }} />
      </div>

      <p style={{
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800,
        letterSpacing: "0.16em", textTransform: "uppercase", color: "#E42D2C",
      }}>
        {kicker}
      </p>

      <h2 style={{
        fontFamily: "var(--font-display)", fontSize: "clamp(22px, 4.5vw, 36px)", fontWeight: 800,
        color: "#fff", lineHeight: 1.12, margin: 0, maxWidth: "20ch",
      }}>
        {title}
      </h2>

      {subtitle && (
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", maxWidth: "48ch", margin: 0 }}>
          {subtitle}
        </p>
      )}

      <div style={{ display: "flex", gap: "clamp(8px, 2.2vw, 16px)", marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
        {blocks.map((b) => (
          <div key={b.label} style={{
            minWidth: 74, padding: "14px 12px", borderRadius: 14,
            background: "rgba(228,45,44,0.10)", border: "1px solid rgba(228,45,44,0.35)",
            boxShadow: "0 0 24px -8px rgba(228,45,44,0.45)",
          }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "clamp(28px, 6vw, 42px)", fontWeight: 900,
              color: "#E42D2C", lineHeight: 1, fontVariantNumeric: "tabular-nums",
              textShadow: "0 0 20px rgba(228,45,44,0.5)",
            }}>
              {String(b.value).padStart(2, "0")}
            </div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)", marginTop: 7,
            }}>
              {b.label}
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
        Se desbloquea el <strong style={{ color: "#fff" }}>{fechaTexto}</strong> (hora Miami).
      </p>
    </div>
  );
}
