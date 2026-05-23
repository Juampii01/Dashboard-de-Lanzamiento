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
          // Fly XP animation: from screen center up to XP pill (top-right)
          flyPoints(
            window.innerWidth / 2,
            window.innerHeight / 2,
            window.innerWidth - 80,
            56,
            `+${data.pointsAwarded} XP`
          );
          // Dispatch XP event so HUD updates
          window.dispatchEvent(new CustomEvent("xp-gained", {
            detail: { delta: data.pointsAwarded, total: data.total, source: "day" },
          }));
        }
        // Reload to reflect completed state
        setTimeout(() => window.location.reload(), 800);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleForceComplete}
      disabled={loading || done}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
      style={{
        background: done
          ? "rgba(0,214,122,0.15)"
          : "rgba(215,38,61,0.15)",
        border: `1px solid ${done ? "#00D67A" : "#D7263D"}`,
        color: done ? "#00D67A" : "#D7263D",
        fontFamily: "var(--font-arcade)",
        fontSize: "9px",
        letterSpacing: "0.08em",
      }}
      title="Admin: forzar completado del día"
    >
      {loading ? (
        <>⏳ PROCESANDO...</>
      ) : done ? (
        <>✓ DÍA {day} COMPLETADO</>
      ) : (
        <>⚡ ADMIN: REALIZAR DÍA {day}</>
      )}
    </button>
  );
}
