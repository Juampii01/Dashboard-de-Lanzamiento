"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Phone } from "lucide-react";

interface JoinCallButtonProps {
  day: number;
  callUrl?: string;
}

const POINTS = 30;

export function JoinCallButton({ day, callUrl = "https://youtube.com/@govbidder" }: JoinCallButtonProps) {
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
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 14px",
        borderRadius: "8px",
        border: `1px solid ${joined ? "rgba(0,214,122,0.4)" : "rgba(255,214,10,0.5)"}`,
        background: joined ? "rgba(0,214,122,0.1)" : "rgba(255,214,10,0.08)",
        color: joined ? "#00D67A" : "#FFD60A",
        fontSize: "12px",
        fontWeight: 700,
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
        transition: "all 0.3s",
        whiteSpace: "nowrap",
      }}
    >
      {joined ? (
        <>✓ Unido · +{POINTS} XP</>
      ) : (
        <>
          <Phone style={{ width: 13, height: 13 }} />
          Unirse a la llamada
          <span
            style={{
              background: "rgba(255,214,10,0.2)",
              border: "1px solid rgba(255,214,10,0.4)",
              borderRadius: "4px",
              padding: "1px 5px",
              fontSize: "9px",
              fontFamily: "var(--font-arcade)",
              color: "#FFD60A",
            }}
          >
            +{POINTS} XP
          </span>
          <ExternalLink style={{ width: 11, height: 11, opacity: 0.6 }} />
        </>
      )}
    </button>
  );
}
