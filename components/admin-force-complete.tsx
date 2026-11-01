"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { flyPoints } from "@/lib/wow-effects";

interface AdminForceCompleteProps {
  day: number;
  isCompleted: boolean;
  isAdmin: boolean;
}

export function AdminForceComplete({ day, isCompleted, isAdmin }: AdminForceCompleteProps) {
  const router = useRouter();
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
            `+${data.pointsAwarded} pts`
          );
          window.dispatchEvent(new CustomEvent("xp-gained", {
            detail: { delta: data.pointsAwarded, total: data.total, source: "day" },
          }));
        }
        // router.refresh() en lugar de reload — no desmonta el ProgressBar
        setTimeout(() => router.refresh(), 600);
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
        // data.xpRemoved (no data.pointsRemoved — era typo)
        if (data.xpRemoved > 0) {
          window.dispatchEvent(new CustomEvent("xp-gained", {
            detail: { delta: -data.xpRemoved, total: data.newTotal, source: "day" },
          }));
        }
        // router.refresh() en lugar de reload — preserva el estado del ProgressBar
        setTimeout(() => router.refresh(), 400);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  const btnBase: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: "8px",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.5 : 1,
    transition: "opacity 0.2s",
    border: "1px solid",
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
        Admin
      </span>
      {/* Realizar */}
      <button
        onClick={handleForceComplete}
        disabled={loading || done}
        style={{
          ...btnBase,
          background: done ? "color-mix(in srgb, var(--success) 10%, transparent)" : "color-mix(in srgb, var(--destructive) 10%, transparent)",
          borderColor: done ? "var(--success)" : "var(--destructive)",
          color: done ? "var(--success)" : "var(--destructive)",
        }}
        title="Admin: forzar completado del día"
      >
        {loading && !done ? "⏳ ..." : done ? `✓ Día ${day} completado` : `Marcar Día ${day} como completo`}
      </button>

      {/* Descompletar — solo visible si está completado */}
      {done && (
        <button
          onClick={handleUncomplete}
          disabled={loading}
          style={{
            ...btnBase,
            background: "transparent",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
          title="Admin: descompletar este día"
        >
          {loading ? "⏳ ..." : `↺ Desmarcar`}
        </button>
      )}
    </div>
  );
}
