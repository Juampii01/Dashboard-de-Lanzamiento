"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { progressPercent } from "@/lib/utils";
import { triggerAvatarStars } from "@/lib/wow-effects";

function SantoAvatar({ onClick }: { onClick?: (cx: number, cy: number) => void }) {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);
  const [jumping, setJumping] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) setVisible(true);
  }, []);

  const handleClick = useCallback(() => {
    if (jumping) return;
    setJumping(true);
    setTimeout(() => setJumping(false), 650);

    // Fire avatar XP (handled by XpEngine listening to this event)
    window.dispatchEvent(new CustomEvent("xp-avatar-click"));

    if (onClick && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      onClick(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }, [jumping, onClick]);

  return (
    <div
      ref={wrapRef}
      onClick={handleClick}
      title="Easter egg 🕺"
      style={{
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        overflow: "hidden",
        border: "2px solid #00D67A",
        background: "#0A2540",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: "pointer",
        boxShadow: "0 0 10px rgba(0,214,122,0.6), 0 0 20px rgba(0,214,122,0.3)",
        animation: jumping
          ? "bar-avatar-jump 0.6s cubic-bezier(0.34,1.56,0.64,1)"
          : "bar-bounce 1.4s ease-in-out infinite",
      }}
    >
      {!error && (
        <img
          ref={imgRef}
          src="/santo.png"
          alt=""
          onLoad={() => setVisible(true)}
          onError={() => setError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            display: visible ? "block" : "none",
          }}
        />
      )}
      {(!visible || error) && (
        <span style={{ fontSize: "14px", lineHeight: 1 }}>🕺</span>
      )}
    </div>
  );
}

interface ProgressBarProps {
  completedDays: number;
}

export function ProgressBar({ completedDays }: ProgressBarProps) {
  const targetPct = progressPercent(completedDays);
  const isEmpty = targetPct === 0;
  const isFull = targetPct === 100;

  // Cinematic entrance: bar starts at 0 and fills slowly on mount
  const [displayPct, setDisplayPct] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setMounted(true), 120);
    const t2 = setTimeout(() => setDisplayPct(targetPct), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [targetPct]);

  const handleAvatarClick = useCallback((cx: number, cy: number) => {
    triggerAvatarStars(cx, cy);
  }, []);

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            style={{
              fontFamily: "var(--font-arcade)",
              fontSize: "8px",
              color: "#FFD60A",
              letterSpacing: "0.08em",
              textShadow: "0 0 8px rgba(255,214,10,0.9), 0 0 16px rgba(255,214,10,0.4)",
            }}
          >
            P1
          </span>
          <span
            className="uppercase tracking-widest text-[10px]"
            style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}
          >
            Tu progreso
          </span>
        </div>

        <span
          style={{
            fontFamily: "var(--font-arcade)",
            fontSize: "9px",
            color: isFull ? "#FFD60A" : isEmpty ? "#D7263D" : "#00D67A",
            textShadow: isFull
              ? "0 0 12px rgba(255,214,10,1), 0 0 24px rgba(255,214,10,0.5)"
              : !isEmpty
              ? "0 0 10px rgba(0,214,122,0.8), 0 0 20px rgba(0,214,122,0.4)"
              : "0 0 10px rgba(215,38,61,0.8)",
            transition: "color 600ms",
          }}
        >
          {isFull ? "FLAWLESS" : `${targetPct}%`}
        </span>
      </div>

      {/* The bar */}
      <div className="relative" style={{ height: "34px" }}>

        {/* HUD corner brackets — outside the bar */}
        <div className="absolute -top-[2px] -left-[2px] w-3 h-3 pointer-events-none z-30"
          style={{ borderTop: "2px solid #FFD60A", borderLeft: "2px solid #FFD60A", opacity: 0.8 }} />
        <div className="absolute -top-[2px] -right-[2px] w-3 h-3 pointer-events-none z-30"
          style={{ borderTop: "2px solid #FFD60A", borderRight: "2px solid #FFD60A", opacity: 0.8 }} />
        <div className="absolute -bottom-[2px] -left-[2px] w-3 h-3 pointer-events-none z-30"
          style={{ borderBottom: "2px solid #FFD60A", borderLeft: "2px solid #FFD60A", opacity: 0.8 }} />
        <div className="absolute -bottom-[2px] -right-[2px] w-3 h-3 pointer-events-none z-30"
          style={{ borderBottom: "2px solid #FFD60A", borderRight: "2px solid #FFD60A", opacity: 0.8 }} />

        {/* Outer chrome frame */}
        <div
          className={`absolute inset-0 bar-frame-pulse ${isEmpty ? "" : ""}`}
          style={{
            border: "2px solid #FFD60A",
            borderRadius: "2px",
            boxShadow: `
              0 0 0 1px #0A2540,
              0 0 20px rgba(255,214,10,0.22),
              inset 0 0 0 1px rgba(0,0,0,0.9)
            `,
            overflow: "hidden",
          }}
        >
          {/* Deep black BG */}
          <div className="absolute inset-0" style={{ background: "#030303" }} />

          {/* Ambient inner shadow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: "inset 0 2px 12px rgba(0,0,0,0.8), inset 0 -1px 4px rgba(0,0,0,0.6)" }} />

          {/* Green fill — cinematic transition */}
          {displayPct > 0 && (
            <div
              className="absolute top-0 left-0 bottom-0 overflow-hidden"
              style={{
                width: `${displayPct}%`,
                background: "linear-gradient(180deg, #12FF9A 0%, #00D67A 40%, #00B865 75%, #007A40 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                transition: mounted
                  ? `width 2800ms cubic-bezier(0.22, 0.61, 0.36, 1)`
                  : "none",
              }}
            >
              {/* Top specular highlight */}
              <div className="absolute top-0 left-0 right-0 h-[6px]"
                style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 100%)" }} />

              {/* Scanlines on fill */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.10) 3px, rgba(0,0,0,0.10) 4px)",
                }} />

              {/* Moving light sweep */}
              <div
                className="bar-light-sweep absolute top-0 bottom-0 pointer-events-none"
                style={{
                  width: "30%",
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.38) 50%, transparent 100%)",
                }}
              />

              {/* Crackle at the right edge of fill */}
              <div
                className="bar-edge-crackle absolute top-0 bottom-0 right-0"
                style={{
                  width: "3px",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(120,255,180,0.9) 50%, rgba(255,255,255,0.95) 100%)",
                }}
              />
            </div>
          )}

          {/* Segment dividers at 25 / 50 / 75 % */}
          {[25, 50, 75].map((pos) => (
            <div
              key={pos}
              className="absolute top-0 bottom-0 pointer-events-none z-10"
              style={{
                left: `${pos}%`,
                width: "1px",
                background: "linear-gradient(180deg, rgba(255,214,10,0.6) 0%, rgba(255,214,10,0.18) 100%)",
              }}
            />
          ))}

          {/* Low-health danger flicker */}
          {isEmpty && (
            <div
              className="absolute inset-0 low-health-flicker"
              style={{ background: "rgba(215,38,61,0.10)" }}
            />
          )}

          {/* Full — gold shimmer */}
          {isFull && (
            <div className="absolute inset-0 progress-shimmer opacity-25" />
          )}
        </div>

        {/* Santo avatar tracks the fill edge */}
        <div
          className="absolute top-1/2 -translate-y-1/2 select-none z-20"
          style={{
            left: `clamp(4px, calc(${displayPct}% - 15px), calc(100% - 30px))`,
            filter: "drop-shadow(0 0 8px rgba(0,214,122,0.9)) drop-shadow(0 0 16px rgba(0,214,122,0.5)) drop-shadow(0 3px 5px rgba(0,0,0,0.95))",
            transition: mounted
              ? `left 2800ms cubic-bezier(0.22, 0.61, 0.36, 1)`
              : "none",
          }}
          aria-hidden
        >
          <SantoAvatar onClick={handleAvatarClick} />
        </div>
      </div>

      {/* Day segment labels — below bar, slim */}
      <div className="flex mt-1.5 gap-px">
        {[1, 2, 3, 4].map((d) => {
          const done = completedDays >= d;
          const active = completedDays === d - 1;
          return (
            <div key={d} className="flex-1 flex items-center justify-center py-0.5">
              <span
                style={{
                  fontFamily: "var(--font-arcade)",
                  fontSize: "6px",
                  letterSpacing: "0.05em",
                  color: done ? "#00D67A" : active ? "#FFD60A" : "#1E3A5C",
                  textShadow: done
                    ? "0 0 6px rgba(0,214,122,0.7)"
                    : active
                    ? "0 0 6px rgba(255,214,10,0.8)"
                    : "none",
                  transition: "all 800ms",
                }}
              >
                {done ? `✓ DÍA ${d}` : `DÍA ${d}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
