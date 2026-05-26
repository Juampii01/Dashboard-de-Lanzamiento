"use client";

/**
 * XpEngine — invisible client component mounted in the dashboard layout.
 *
 * Responsibilities:
 *  1. Ping /api/xp/heartbeat on mount, then every 10 minutes.
 *  2. When XP is awarded, dispatch a global "xp-gained" CustomEvent so
 *     PointsHUD (and any other listener) can update in real-time.
 *
 * Usage:
 *   <XpEngine />
 *
 * To trigger avatar XP from another component:
 *   window.dispatchEvent(new CustomEvent("xp-avatar-click"));
 */

import { useEffect, useRef } from "react";

const HEARTBEAT_MS = 10 * 60 * 1_000; // 10 minutes
const IDLE_THRESHOLD_MS = 5 * 60 * 1_000; // 5 minutes

export function XpEngine() {
  const lastActivityRef = useRef<number>(Date.now());

  // ── Activity tracking ────────────────────────────────────────────────
  useEffect(() => {
    function recordActivity() {
      lastActivityRef.current = Date.now();
    }

    window.addEventListener("mousemove", recordActivity);
    window.addEventListener("click", recordActivity);
    window.addEventListener("keypress", recordActivity);
    window.addEventListener("scroll", recordActivity);

    return () => {
      window.removeEventListener("mousemove", recordActivity);
      window.removeEventListener("click", recordActivity);
      window.removeEventListener("keypress", recordActivity);
      window.removeEventListener("scroll", recordActivity);
    };
  }, []);

  // ── Time-based XP heartbeat ──────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function ping() {
      try {
        // Skip heartbeat if user has been idle for 5+ minutes
        if (Date.now() - lastActivityRef.current >= IDLE_THRESHOLD_MS) {
          timer = setTimeout(ping, HEARTBEAT_MS);
          return;
        }

        const res  = await fetch("/api/xp/heartbeat", { method: "POST" });
        const data = await res.json() as {
          awarded: boolean;
          points?: number;
          total?: number;
          nextInSeconds?: number;
          capped?: boolean;
        };

        if (data.awarded && data.points && data.total != null) {
          window.dispatchEvent(
            new CustomEvent("xp-gained", {
              detail: { delta: data.points, total: data.total, source: "time" },
            })
          );
        }

        // Schedule next ping: server tells us exactly when cooldown expires,
        // otherwise fall back to the standard interval.
        const delay = data.awarded
          ? HEARTBEAT_MS
          : ((data.nextInSeconds ?? 600) + 5) * 1_000;

        timer = setTimeout(ping, delay);
      } catch {
        // Network error — retry after standard interval
        timer = setTimeout(ping, HEARTBEAT_MS);
      }
    }

    // Small initial delay so the page finishes rendering first
    timer = setTimeout(ping, 2_000);
    return () => clearTimeout(timer);
  }, []);

  // ── Avatar click XP (triggered via custom event from progress-bar) ───
  useEffect(() => {
    async function handleAvatarClick() {
      try {
        const res  = await fetch("/api/xp/avatar", { method: "POST" });
        const data = await res.json() as {
          awarded: boolean;
          points?: number;
          total?: number;
        };

        if (data.awarded && data.points && data.total != null) {
          window.dispatchEvent(
            new CustomEvent("xp-gained", {
              detail: { delta: data.points, total: data.total, source: "avatar" },
            })
          );
        }
      } catch {
        // silent — easter egg, not critical
      }
    }

    window.addEventListener("xp-avatar-click", handleAvatarClick);
    return () => window.removeEventListener("xp-avatar-click", handleAvatarClick);
  }, []);

  return null; // invisible
}
