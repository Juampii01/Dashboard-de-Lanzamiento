"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LS_KEYS_TO_CLEAR = [
  "govbidder_avatar_xp_at",
  "govbidder_joined_call_day_1",
  "govbidder_joined_call_day_2",
  "govbidder_joined_call_day_3",
  "govbidder_joined_call_day_4",
  "govbidder_tour_v1",
  "govbidder_tour_step_v1",
  "gov_boot_v1",
];

export function ResetDashboardButton() {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "confirm" | "loading" | "done">("idle");

  const handleFirstClick = () => setPhase("confirm");
  const handleCancel     = () => setPhase("idle");

  const handleConfirm = async () => {
    setPhase("loading");
    try {
      const res  = await fetch("/api/admin/reset-all", { method: "POST" });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Error desconocido");

      // Clear all client-side state
      LS_KEYS_TO_CLEAR.forEach((k) => localStorage.removeItem(k));

      setPhase("done");
      setTimeout(() => {
        router.refresh();
        setPhase("idle");
      }, 1200);
    } catch {
      setPhase("idle");
    }
  };

  if (phase === "confirm") {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className="text-[10px] font-bold"
          style={{ color: "#FFD60A", fontFamily: "var(--font-mono)" }}
        >
          ¿Seguro?
        </span>
        <button
          onClick={handleConfirm}
          className="text-[10px] font-bold px-2 py-0.5 rounded transition-colors"
          style={{
            background: "rgba(215,38,61,0.2)",
            color: "#D7263D",
            border: "1px solid rgba(215,38,61,0.4)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Sí, resetear
        </button>
        <button
          onClick={handleCancel}
          className="text-[10px] px-2 py-0.5 rounded transition-colors"
          style={{
            background: "rgba(90,107,133,0.15)",
            color: "#C9D6EC",
            border: "1px solid rgba(90,107,133,0.3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          No
        </button>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <span
        className="text-[10px] font-bold"
        style={{ color: "#C9D6EC", fontFamily: "var(--font-mono)" }}
      >
        Reiniciando…
      </span>
    );
  }

  if (phase === "done") {
    return (
      <span
        className="text-[10px] font-bold"
        style={{ color: "#00D67A", fontFamily: "var(--font-mono)" }}
      >
        ✓ Reiniciado
      </span>
    );
  }

  // idle
  return (
    <button
      onClick={handleFirstClick}
      className="text-[10px] font-bold px-2 py-0.5 rounded transition-all hover:opacity-80"
      style={{
        background: "rgba(215,38,61,0.12)",
        color: "#D7263D",
        border: "1px solid rgba(215,38,61,0.3)",
        fontFamily: "var(--font-mono)",
      }}
      title="Restablecer todo el dashboard (admin)"
    >
      ↺ Restablecer
    </button>
  );
}
