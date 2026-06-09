"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";

/**
 * Progressive-disclosure primitives — PRESENTATION ONLY.
 *
 * These components only control how content is *revealed*; they never gate XP,
 * validations, or any server interaction. Drop <StepProgress> at the top of a
 * day to show "Paso X de Y", and wrap each block in <RevealStep show={...}> so
 * it fades in and scrolls into view when it becomes active.
 */

const reduceMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

// ─── Progress header: "Paso 2 de 5" + step dots ───────────────────────────────
export function StepProgress({
  steps,
  current,
}: {
  steps: string[];
  current: number; // 0-based index of the active step
}) {
  const total = steps.length;
  const pct = total > 1 ? (Math.min(current, total - 1) / (total - 1)) * 100 : 0;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
          Paso {Math.min(current + 1, total)} de {total}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
          {steps[Math.min(current, total - 1)]}
        </span>
      </div>

      {/* Track */}
      <div style={{ position: "relative", height: 4, borderRadius: 4, background: "var(--muted)" }}>
        <div
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`,
            borderRadius: 4, background: "var(--success)", transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        {/* Dots */}
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {steps.map((label, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <span
                key={i}
                title={label}
                style={{
                  width: active ? 16 : 14, height: active ? 16 : 14, borderRadius: "50%",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: done ? "var(--success)" : active ? "var(--primary)" : "var(--muted)",
                  border: `2px solid ${done ? "var(--success)" : active ? "var(--primary)" : "var(--border)"}`,
                  color: "#fff", fontSize: 9, fontWeight: 800,
                  boxShadow: active ? "0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent)" : "none",
                  transition: "all 0.25s ease",
                }}
              >
                {done ? <Check size={9} strokeWidth={3.5} /> : ""}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Reveal wrapper: fades in + scrolls into view when shown ───────────────────
export function RevealStep({
  show,
  scrollOnReveal = true,
  children,
}: {
  show: boolean;
  scrollOnReveal?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const wasShown = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    // Never scroll on the initial mount (e.g. a returning user whose steps are
    // already all visible) — only when a step is revealed live during the session.
    if (!mounted.current) {
      mounted.current = true;
      wasShown.current = show;
      return;
    }
    if (show && !wasShown.current) {
      wasShown.current = true;
      if (scrollOnReveal && ref.current) {
        const behavior: ScrollBehavior = reduceMotion() ? "auto" : "smooth";
        requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior, block: "center" }));
      }
    }
  }, [show, scrollOnReveal]);

  if (!show) return null;

  return (
    <div
      ref={ref}
      className="reveal-step"
      style={{ animation: reduceMotion() ? "none" : "reveal-step-in 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
    >
      {children}
    </div>
  );
}
