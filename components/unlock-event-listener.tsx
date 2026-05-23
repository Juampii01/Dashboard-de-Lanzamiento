"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import confetti from "canvas-confetti";

interface UnlockPayload {
  dayNumber: number;
}

export function UnlockEventListener() {
  const [event, setEvent] = useState<UnlockPayload | null>(null);
  const [fading, setFading] = useState(false);

  const fire = useCallback((dayNumber: number) => {
    setEvent({ dayNumber });
    setFading(false);

    // Staggered confetti burst in brand colors
    const colors = ["#D7263D", "#FFD60A", "#00D67A", "#FFFFFF"];
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 }, colors });
    setTimeout(() => confetti({ particleCount: 70, spread: 60, origin: { x: 0.25, y: 0.5 }, colors }), 280);
    setTimeout(() => confetti({ particleCount: 70, spread: 60, origin: { x: 0.75, y: 0.5 }, colors }), 500);
  }, []);

  const dismiss = useCallback(() => {
    setFading(true);
    setTimeout(() => { setEvent(null); setFading(false); }, 650);
  }, []);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);

    const channel = supabase
      .channel("unlock_events_global")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "admin_toggles" },
        (payload) => {
          const n = payload.new as { day_number: number; is_globally_unlocked: boolean };
          const o = payload.old as { is_globally_unlocked: boolean };
          if (n.is_globally_unlocked && !o.is_globally_unlocked) fire(n.day_number);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fire]);

  if (!event) return null;

  return (
    <div
      className="fixed inset-0 z-[998] flex items-center justify-center transition-opacity duration-700"
      style={{
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(10px)",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
      }}
      onClick={dismiss}
    >
      <div className="text-center select-none px-8 space-y-5">
        <div className="text-[80px] leading-none" style={{ filter: "drop-shadow(0 0 24px rgba(255,214,10,0.5))" }}>
          🔓
        </div>

        <div>
          <p
            style={{
              fontFamily: "var(--font-arcade)",
              fontSize: "11px",
              color: "#D7263D",
              letterSpacing: "0.2em",
              marginBottom: "14px",
            }}
          >
            DESBLOQUEADO
          </p>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.6rem",
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.1,
            }}
          >
            Día {event.dayNumber}
            <br />
            <span style={{ color: "#FFD60A" }}>disponible</span>
          </h2>
          <p className="mt-3 text-sm" style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}>
            ¡El nuevo reto ya está activo para todos!
          </p>
        </div>

        <div
          className="inline-block px-6 py-2.5 rounded-lg font-bold text-sm"
          style={{ background: "#D7263D", color: "#FFFFFF", fontFamily: "var(--font-sans)" }}
        >
          Ir al Día {event.dayNumber} →
        </div>

        <p className="text-[10px]" style={{ color: "#3D4E6B", fontFamily: "var(--font-mono)" }}>
          Click para continuar
        </p>
      </div>
    </div>
  );
}
