"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createParticleBurst, flyPoints, triggerFlash, triggerScreenShake } from "@/lib/wow-effects";

interface DevTestBarProps {
  day: number;
  isCompleted: boolean;
}

export function DevTestBar({ day, isCompleted }: DevTestBarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showFinish, setShowFinish] = useState(false);

  async function markDone() {
    setLoading(true);

    // Call both APIs in parallel: cookie (dev UI) + real Supabase XP
    const [, xpRes] = await Promise.all([
      fetch("/api/dev/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      }),
      fetch("/api/xp/complete-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      }).then((r) => r.json()).catch(() => null),
    ]);

    // If XP was awarded, dispatch event so PointsHUD updates live
    if (xpRes?.ok && xpRes.pointsAwarded > 0) {
      window.dispatchEvent(
        new CustomEvent("xp-gained", {
          detail: { delta: xpRes.pointsAwarded, total: xpRes.total, source: "day" },
        })
      );
    }

    // Cinematic KO finish sequence
    setShowFinish(true);
    triggerFlash("rgba(255,214,10,0.32)");
    triggerScreenShake();

    // Particle burst from center screen
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    createParticleBurst(cx, cy, "gold", 28);
    setTimeout(() => createParticleBurst(cx, cy, "cyan", 14), 220);

    // Flying +25 XP label toward top of screen (where PointsHUD lives)
    flyPoints(cx, cy, cx, 110, `+25 XP 🏆 DÍA ${day}`);

    await new Promise((r) => setTimeout(r, 1200));
    setShowFinish(false);

    router.push("/dashboard");
    router.refresh();
  }

  async function resetAll() {
    setLoading(true);
    await fetch("/api/dev/complete", { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
    {/* Cinematic KO finish overlay */}
    {showFinish && (
      <>
        {/* Gold radial flash */}
        <div
          className="completion-flash"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,214,10,0.30) 0%, rgba(255,214,10,0.08) 50%, transparent 80%)",
          }}
        />
        {/* Title card */}
        <div
          className="completion-title"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            zIndex: 99999,
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-arcade)",
              fontSize: "clamp(14px, 3vw, 22px)",
              color: "#FFD60A",
              textShadow:
                "0 0 20px rgba(255,214,10,0.9), 0 0 40px rgba(255,214,10,0.5), 0 0 60px rgba(255,214,10,0.3)",
              letterSpacing: "0.12em",
              whiteSpace: "nowrap",
            }}
          >
            ★ DÍA {day} COMPLETADO ★
          </div>
          <div
            style={{
              fontFamily: "var(--font-arcade)",
              fontSize: "clamp(8px, 1.8vw, 13px)",
              color: "#00D67A",
              marginTop: "10px",
              textShadow: "0 0 12px rgba(0,214,122,0.8)",
              letterSpacing: "0.16em",
            }}
          >
            +25% PROGRESO
          </div>
        </div>
      </>
    )}

    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "rgba(10,37,64,0.92)",
        border: "1px solid #FFD60A",
        borderRadius: "12px",
        padding: "10px 16px",
        zIndex: 9999,
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,214,10,0.2)",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-arcade)",
          fontSize: "7px",
          color: "#FFD60A",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        ⚡ DEV
      </span>

      <button
        onClick={markDone}
        disabled={loading || isCompleted}
        style={{
          background: isCompleted ? "#1a3a1a" : "#00D67A",
          color: isCompleted ? "#00D67A" : "#000",
          border: isCompleted ? "1px solid #00D67A" : "none",
          borderRadius: "8px",
          padding: "6px 14px",
          fontWeight: 700,
          fontSize: "12px",
          cursor: isCompleted ? "default" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "all 0.2s",
        }}
      >
        {isCompleted ? "✓ Día completado" : `✓ Completar Día ${day}`}
      </button>

      <button
        onClick={resetAll}
        disabled={loading}
        style={{
          background: "transparent",
          color: "#D7263D",
          border: "1px solid #D7263D",
          borderRadius: "8px",
          padding: "6px 12px",
          fontWeight: 600,
          fontSize: "12px",
          cursor: "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "all 0.2s",
        }}
      >
        Reset
      </button>
    </div>
    </>
  );
}
