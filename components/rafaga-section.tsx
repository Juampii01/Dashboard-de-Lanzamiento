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
    status === "active" ? "rgba(255,215,0,0.4)" :
    status === "upcoming" ? "rgba(141,162,196,0.3)" :
    "rgba(100,127,168,0.15)";

  const badgeColor =
    status === "active" ? "#FFD700" :
    status === "upcoming" ? "#8DA2C4" :
    "#647FA8";

  const badgeBg =
    status === "active" ? "rgba(255,215,0,0.1)" :
    status === "upcoming" ? "rgba(141,162,196,0.08)" :
    "rgba(100,127,168,0.05)";

  const statusLabel =
    status === "active" ? "⚡ Activa ahora" :
    status === "upcoming" ? "⏳ Próximamente" :
    "🔒 Cerrada";

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(20,58,107,0.85) 0%, rgba(10,37,64,0.92) 100%)",
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: "18px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontWeight: 700, color: "#C8D6E8", fontSize: 14, margin: 0 }}>
          {mission.title}
        </p>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
          color: badgeColor, background: badgeBg,
          border: `1px solid ${badgeColor}40`,
          borderRadius: 999, padding: "2px 10px",
          whiteSpace: "nowrap", flexShrink: 0,
        }}>{statusLabel}</span>
      </div>

      {mission.description && (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: 0 }}>
          {mission.description}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        {status === "upcoming" && countdown && (
          <p style={{ fontSize: 12, color: "#8DA2C4", margin: 0 }}>
            Abre en: <strong style={{ color: "#C8D6E8" }}>{countdown}</strong>
          </p>
        )}
        {status === "active" && !claimed && countdown && (
          <p style={{ fontSize: 12, color: "#FFD700", margin: 0 }}>
            Cierra en: <strong>{countdown}</strong>
          </p>
        )}
        {status === "expired" && (
          <p style={{ fontSize: 12, color: "#647FA8", margin: 0 }}>Esta misión ya cerró.</p>
        )}

        {status === "active" && (
          claimed ? (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
              color: "#00D67A", background: "rgba(0,214,122,0.1)",
              border: "1px solid rgba(0,214,122,0.3)",
              borderRadius: 999, padding: "5px 14px",
            }}>✓ +{mission.points_reward.toLocaleString()} pts</span>
          ) : (
            <button
              onClick={handleClaim}
              disabled={loading}
              style={{
                padding: "8px 18px",
                background: "#D7263D", border: "none",
                borderRadius: 8, color: "#fff",
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
        background: "rgba(10,37,64,0.5)",
        border: "1px dashed #1E3A5C",
        borderRadius: 12,
        textAlign: "center",
      }}>
        <p style={{ fontSize: 13, color: "#8DA2C4", margin: 0 }}>
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
