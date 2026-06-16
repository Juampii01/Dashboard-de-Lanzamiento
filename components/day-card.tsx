"use client";

import { cn } from "@/lib/utils";
import { Lock, CheckCircle2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { createParticleBurst, triggerFlash, triggerScreenShake } from "@/lib/wow-effects";

interface DayCardProps {
  day: number;
  title: string;
  description: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  href: string;
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

export function DayCard({
  day,
  title,
  description,
  isUnlocked,
  isCompleted,
  href,
}: DayCardProps) {
  const router = useRouter();
  const [shaking, setShaking] = useState(false);
  const [showTooltip, setShowTooltip] = useState<"in" | "out" | null>(null);
  const [ripple, setRipple] = useState<Ripple | null>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Shake locked cards ─────────────────────── */
  const handleLockedClick = useCallback(() => {
    if (shaking) return;
    setShaking(true);
    // Show bounce tooltip
    setShowTooltip("in");
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      setShowTooltip("out");
      setTimeout(() => setShowTooltip(null), 220);
    }, 1300);
    setTimeout(() => setShaking(false), 580);
  }, [shaking]);

  /* ── CTA ripple ─────────────────────────────── */
  const handleRipple = useCallback((e: React.MouseEvent) => {
    const el = ctaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() });
    setTimeout(() => setRipple(null), 700);
  }, []);

  /* ── WOW: particles + flash then navigate ────── */
  const handleStartChallenge = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const el = ctaRef.current;
      const rect = el?.getBoundingClientRect();
      if (rect) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        handleRipple(e);
        createParticleBurst(cx, cy, "gold", 22);
        triggerFlash();
        triggerScreenShake();
      }

      // Award +25 XP for starting the day (fire-and-forget, non-blocking)
      fetch("/api/xp/start-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      })
        .then((r) => r.json())
        .then((data: { awarded: boolean; points?: number; total?: number }) => {
          if (data.awarded && data.points && data.total != null) {
            window.dispatchEvent(
              new CustomEvent("xp-gained", {
                detail: { delta: data.points, total: data.total, source: "start" },
              })
            );
          }
        })
        .catch(() => {});

      // Small delay so particles are visible before navigation
      setTimeout(() => router.push(href), 320);
    },
    [day, href, router, handleRipple]
  );

  const card = (
    <div
      onClick={!isUnlocked ? handleLockedClick : undefined}
      className={cn(
        "relative rounded-xl overflow-hidden border transition-all duration-300",
        shaking && "card-shake",
        isCompleted
          ? "border-[#00D67A]/40 cursor-pointer hover:-translate-y-1"
          : isUnlocked
          ? "border-[#D7263D] card-active-pulse hover:-translate-y-1 cursor-pointer"
          : "border-[#1E3A5C] cursor-not-allowed"
      )}
      style={{
        // Solid backgrounds (no backdrop-filter — 4 simultaneous blur layers kill perf)
        background: isCompleted
          ? "rgba(0,30,20,0.88)"
          : isUnlocked
          ? "rgba(20,58,107,0.90)"
          : "rgba(10,37,64,0.80)",
        boxShadow: isCompleted
          ? "0 0 0 1px rgba(0,214,122,0.35), 0 8px 32px rgba(0,0,0,0.4)"
          : isUnlocked
          ? undefined
          : "none",
      }}
    >
      {/* HUD corner brackets */}
      <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none z-30"
        style={{ borderTop: "2px solid rgba(255,214,10,0.5)", borderLeft: "2px solid rgba(255,214,10,0.5)" }} />
      <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none z-30"
        style={{ borderTop: "2px solid rgba(255,214,10,0.5)", borderRight: "2px solid rgba(255,214,10,0.5)" }} />
      <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none z-30"
        style={{ borderBottom: "2px solid rgba(255,214,10,0.5)", borderLeft: "2px solid rgba(255,214,10,0.5)" }} />
      <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none z-30"
        style={{ borderBottom: "2px solid rgba(255,214,10,0.5)", borderRight: "2px solid rgba(255,214,10,0.5)" }} />

      {/* Lock bounce tooltip */}
      {showTooltip && (
        <div
          className={cn(
            "absolute top-1/2 left-1/2 z-40 pointer-events-none px-4 py-2.5 rounded-xl text-center",
            showTooltip === "in"  && "lock-tooltip-show",
            showTooltip === "out" && "lock-tooltip-hide"
          )}
          style={{
            background: "#061528",
            border: "2px solid #D7263D",
            boxShadow: "0 0 24px rgba(215,38,61,0.5)",
            color: "#FFFFFF",
            fontSize: "12px",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          🔒 Se desbloquea en vivo
        </div>
      )}

      {/* Completed green overlay */}
      {isCompleted && (
        <div className="absolute inset-0 bg-[#00D67A]/5 pointer-events-none" />
      )}

      {/* Main content */}
      <div className={cn("p-6 pb-4", !isUnlocked && "[filter:grayscale(0.5)]")}>
        {/* Row: label + state badge */}
        <div className="flex items-center justify-between mb-5">
          <span
            className="text-[10px] uppercase tracking-[0.18em] text-[#C9D6EC] font-medium"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Reto {day}
          </span>

          {isCompleted ? (
            <span
              className="px-2.5 py-0.5 rounded-full bg-[#00D67A]/20 text-[#00D67A] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
              style={{ fontFamily: "var(--font-arcade)" }}
            >
              <CheckCircle2 className="w-3 h-3" /> Listo
            </span>
          ) : isUnlocked ? (
            <span
              className="px-2.5 py-0.5 rounded-full bg-[#D7263D] text-white text-[9px] font-bold uppercase tracking-wider animate-pulse"
              style={{ fontFamily: "var(--font-arcade)" }}
            >
              Activo
            </span>
          ) : (
            <Lock className="w-4 h-4 text-[#8DA2C4]" />
          )}
        </div>

        {/* Big day number */}
        <div
          className="text-8xl font-bold leading-none mb-4 select-none tabular-nums"
          style={{
            fontFamily: "var(--font-display)",
            color: isCompleted ? "#00D67A" : isUnlocked ? "#FFFFFF" : "#647FA8",
            textShadow: isUnlocked && !isCompleted
              ? "0 0 40px rgba(255,214,10,0.12)"
              : isCompleted
              ? "0 0 30px rgba(0,214,122,0.2)"
              : undefined,
          }}
        >
          {String(day).padStart(2, "0")}
        </div>

        {/* Title */}
        <h3
          className="font-bold text-lg leading-snug mb-2"
          style={{
            fontFamily: "var(--font-display)",
            color: isUnlocked ? "#FFFFFF" : "#8DA2C4",
          }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className="text-sm leading-relaxed"
          style={{ color: isUnlocked ? "#C9D6EC" : "#8DA2C4" }}
        >
          {description}
        </p>
      </div>

      {/* CTA row */}
      <div className="px-6 pb-6">
        {isCompleted ? (
          <button className="w-full py-2.5 rounded-lg border border-white/20 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
            Ver entregables
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : isUnlocked ? (
          <div
            ref={ctaRef}
            onClick={handleStartChallenge}
            className="w-full py-3 rounded-lg text-center text-white font-bold text-sm transition-all hover:brightness-110 relative overflow-hidden select-none cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #E8293F 0%, #D7263D 50%, #B01E31 100%)",
              fontFamily: "var(--font-sans)",
              boxShadow: "0 4px 16px rgba(215,38,61,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            Empezar reto →
            {ripple && (
              <span
                key={ripple.id}
                className="cta-ripple"
                style={{ left: ripple.x, top: ripple.y }}
              />
            )}
          </div>
        ) : (
          <p className="text-center text-[11px] text-[#8DA2C4] py-1 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" />
            Se desbloquea en vivo
          </p>
        )}
      </div>

      {/* Locked blur */}
      {!isUnlocked && (
        <div className="absolute inset-0 backdrop-blur-[1.5px]" />
      )}
    </div>
  );

  // Unlocked cards: card handles its own navigation via handleStartChallenge
  // Completed cards: wrap in link for revisiting
  if (!isUnlocked) return card;
  if (isCompleted) {
    return (
      <a href={href} style={{ textDecoration: "none" }}>
        {card}
      </a>
    );
  }
  return card;
}
