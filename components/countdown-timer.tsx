"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function pad(n: number) { return String(Math.max(0, n)).padStart(2, "0"); }

function formatCountdown(ms: number) {
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function LiveTimer({ scheduledAt, dayNumber }: { scheduledAt: string; dayNumber: number }) {
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setDisplay(formatCountdown(new Date(scheduledAt).getTime() - Date.now()));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [scheduledAt]);

  if (!display) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
      style={{
        background: "rgba(255,214,10,0.10)",
        border: "1px solid rgba(255,214,10,0.28)",
        color: "#FFD60A",
        fontFamily: "var(--font-mono)",
      }}
    >
      <span className="text-base leading-none" style={{ filter: "drop-shadow(0 0 4px rgba(255,214,10,0.6))" }}>⏱</span>
      <span>
        Día {dayNumber} en:{" "}
        <strong style={{ letterSpacing: "0.06em" }}>{display}</strong>
      </span>
    </div>
  );
}

export function CountdownTimer() {
  const [entry, setEntry] = useState<{ day_number: number; scheduled_unlock_at: string } | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);
    supabase
      .from("admin_toggles")
      // scheduled_unlock_at is added by migration 003 — graceful no-op if column doesn't exist yet
      .select("day_number, scheduled_unlock_at")
      .eq("is_globally_unlocked", false)
      .not("scheduled_unlock_at", "is", null)
      .gt("scheduled_unlock_at", new Date().toISOString())
      .order("day_number", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(
        ({ data }) => {
          if (data?.scheduled_unlock_at) setEntry(data as { day_number: number; scheduled_unlock_at: string });
        },
        () => {}, // Column may not exist yet — swallow (el query builder no expone .catch)
      );
  }, []);

  if (!entry) return null;
  return <LiveTimer dayNumber={entry.day_number} scheduledAt={entry.scheduled_unlock_at} />;
}
