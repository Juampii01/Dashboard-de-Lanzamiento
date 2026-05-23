"use client";

import { useState } from "react";
import { flyPoints } from "@/lib/wow-effects";

interface AdminForceCompleteProps {
  day: number;
  isCompleted: boolean;
  isAdmin: boolean;
}

export function AdminForceComplete({ day, isCompleted, isAdmin }: AdminForceCompleteProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(isCompleted);

  if (!isAdmin) return null;

  async function handleForceComplete() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/force-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
        if (data.pointsAwarded > 0) {
          flyPoints(
            window.innerWidth / 2,
            window.innerHeight / 2,
            window.innerWidth - 80,
            56,
            `+${data.pointsAwarded} XP`
          );
          window.dispatchEvent(new CustomEvent("xp-gained", {
            detail: { delta: data.pointsAwarded, total: data.total, source: "day" },
          }));
        }
        setTimeout(() => window.location.reload(), 800);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleUncomplete() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/force-complete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(false);
        if (data.pointsRemoved > 0) {
          window.dispatchEvent(new CustomEvent("xp-gained", {
            detail: { delta: -data.pointsRemoved, total: data.total, source: "day" },
          }));
        }
        setTimeout(() => window.location.reload(), 400);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  const btnBase: React.CSSProperties = {
    fontFamily: "var(--font-arcade)",
    fontSize: "9px",
    letterSpacing: "0.08em",
    padding: "5px 10px",
    borderRadius: "6px",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.5 : 1,
    transition: "opacity 0.2s",
    border: "1px solid",
  };

  return (
    <div className="flex items-center gap-2">
      {/* Realizar */}
      <button
        onClick={handleForceComplete}
        disabled={loading || done}
        style={{
          ...btnBase,
          background: done ? "rgba(0,214,122,0.1)" : "rgba(215,38,61,0.15)",
          borderColor: done ? "#00D67A" : "#D7263D",
          color: done ? "#00D67A" : "#D7263D",
        }}
        title="Admin: forzar completado del día"
      >
        {loading && !done ? "⏳ ..." : done ? `✓ DÍA ${day} COMPLETADO` : `⚡ REALIZAR DÍA ${day}`}
      </button>

      {/* Descompletar — solo visible si está completado */}
      {done && (
        <button
          onClick={handleUncomplete}
          disabled={loading}
          style={{
            ...btnBase,
            background: "rgba(255,214,10,0.1)",
            borderColor: "#FFD60A",
            color: "#FFD60A",
          }}
          title="Admin: descompletar este día"
        >
          {loading ? "⏳ ..." : `↺ DESCOMPLETAR`}
        </button>
      )}
    </div>
  );
}
