"use client";

import { useEffect, useState } from "react";
import { Video } from "lucide-react";

type Props = { id: string; url: string; startsAt: string; points: number; canEarn: boolean; isAdmin?: boolean };

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}:${String(sec).padStart(2, "0")}`;
}

export function CallBanner({ id, url, startsAt, points, canEarn, isAdmin = false }: Props) {
  const lsKey = `govbidder_call_banner_${id}`;
  const [now, setNow] = useState<number | null>(null);
  const [joined, setJoined] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    try { setJoined(!!localStorage.getItem(lsKey)); } catch {}
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lsKey]);

  const start = Date.parse(startsAt);
  const started = now !== null && now >= start;
  const time = new Date(start).toLocaleTimeString("es", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

  async function join() {
    window.open(url, "_blank", "noopener,noreferrer");
    if (!canEarn || joined) return;
    try {
      const res = await fetch("/api/xp/call-banner", { method: "POST" });
      const d = (await res.json()) as { awarded?: boolean; already_claimed?: boolean; delta?: number; total?: number };
      if (d.awarded || d.already_claimed) {
        setJoined(true);
        try { localStorage.setItem(lsKey, "1"); } catch {}
      }
      if (d.awarded && d.delta && d.total != null) {
        window.dispatchEvent(new CustomEvent("xp-gained", { detail: { delta: d.delta, total: d.total, source: "call" } }));
      }
    } catch {}
  }

  if (hidden) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Llamada en vivo"
      style={{
        position: "fixed", inset: 0, zIndex: 99970,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, overflowY: "auto",
        background: "radial-gradient(circle at 50% 30%, #3A0A12 0%, #12060A 55%, #05070F 100%)",
        color: "#fff", textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#D7263D", borderRadius: 999, padding: "6px 16px",
          fontSize: 14, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
        }}>
          🔴 {started ? "En vivo ahora" : "Llamada en vivo"}
        </span>
        <h1 style={{ fontSize: "clamp(28px, 6vw, 44px)", fontWeight: 900, lineHeight: 1.15, margin: 0 }}>
          {started ? "¡La llamada ya empezó!" : <>La llamada arranca a las {time}<br /><span style={{ fontSize: "0.55em", fontWeight: 700, opacity: 0.85 }}>(hora de Miami)</span></>}
        </h1>
        {!started && now !== null && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(40px, 10vw, 72px)", fontWeight: 900, margin: 0, color: "#FFD60A", lineHeight: 1 }}>
            {fmt(start - now)}
          </p>
        )}
        <p style={{ fontSize: 19, lineHeight: 1.5, margin: 0, opacity: 0.92 }}>
          {started ? "Entra ahora desde este botón." : "Ve preparando todo: cuaderno, cámara y buena conexión. Entra desde este botón."}
        </p>
        {canEarn && points > 0 && (
          <p style={{ fontSize: 20, fontWeight: 800, margin: 0, color: joined ? "#4ADE80" : "#FFD60A" }}>
            {joined ? `✓ Ya sumaste +${points} puntos` : `Si entras desde aquí sumas +${points} puntos`}
          </p>
        )}
        <button
          type="button"
          onClick={join}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "#D7263D", color: "#fff", border: "none", borderRadius: 14,
            padding: "18px 34px", fontSize: 22, fontWeight: 900, cursor: "pointer",
            boxShadow: "0 0 0 6px rgba(215,38,61,0.25), 0 12px 40px rgba(215,38,61,0.45)",
          }}
        >
          <Video size={26} />
          {joined ? "Volver a entrar a la llamada" : canEarn && points > 0 ? `Entrar a la llamada (+${points} pts)` : "Entrar a la llamada"}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setHidden(true)}
            style={{ marginTop: 6, background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 14, textDecoration: "underline", cursor: "pointer" }}
          >
            Ocultar (solo admins)
          </button>
        )}
      </div>
    </div>
  );
}
