"use client";

import { useState } from "react";

interface DayKeyword {
  day_number: number;
  hasKeyword: boolean;
  done: boolean;
}

const DAY_LABELS: Record<number, string> = {
  1: "Día 1",
  2: "Día 2",
  3: "Día 3",
  4: "Día 4",
};

function KeywordCard({ day, onClaimed }: { day: DayKeyword; onClaimed: (dayNumber: number) => void }) {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "wrong" | "error" | "done">(day.done ? "done" : "idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setPhase("loading");

    try {
      const res = await fetch("/api/missions/keywords/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_number: day.day_number, keyword: input.trim() }),
      });
      const json = await res.json() as {
        ok?: boolean; awarded?: boolean; error?: string; reason?: string; delta?: number; total?: number;
      };

      // Keyword incorrecta → permite reintento.
      if (json.error === "wrong_keyword") {
        setPhase("wrong");
        setTimeout(() => setPhase((p) => (p === "wrong" ? "idle" : p)), 2000);
        return;
      }

      // Cualquier otro fallo (award_failed, 404, 500) → reintentable.
      if (!res.ok || !json.ok) {
        setPhase("error");
        setTimeout(() => setPhase((p) => (p === "error" ? "idle" : p)), 2500);
        return;
      }

      // Acreditada con éxito o ya estaba reclamada → estado final.
      setPhase("done");
      onClaimed(day.day_number);
      if (json.awarded && json.delta) {
        window.dispatchEvent(new CustomEvent("xp-gained", {
          detail: { delta: json.delta, total: json.total, source: "keyword" },
        }));
      }
    } catch {
      setPhase("error");
      setTimeout(() => setPhase((p) => (p === "error" ? "idle" : p)), 2500);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, rgba(20,58,107,0.85) 0%, rgba(10,37,64,0.92) 100%)",
    border: phase === "done"
      ? "1px solid rgba(0,214,122,0.4)"
      : phase === "wrong" || phase === "error"
      ? "1px solid rgba(215,38,61,0.5)"
      : "1px solid #1E3A5C",
    borderRadius: 12,
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}>
          {DAY_LABELS[day.day_number]}
        </span>
        {phase === "done" && (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
            color: "#00D67A", background: "rgba(0,214,122,0.12)",
            border: "1px solid rgba(0,214,122,0.3)",
            borderRadius: 999, padding: "2px 10px",
          }}>✓ +1,000 pts</span>
        )}
        {!day.hasKeyword && phase !== "done" && (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
            color: "#8DA2C4", background: "rgba(141,162,196,0.1)",
            border: "1px solid rgba(141,162,196,0.2)",
            borderRadius: 999, padding: "2px 10px",
          }}>Próximamente</span>
        )}
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, color: "#C8D6E8", margin: 0 }}>
        📞 Palabra clave de la llamada
      </p>

      {phase === "done" ? (
        <p style={{ fontSize: 12, color: "rgba(0,214,122,0.9)", margin: 0 }}>
          ¡Keyword reclamada! +1,000 pts acreditados.
        </p>
      ) : !day.hasKeyword ? (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>
          El admin aún no configuró la keyword de este día.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Escribe la palabra clave..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={phase === "loading"}
            style={{
              flex: 1, padding: "8px 12px",
              background: "#0A2540",
              border: phase === "wrong" || phase === "error" ? "1.5px solid #E42D2C" : "1.5px solid #1E3A5C",
              borderRadius: 8, color: "#fff",
              fontSize: 13, fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={phase === "loading" || !input.trim()}
            style={{
              padding: "8px 14px",
              background: phase === "loading" ? "#1E3A5C" : "#D7263D",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              opacity: phase === "loading" || !input.trim() ? 0.6 : 1,
              fontFamily: "var(--font-sans)",
            }}
          >
            {phase === "loading" ? "..." : phase === "wrong" ? "✗ Incorrecta" : phase === "error" ? "Reintentar" : "Reclamar"}
          </button>
        </form>
      )}
    </div>
  );
}

export function KeywordCards({ days }: { days: DayKeyword[] }) {
  const [doneDays, setDoneDays] = useState<Set<number>>(
    new Set(days.filter((d) => d.done).map((d) => d.day_number))
  );

  const handleClaimed = (dayNumber: number) => {
    setDoneDays((prev) => new Set([...prev, dayNumber]));
  };

  const enriched = days.map((d) => ({ ...d, done: doneDays.has(d.day_number) }));

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 12,
    }}>
      {enriched.map((day) => (
        <KeywordCard key={day.day_number} day={day} onClaimed={handleClaimed} />
      ))}
    </div>
  );
}
