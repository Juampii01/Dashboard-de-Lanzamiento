"use client";

import { useState } from "react";

const LS_KEY = "govbidder_tour_v1";

export function ResetTutorialButton() {
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      await fetch("/api/onboarding/reset", { method: "POST" });
      localStorage.removeItem(LS_KEY);
      window.location.href = "/dashboard";
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      title="Ver tutorial de bienvenida otra vez"
      className="text-xs transition-colors disabled:opacity-50"
      style={{ color: "#3A5070", fontFamily: "var(--font-sans)" }}
    >
      {loading ? "..." : "🎮 Tutorial"}
    </button>
  );
}
