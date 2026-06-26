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
    background: "var(--card)",
    border: phase === "done"
      ? "1px solid color-mix(in srgb, var(--success) 45%, transparent)"
      : phase === "wrong" || phase === "error"
      ? "1px solid color-mix(in srgb, var(--primary) 55%, transparent)"
      : "1px solid var(--border)",
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
          color: "var(--muted-foreground)",
        }}>
          {DAY_LABELS[day.day_number]}
        </span>
        {phase === "done" ? (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            color: "var(--success)", background: "color-mix(in srgb, var(--success) 14%, transparent)",
            border: "1px solid color-mix(in srgb, var(--success) 35%, transparent)",
            borderRadius: 999, padding: "3px 11px", whiteSpace: "nowrap",
          }}>✓ +1,000 pts</span>
        ) : !day.hasKeyword ? (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
            color: "var(--muted-foreground)", background: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 999, padding: "2px 10px",
          }}>Próximamente</span>
        ) : (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 900,
            color: "var(--accent-foreground)", background: "var(--accent)",
            borderRadius: 999, padding: "4px 13px", whiteSpace: "nowrap",
            letterSpacing: "0.01em",
            boxShadow: "0 2px 10px -2px color-mix(in srgb, var(--accent) 60%, transparent)",
          }}>+1,000 pts</span>
        )}
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
        📞 Palabra clave de la llamada
      </p>

      {phase === "done" ? (
        <p style={{ fontSize: 12, color: "var(--success)", margin: 0 }}>
          ¡Keyword reclamada! +1,000 pts acreditados.
        </p>
      ) : !day.hasKeyword ? (
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
          El admin aún no configuró la keyword de este día.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Escribe la palabra clave..."
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            disabled={phase === "loading"}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            style={{
              flex: 1, minWidth: 0, padding: "8px 12px",
              background: "var(--muted)",
              border: phase === "wrong" || phase === "error" ? "1.5px solid var(--primary)" : "1.5px solid var(--input)",
              borderRadius: 8, color: "var(--foreground)",
              fontSize: 13, fontFamily: "var(--font-sans)",
              letterSpacing: "0.04em",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={phase === "loading" || !input.trim()}
            style={{
              padding: "8px 14px",
              background: "var(--primary)",
              color: "var(--primary-foreground)", border: "none", borderRadius: 8,
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
