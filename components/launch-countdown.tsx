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
 * Overlay de contador — se renderiza ENCIMA del contenido del día/inicio, semi-
 * transparente (el contenido se ve detrás) y bloquea la interacción con esa zona.
 * La navegación (tabs/sidebar del layout) queda libre porque el overlay es
 * `absolute` dentro del contenido, no fixed sobre toda la pantalla.
 * Debe ir dentro de un contenedor `position: relative`. Al llegar a 0 recarga.
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
  // La fecha legible se calcula tras montar para usar la zona horaria LOCAL del
  // navegador de cada usuario (evita además mismatch de hidratación SSR).
  const [fechaTexto, setFechaTexto] = useState("");

  useEffect(() => {
    setFechaTexto(
      new Date(targetMs).toLocaleString(undefined, {
        weekday: "long", day: "numeric", month: "long",
        hour: "numeric", minute: "2-digit", timeZoneName: "short",
      })
    );
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

  const blocks: { value: number; label: string }[] = [
    { value: t.days, label: "Días" },
    { value: t.hours, label: "Horas" },
    { value: t.mins, label: "Min" },
    { value: t.secs, label: "Seg" },
  ];

  return (
    <div
      aria-hidden
      style={{
        position: "absolute", inset: 0, zIndex: 50,
        pointerEvents: "auto", // bloquea la interacción con el contenido de abajo
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "clamp(20px, 6vh, 64px) 14px",
        // Bien semi-transparente: el dashboard se ve nítido detrás (sin blur).
        background: "rgba(8,15,36,0.22)",
        borderRadius: 16,
      }}
    >
      <div
        style={{
          position: "sticky", top: "clamp(16px, 8vh, 70px)",
          width: "min(640px, 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", gap: 18, padding: "clamp(24px, 4vw, 44px) 24px",
          borderRadius: 20,
          background: "linear-gradient(160deg, rgba(13,26,61,0.94) 0%, rgba(8,15,36,0.94) 100%)",
          border: "1px solid rgba(228,45,44,0.4)",
          boxShadow: "0 24px 70px -18px rgba(0,0,0,0.7), 0 0 36px -12px rgba(228,45,44,0.45)",
        }}
      >
        <div style={{ background: "#fff", borderRadius: 14, padding: "8px 14px", boxShadow: "0 6px 22px rgba(0,0,0,0.3)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/halcon.png" alt="" style={{ height: 52, width: "auto", display: "block" }} />
        </div>

        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 800,
          letterSpacing: "0.16em", textTransform: "uppercase", color: "#E42D2C",
        }}>
          {kicker}
        </p>

        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: "clamp(20px, 4vw, 32px)", fontWeight: 800,
          color: "#fff", lineHeight: 1.12, margin: 0, maxWidth: "20ch",
        }}>
          {title}
        </h2>

        {subtitle && (
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.78)", maxWidth: "46ch", margin: 0 }}>
            {subtitle}
          </p>
        )}

        <div style={{ display: "flex", gap: "clamp(7px, 2vw, 14px)", marginTop: 2, flexWrap: "wrap", justifyContent: "center" }}>
          {blocks.map((b) => (
            <div key={b.label} style={{
              minWidth: 66, padding: "12px 10px", borderRadius: 13,
              background: "rgba(228,45,44,0.12)", border: "1px solid rgba(228,45,44,0.38)",
              boxShadow: "0 0 22px -8px rgba(228,45,44,0.5)",
            }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "clamp(26px, 5.5vw, 38px)", fontWeight: 900,
                color: "#E42D2C", lineHeight: 1, fontVariantNumeric: "tabular-nums",
                textShadow: "0 0 18px rgba(228,45,44,0.5)",
              }}>
                {String(b.value).padStart(2, "0")}
              </div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.6)", marginTop: 6,
              }}>
                {b.label}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginTop: 2, minHeight: 18 }}>
          {fechaTexto && (
            <>Se desbloquea el <strong style={{ color: "#fff" }}>{fechaTexto}</strong> (tu hora local).</>
          )}
        </p>
      </div>
    </div>
  );
}
