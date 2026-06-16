"use client";

/**
 * SocialProof — A2 fix
 *
 * BEFORE: used createBrowserClient() to call get_day_completion_counts() directly.
 *         After Día 2 REVOKE, anon/authenticated can no longer call that RPC —
 *         the component was silently returning nothing.
 *
 * AFTER:  polls /api/social-proof (server-side route, service_role) every 60s.
 *         Realtime subscription removed — the widget is decorative, polling is enough.
 */
import { useEffect, useState } from "react";

interface DayCount {
  day_number: number;
  completed_today: number;
  completed_total: number;
}

export function SocialProof() {
  const [counts, setCounts] = useState<DayCount[]>([]);

  useEffect(() => {
    let mounted = true;

    async function fetchCounts() {
      try {
        const res  = await fetch("/api/social-proof");
        const data = await res.json() as { counts: DayCount[] };
        if (mounted) setCounts(data.counts ?? []);
      } catch {
        // silent — decorative widget
      }
    }

    fetchCounts();
    const t = setInterval(fetchCounts, 60_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  if (counts.length === 0) return null;

  // Show the day with most completions today
  const sorted = [...counts].sort((a, b) => b.completed_today - a.completed_today);
  const top = sorted[0];
  if (!top || top.completed_today === 0) return null;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
      style={{
        background: "rgba(0,214,122,0.08)",
        border: "1px solid rgba(0,214,122,0.2)",
        color: "#C9D6EC",
        fontFamily: "var(--font-sans)",
      }}
    >
      <span>🔥</span>
      <span>
        <strong style={{ color: "#00D67A" }}>{top.completed_today}</strong>
        {" "}personas completaron el Día {top.day_number} hoy
      </span>
    </div>
  );
}
