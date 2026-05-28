"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { flyPoints } from "@/lib/wow-effects";

interface ComboBarProps {
  initialProgress: number; // 0–100, from server
}

export function ComboBar({ initialProgress }: ComboBarProps) {
  const [progress, setProgress] = useState(initialProgress);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const [flash, setFlash] = useState(false);
  const btnRef      = useRef<HTMLButtonElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFull = progress >= 100;

  // Listen to combo-progress events dispatched by XP endpoints
  useEffect(() => {
    function triggerFlash() {
      // Cancel any pending flash-off timer before starting a new one
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlash(true);
      flashTimerRef.current = setTimeout(() => setFlash(false), 400);
    }

    function onComboProgress(e: Event) {
      const { progress: newProgress } = (e as CustomEvent<{ progress: number }>).detail;
      setProgress(newProgress);
      triggerFlash();
    }

    // Also listen to video capsule combo updates
    function onComboDelta(e: Event) {
      const { delta } = (e as CustomEvent<{ delta: number }>).detail;
      setProgress((prev) => Math.min(100, prev + delta));
      triggerFlash();
    }

    window.addEventListener("combo-progress", onComboProgress);
    window.addEventListener("combo-delta",    onComboDelta);
    return () => {
      window.removeEventListener("combo-progress", onComboProgress);
      window.removeEventListener("combo-delta",    onComboDelta);
      // Clean up any pending flash timer on unmount
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const handleClaim = useCallback(async () => {
    if (claiming || !isFull) return;
    setClaiming(true);

    try {
      const res = await fetch("/api/combo/claim", { method: "POST" });
      const data: { claimed: boolean; bonus?: number; new_total?: number } = await res.json();

      if (data.claimed) {
        // Dispatch xp-gained so PointsHUD animates
        window.dispatchEvent(
          new CustomEvent("xp-gained", {
            detail: {
              delta: data.bonus ?? 50,
              total: data.new_total ?? 0,
              source: "combo",
            },
          })
        );

        // Fly points from the bar button
        if (btnRef.current) {
          const rect = btnRef.current.getBoundingClientRect();
          flyPoints(
            rect.left + rect.width / 2,
            rect.top,
            rect.left + rect.width / 2,
            rect.top - 80,
            `+${data.bonus ?? 50} XP 🎁`
          );
        }

        setProgress(0);
        setJustClaimed(true);
        setTimeout(() => setJustClaimed(false), 2000);
      }
    } catch {
      // silent
    } finally {
      setClaiming(false);
    }
  }, [claiming, isFull]);

  // Gradient color based on fill level
  const fillGradient = isFull
    ? "linear-gradient(90deg, #FFD60A 0%, #FF9500 50%, #FFD60A 100%)"
    : progress > 60
    ? "linear-gradient(90deg, #00D67A 0%, #00A8C6 60%, #4F8EF7 100%)"
    : "linear-gradient(90deg, #00D67A 0%, #00C48C 100%)";

  const fillPercent = Math.max(0, Math.min(100, progress));

  return (
    <div
      style={{
        marginTop: "8px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
      }}
    >
      {/* Label */}
      <span
        style={{
          fontFamily: "var(--font-arcade)",
          fontSize: "8px",
          color: isFull ? "#FFD60A" : "#3A5070",
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
          textShadow: isFull ? "0 0 8px rgba(255,214,10,0.6)" : "none",
          transition: "color 0.4s, text-shadow 0.4s",
          minWidth: "36px",
        }}
      >
        COMBO
      </span>

      {/* Bar track */}
      <div
        style={{
          flex: 1,
          height: "6px",
          borderRadius: "3px",
          background: "#0F1E30",
          border: "1px solid #1E3A5C",
          overflow: "hidden",
          position: "relative",
          boxShadow: isFull
            ? "0 0 12px rgba(255,214,10,0.4), inset 0 0 0 1px rgba(255,214,10,0.2)"
            : "none",
          transition: "box-shadow 0.5s",
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: "100%",
            width: `${fillPercent}%`,
            background: fillGradient,
            borderRadius: "3px",
            transition: "width 0.6s cubic-bezier(0.22,1,0.36,1), background 0.8s ease",
            position: "relative",
            animation: isFull ? "combo-bar-pulse 1.2s ease-in-out infinite" : undefined,
          }}
        >
          {/* Flash burst when gaining progress */}
          {flash && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.5)",
                borderRadius: "3px",
                animation: "combo-flash 0.4s ease-out forwards",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Shimmer sweep when filling */}
          {!isFull && fillPercent > 0 && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                animation: "combo-shimmer 2s linear infinite",
                borderRadius: "3px",
              }}
            />
          )}
        </div>

        {/* Segment marks every 25% */}
        {[25, 50, 75].map((pct) => (
          <div
            key={pct}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${pct}%`,
              width: "1px",
              background: "rgba(10,37,64,0.6)",
              pointerEvents: "none",
            }}
          />
        ))}
      </div>

      {/* Percentage or claim button */}
      {isFull ? (
        <button
          ref={btnRef}
          onClick={handleClaim}
          disabled={claiming}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 10px",
            borderRadius: "8px",
            background: justClaimed
              ? "#00D67A"
              : "linear-gradient(135deg, #FFD60A 0%, #FF9500 100%)",
            color: justClaimed ? "#fff" : "#0A2540",
            fontFamily: "var(--font-arcade)",
            fontSize: "8px",
            fontWeight: 700,
            border: "none",
            cursor: claiming ? "wait" : "pointer",
            whiteSpace: "nowrap",
            letterSpacing: "0.04em",
            boxShadow: justClaimed
              ? "0 0 16px rgba(0,214,122,0.6)"
              : "0 0 16px rgba(255,214,10,0.6), 0 2px 6px rgba(0,0,0,0.4)",
            animation: claiming || justClaimed
              ? undefined
              : "combo-btn-bounce 0.8s ease-in-out infinite",
            transition: "background 0.4s, box-shadow 0.4s",
            minWidth: "72px",
          }}
        >
          {justClaimed ? (
            "✓ +50 XP!"
          ) : claiming ? (
            "..."
          ) : (
            <>🎁 +50 XP</>
          )}
        </button>
      ) : (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "#3A5070",
            minWidth: "26px",
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fillPercent}%
        </span>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes combo-bar-pulse {
          0%,100% { filter: brightness(1)    drop-shadow(0 0 3px rgba(255,214,10,0.7)); }
          50%      { filter: brightness(1.15) drop-shadow(0 0 8px rgba(255,214,10,1.0)); }
        }
        @keyframes combo-flash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes combo-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes combo-btn-bounce {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
