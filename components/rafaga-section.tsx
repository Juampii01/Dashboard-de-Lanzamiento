"use client";

import { useEffect, useState } from "react";

export interface RafagaMission {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  points_reward: number;
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

function RafagaCard({ mission, alreadyClaimed }: { mission: RafagaMission; alreadyClaimed: boolean }) {
  const [status, setStatus] = useState<"upcoming" | "active" | "expired">(getStatus(mission));
  const [countdown, setCountdown] = useState("");
  const [claimed, setClaimed] = useState(alreadyClaimed);
  const [loading, setLoading] = useState(false);

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

  const handleClaim = async () => {
    if (loading || claimed) return;
    setLoading(true);
    const res = await fetch("/api/missions/rafaga/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rafaga_id: mission.id }),
    });
    const json = await res.json() as { ok?: boolean; awarded?: boolean; delta?: number; total?: number };
    setLoading(false);
    if (json.ok) {
      setClaimed(true);
      if (json.awarded && json.delta) {
        window.dispatchEvent(new CustomEvent("xp-gained", {
          detail: { delta: json.delta, total: json.total, source: "rafaga" },
        }));
      }
    }
  };

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

      {mission.description && (
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
          {mission.description}
        </p>
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

        {status === "active" && (
          claimed ? (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
              color: "var(--success)", background: "color-mix(in srgb, var(--success) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--success) 35%, transparent)",
              borderRadius: 999, padding: "5px 14px",
            }}>✓ +{mission.points_reward.toLocaleString()} pts</span>
          ) : (
            <button
              onClick={handleClaim}
              disabled={loading}
              style={{
                padding: "8px 18px",
                background: "var(--primary)", border: "none",
                borderRadius: 8, color: "var(--primary-foreground)",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "..." : `Reclamar +${mission.points_reward.toLocaleString()} pts →`}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export function RafagaSection({
  rafagas,
  claimedIds,
}: {
  rafagas: RafagaMission[];
  claimedIds: string[];
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
        />
      ))}
    </div>
  );
}
