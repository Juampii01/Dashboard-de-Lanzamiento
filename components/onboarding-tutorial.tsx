"use client";

/**
 * OnboardingTutorial — primer ingreso al dashboard.
 *
 * - Se muestra cuando has_seen_onboarding es false (prop del servidor).
 * - 5 pasos con spotlight sobre elementos clave del dashboard.
 * - No menciona "lanzamiento" — usa el framing de "Code Challenge".
 * - Al cerrar: persiste en DB via /api/onboarding/complete y en localStorage.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface Step {
  title: string;
  body: string;
  targetId?: string;          // data-tour-id del elemento a iluminar
  santoMood?: "wave" | "point" | "thumbs" | "star";
  highlightPadding?: number;
}

const STEPS: Step[] = [
  {
    title: "¡Bienvenido al Code Challenge! 🎮",
    body: "Soy Santo, tu guía en esta misión. En los próximos 4 días vas a construir tu presencia en el mercado federal. Cada acción suma puntos — y los puntos deciden quién gana el sorteo.",
    santoMood: "wave",
  },
  {
    title: "Tu barra de progreso 💪",
    body: "Acá ves cuánto avanzaste en la misión. Completá cada fase y el indicador se llena. El avatar soy yo — hacé clic para una sorpresa.",
    targetId: "progress-bar",
    santoMood: "point",
    highlightPadding: 16,
  },
  {
    title: "Tus fases de entrenamiento 🗓️",
    body: "Cada tarjeta es una fase de tu plan. Completalas en orden — cada una te da +25 XP y desbloquea la siguiente. Los admins controlan cuándo se abre cada fase.",
    targetId: "day-cards",
    santoMood: "thumbs",
    highlightPadding: 20,
  },
  {
    title: "Videos de misión 📺",
    body: "Dentro de cada fase hay 4 videos. Cada video que marcás como visto suma +10 XP. Podés ver uno cada 5 minutos — ¡volvé seguido!",
    targetId: "capsules",
    santoMood: "star",
    highlightPadding: 16,
  },
  {
    title: "Tu rango y el sorteo 🏆",
    body: "Cada 10 puntos = 1 entrada al sorteo final. Más XP acumulás, más chances tenés de ganar. Mirá la tabla de líderes para ver tu posición.",
    targetId: "xp-pill",
    santoMood: "star",
    highlightPadding: 12,
  },
];

const SANTO_EMOJIS: Record<NonNullable<Step["santoMood"]>, string> = {
  wave:   "🙋",
  point:  "👉",
  thumbs: "👍",
  star:   "⭐",
};

interface SpotlightRect {
  top: number; left: number; width: number; height: number;
}

const LS_KEY = "govbidder_tour_v1";

export function OnboardingTutorial({ hasSeenOnboarding }: { hasSeenOnboarding: boolean }) {
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [animating, setAnimating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Decide if we should show
  useEffect(() => {
    if (hasSeenOnboarding) return;
    if (typeof window !== "undefined" && localStorage.getItem(LS_KEY)) return;
    // Small delay so the page renders before the tutorial
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, [hasSeenOnboarding]);

  // Position spotlight on target element
  useEffect(() => {
    if (!visible) return;
    const current = STEPS[step];
    if (!current.targetId) {
      setSpotlight(null);
      return;
    }

    const el = document.querySelector(`[data-tour-id="${current.targetId}"]`);
    if (!el) { setSpotlight(null); return; }

    const pad = current.highlightPadding ?? 12;
    const rect = el.getBoundingClientRect();
    setSpotlight({
      top:    rect.top    - pad,
      left:   rect.left   - pad,
      width:  rect.width  + pad * 2,
      height: rect.height + pad * 2,
    });

    // Scroll element into view smoothly
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [step, visible]);

  const complete = useCallback(async () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, "1");
    }
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {
      // non-critical
    }
  }, []);

  const next = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    if (step >= STEPS.length - 1) {
      complete();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, animating, complete]);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <>
      {/* Dark overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[99980]"
        style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(2px)" }}
        onClick={(e) => { if (e.target === overlayRef.current) complete(); }}
      />

      {/* Spotlight hole — uses box-shadow trick */}
      {spotlight && (
        <div
          className="fixed z-[99981] pointer-events-none"
          style={{
            top:    spotlight.top,
            left:   spotlight.left,
            width:  spotlight.width,
            height: spotlight.height,
            borderRadius: "12px",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
            border: "2px solid rgba(255,214,10,0.6)",
          }}
        />
      )}

      {/* Tutorial card */}
      <div
        className="fixed z-[99990] w-full max-w-sm px-4"
        style={{
          // If spotlight, position card below spotlight or at center-bottom
          ...(spotlight
            ? {
                top:  Math.min(spotlight.top + spotlight.height + 16, window.innerHeight - 280),
                left: "50%",
                transform: "translateX(-50%)",
              }
            : {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }),
        }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0D1F36 0%, #143A6B 100%)",
            border: "2px solid rgba(255,214,10,0.4)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(255,214,10,0.15)",
          }}
        >
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 pt-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width:  i === step ? "20px" : "6px",
                  height: "6px",
                  background: i === step ? "#FFD60A" : i < step ? "#00D67A" : "#1E3A5C",
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="px-6 pt-5 pb-2 text-center">
            {/* Santo avatar */}
            <div className="flex justify-center mb-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl select-none"
                style={{
                  background: "linear-gradient(135deg, #0A2540, #143A6B)",
                  border: "3px solid #FFD60A",
                  boxShadow: "0 0 24px rgba(255,214,10,0.35)",
                  animation: "bar-bounce 1.4s ease-in-out infinite",
                }}
              >
                {SANTO_EMOJIS[current.santoMood ?? "wave"]}
              </div>
            </div>

            <h2
              className="text-lg font-bold text-white mb-3 leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {current.title}
            </h2>

            <p
              className="text-sm leading-relaxed"
              style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}
            >
              {current.body}
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pt-4 pb-5 flex items-center justify-between gap-3">
            {/* Skip */}
            <button
              onClick={complete}
              className="text-xs transition-colors"
              style={{ color: "#3A5070", fontFamily: "var(--font-sans)" }}
            >
              Saltar
            </button>

            {/* Back */}
            {!isFirst && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-xs px-4 py-2 rounded-lg transition-all"
                style={{
                  color: "#A8B5CC",
                  border: "1px solid #1E3A5C",
                  fontFamily: "var(--font-sans)",
                }}
              >
                ← Atrás
              </button>
            )}

            {/* Next / Finish */}
            <button
              onClick={next}
              disabled={animating}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
              style={{
                background: isLast
                  ? "linear-gradient(135deg, #00D67A, #00B865)"
                  : "linear-gradient(135deg, #FFD60A, #FFA500)",
                color: "#000",
                fontFamily: "var(--font-sans)",
                boxShadow: isLast
                  ? "0 0 16px rgba(0,214,122,0.4)"
                  : "0 0 16px rgba(255,214,10,0.4)",
              }}
            >
              {isLast ? "🚀 ¡Comenzar misión!" : "Siguiente →"}
            </button>
          </div>

          {/* Step counter */}
          <p
            className="text-center pb-3 text-[9px]"
            style={{ color: "#1E3A5C", fontFamily: "var(--font-mono)" }}
          >
            PASO {step + 1} / {STEPS.length}
          </p>
        </div>
      </div>
    </>
  );
}
