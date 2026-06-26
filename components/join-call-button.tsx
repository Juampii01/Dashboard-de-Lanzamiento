"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Phone } from "lucide-react";

interface JoinCallButtonProps {
  day: number;
  callUrl?: string;
  label?: string;
  disabled?: boolean;
}

const POINTS = 300;

// C6 fix: call URL comes from env var so it can be swapped without a code deploy.
// Set NEXT_PUBLIC_CALL_URL in Vercel to the actual live-stream / Zoom link
// before the event.  Falls back to the GovBidder YouTube channel.
const DEFAULT_CALL_URL =
  process.env.NEXT_PUBLIC_CALL_URL ?? "https://youtube.com/@govbidder";

export function JoinCallButton({ day, callUrl = DEFAULT_CALL_URL, label = "Unirse a la llamada", disabled = false }: JoinCallButtonProps) {
  const lsKey = `govbidder_joined_call_day_${day}`;
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  // Restore state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      setJoined(!!localStorage.getItem(lsKey));
    }
  }, [lsKey]);

  async function handleJoin() {
    // Always open the call URL
    window.open(callUrl, "_blank", "noopener,noreferrer");

    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/xp/join-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      });
      const data: {
        ok?: boolean;
        awarded?: boolean;
        already_claimed?: boolean;
        delta?: number;
        total?: number;
        error?: string;
      } = await res.json();

      if (data.awarded && data.delta && data.total != null) {
        // First-time claim: persist in localStorage for UI cache and dispatch XP event
        localStorage.setItem(lsKey, "1");
        setJoined(true);
        window.dispatchEvent(
          new CustomEvent("xp-gained", {
            detail: { delta: data.delta, total: data.total, source: "join" },
          })
        );
      } else if (data.already_claimed) {
        // Server confirms already claimed — sync UI state without firing XP
        setJoined(true);
        localStorage.setItem(lsKey, "1");
      }
      // If neither awarded nor already_claimed: silent error, no state change
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleJoin}
      disabled={disabled || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        padding: "8px 16px",
        borderRadius: "10px",
        border: joined ? "1px solid color-mix(in srgb, var(--success) 40%, transparent)" : disabled ? "1px solid var(--border)" : "none",
        background: joined ? "color-mix(in srgb, var(--success) 14%, transparent)" : disabled ? "var(--muted)" : "var(--primary)",
        color: joined ? "var(--success)" : disabled ? "var(--muted-foreground)" : "var(--primary-foreground)",
        fontSize: "13px",
        fontWeight: 700,
        fontFamily: "var(--font-sans)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.75 : 1,
        transition: "filter 0.2s, transform 0.15s",
        whiteSpace: "nowrap",
        boxShadow: joined || disabled ? "none" : "0 2px 10px -2px color-mix(in srgb, var(--primary) 55%, transparent)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = "brightness(0.94)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = "none"; }}
    >
      {joined ? (
        <>✓ Unido · +{POINTS} XP</>
      ) : disabled ? (
        <>🔒 {label}</>
      ) : (
        <>
          <Phone style={{ width: 14, height: 14 }} />
          {label}
          <span
            style={{
              background: "rgba(255,255,255,0.22)",
              borderRadius: "5px",
              padding: "1px 6px",
              fontSize: "11px",
              fontWeight: 800,
              color: "#fff",
            }}
          >
            +{POINTS} XP
          </span>
          <ExternalLink style={{ width: 12, height: 12, opacity: 0.85 }} />
        </>
      )}
    </button>
  );
}
