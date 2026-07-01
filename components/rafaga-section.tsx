"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Send } from "lucide-react";
import { MissionText } from "@/components/mission-text";

export interface RafagaMission {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  points_reward: number;
  image_url?: string | null;
}

function getStatus(mission: RafagaMission): "upcoming" | "active" | "expired" {
  const now = Date.now();
  const start = new Date(mission.starts_at).getTime();
  const end = start + mission.duration_minutes * 60 * 1000;
  if (now < start) return "upcoming";
  if (now <= end) return "active";
  return "expired";
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function RafagaCard({ mission, alreadyClaimed, over10k }: { mission: RafagaMission; alreadyClaimed: boolean; over10k: boolean }) {
  // Sobre 10.000 pts la ráfaga suma la mitad → mostrar el valor real.
  const shownPts = over10k ? Math.floor(mission.points_reward / 2) : mission.points_reward;
  const [status, setStatus] = useState<"upcoming" | "active" | "expired">(getStatus(mission));
  const [countdown, setCountdown] = useState("");
  const [claimed, setClaimed] = useState(alreadyClaimed);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const start = new Date(mission.starts_at).getTime();
      const end = start + mission.duration_minutes * 60 * 1000;
      const newStatus = now < start ? "upcoming" : now <= end ? "active" : "expired";
      setStatus(newStatus);
      if (newStatus === "upcoming") setCountdown(formatCountdown(start - now));
      else if (newStatus === "active") setCountdown(formatCountdown(end - now));
      else setCountdown("");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mission]);

  async function send(payload: object) {
    if (busy || claimed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/missions/rafaga/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rafaga_id: mission.id, ...payload }),
      });
      const json = await res.json() as { ok?: boolean; awarded?: boolean; delta?: number; total?: number; error?: string };
      if (!res.ok || !json.ok) {
        setError(
          json.error === "expired" ? "La ventana de esta misión ya cerró."
          : json.error === "not_open_yet" ? "La misión todavía no abrió."
          : json.error === "file_too_large" ? "La imagen supera los 5 MB."
          : json.error === "invalid_image" ? "Formato de imagen no válido."
          : json.error === "empty" ? "Escribí una respuesta o subí una captura."
          : "No pudimos enviar tu respuesta. Probá de nuevo."
        );
        return;
      }
      setClaimed(true);
      if (json.awarded && json.delta) {
        window.dispatchEvent(new CustomEvent("xp-gained", {
          detail: { delta: json.delta, total: json.total, source: "rafaga" },
        }));
      }
    } catch {
      setError("No pudimos enviar tu respuesta. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("La imagen no puede superar 5 MB."); return; }
    const base64 = await new Promise<string>((resolve, reject) => {
      const rd = new FileReader();
      rd.onload = () => resolve(rd.result as string);
      rd.onerror = reject;
      rd.readAsDataURL(file);
    });
    await send({ base64 });
  }

  function handleText() {
    const t = text.trim();
    if (!t) { setError("Escribí una respuesta o pegá un link."); return; }
    const kind = /^https?:\/\//i.test(t) ? "link" : "text";
    send({ text: t, kind });
  }

  const borderColor =
    status === "active" ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "var(--border)";

  // Badge: activa = pill dorado sólido (texto navy); resto = muted.
  const isActive = status === "active";
  const badgeColor = isActive ? "var(--accent-foreground)" : "var(--muted-foreground)";
  const badgeBg = isActive ? "var(--accent)" : "var(--muted)";
  const badgeBorder = isActive ? "var(--accent)" : "var(--border)";

  const statusLabel =
    status === "active" ? "⚡ Activa ahora" :
    status === "upcoming" ? "⏳ Próximamente" :
    "🔒 Cerrada";

  return (
    <div style={{
      background: "var(--card)",
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: "18px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontWeight: 700, color: "var(--foreground)", fontSize: 14, margin: 0 }}>
          {mission.title}
        </p>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
          color: badgeColor, background: badgeBg,
          border: `1px solid ${badgeBorder}`,
          borderRadius: 999, padding: "2px 10px",
          whiteSpace: "nowrap", flexShrink: 0,
        }}>{statusLabel}</span>
      </div>

      {mission.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mission.image_url}
          alt=""
          style={{ width: "100%", height: "auto", borderRadius: 8, display: "block" }}
        />
      )}

      {mission.description && (
        <MissionText text={mission.description} fontSize={12.5} />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        {status === "upcoming" && countdown && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
            Abre en: <strong style={{ color: "var(--foreground)" }}>{countdown}</strong>
          </p>
        )}
        {status === "active" && !claimed && countdown && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
            Cierra en: <strong style={{ color: "var(--foreground)" }}>{countdown}</strong>
          </p>
        )}
        {status === "expired" && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>Esta misión ya cerró.</p>
        )}
        {status === "active" && claimed && (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            color: "var(--success)", background: "color-mix(in srgb, var(--success) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--success) 35%, transparent)",
            borderRadius: 999, padding: "5px 14px",
          }}>✓ ¡Enviada! +{shownPts.toLocaleString()} pts</span>
        )}
      </div>

      {/* Envío de respuesta (link/texto o captura) mientras la ráfaga está activa. */}
      {status === "active" && !claimed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pegá un link o escribí tu respuesta acá…"
            disabled={busy}
            style={{
              width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 52,
              background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8,
              color: "var(--foreground)", fontSize: 13.5, padding: "9px 11px", outline: "none",
              fontFamily: "var(--font-sans)", lineHeight: 1.4,
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleText}
              disabled={busy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "9px 16px", borderRadius: 8, border: "none",
                cursor: busy ? "wait" : "pointer", fontSize: 13, fontWeight: 800,
                background: "var(--primary)", color: "var(--primary-foreground)",
              }}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Enviar y ganar +{shownPts.toLocaleString()} pts
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "9px 14px", borderRadius: 8, cursor: busy ? "wait" : "pointer",
                fontSize: 13, fontWeight: 700, color: "var(--foreground)",
                background: "var(--muted)", border: "1px solid var(--border)",
              }}
            >
              <Camera size={15} /> Subir captura
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", margin: 0 }}>
            Respondé con un link, un texto o una captura (PNG/JPG, máx 5 MB) para ganar los puntos.
          </p>
          {error && <p style={{ fontSize: 12.5, color: "var(--destructive)", margin: 0 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

export function RafagaSection({
  rafagas,
  claimedIds,
  over10k = false,
}: {
  rafagas: RafagaMission[];
  claimedIds: string[];
  over10k?: boolean;
}) {
  if (rafagas.length === 0) {
    return (
      <div style={{
        padding: "20px",
        background: "var(--muted)",
        border: "1px dashed var(--border)",
        borderRadius: 12,
        textAlign: "center",
      }}>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
          No hay misiones ráfaga programadas por el momento.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rafagas.map((r) => (
        <RafagaCard
          key={r.id}
          mission={r}
          alreadyClaimed={claimedIds.includes(r.id)}
          over10k={over10k}
        />
      ))}
    </div>
  );
}
