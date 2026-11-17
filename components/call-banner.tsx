"use client";

import { useEffect, useState } from "react";
import { Video } from "lucide-react";

type Props = { id: string; url: string; startsAt: string; points: number; canEarn: boolean };

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}:${String(sec).padStart(2, "0")}`;
}

export function CallBanner({ id, url, startsAt, points, canEarn }: Props) {
  const lsKey = `govbidder_call_banner_${id}`;
  const [now, setNow] = useState<number | null>(null);
  const [joined, setJoined] = useState(false);

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

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "10px 16px",
        padding: "10px 20px",
        background: "linear-gradient(90deg, #A11D2E 0%, #D7263D 100%)",
        color: "#fff", textAlign: "center",
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>
        🔴 {started
          ? <>¡La llamada en vivo ya empezó! Entra ahora.</>
          : <>La llamada en vivo arranca a las <strong>{time} (hora de Miami)</strong>{now !== null && <> · faltan <strong style={{ fontFamily: "var(--font-mono)" }}>{fmt(start - now)}</strong></>}. Ve preparando todo.</>}
        {canEarn && points > 0 && !joined && <> Si entras desde este botón sumas <strong>+{points} puntos</strong>.</>}
      </span>
      <button
        type="button"
        onClick={join}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#fff", color: "#A11D2E", border: "none", borderRadius: 999,
          padding: "9px 18px", fontSize: 15, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        <Video size={18} />
        {joined ? `Entrar a la llamada ✓ +${points} sumados` : canEarn && points > 0 ? `Entrar a la llamada (+${points} pts)` : "Entrar a la llamada"}
      </button>
    </div>
  );
}
