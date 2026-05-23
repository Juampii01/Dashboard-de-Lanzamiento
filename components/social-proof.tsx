"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface DayCount {
  day_number: number;
  completed_today: number;
  completed_total: number;
}

export function SocialProof() {
  const [counts, setCounts] = useState<DayCount[]>([]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);

    const fetchCounts = async () => {
      // Uses the get_day_completion_counts() RPC function (migration 004)
      const { data, error } = await supabase.rpc("get_day_completion_counts");
      if (!error && data) setCounts(data as DayCount[]);
    };

    fetchCounts();

    const channel = supabase
      .channel("social_proof_realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "day_progress" }, fetchCounts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
        color: "#A8B5CC",
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
