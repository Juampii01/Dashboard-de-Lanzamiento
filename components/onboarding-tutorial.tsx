"use client";

/**
 * OnboardingTutorial — primer ingreso al dashboard.
 *
 * - 5 pasos multi-página: steps 0-3 en /dashboard, step 4 en /dia-1
 * - Spotlight sobre elementos reales en cada página
 * - Persiste step en localStorage para sobrevivir navegación entre páginas
 * - Al cerrar: persiste en DB via /api/onboarding/complete y en localStorage
 * - No menciona "lanzamiento"
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface Step {
  title: string;
  body: string;
  targetId?: string;
  santoMood?: "wave" | "point" | "thumbs" | "star";
  highlightPadding?: number;
  /** Navegar a esta URL al presionar "Siguiente" en ESTE step */
  navigateTo?: string;
  /** Navegar a esta URL al presionar "← Atrás" en ESTE step */
  backTo?: string;
}

const STEPS: Step[] = [
  {
    title: "¡Bienvenido a Govbidder! 🎮",
    body: "Soy Santo, tu guía en esta misión. En los próximos 4 días vas a construir tu presencia en el mercado federal. Cada acción suma puntos — y los puntos determinan quién gana los premios finales.",
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
    title: "Tus fases del programa 🗓️",
    body: "Usá los botones de arriba para navegar entre los días. Empezá por Día 1 — completá el formulario y desbloqueás el siguiente. Cada fase suma +25 XP.",
    targetId: "day-tab-1",
    santoMood: "thumbs",
    highlightPadding: 10,
  },
  {
    title: "Tu rango y los premios 🏆",
    body: "Los mejores ranqueados ganan premios reales. Más XP acumulás, mejor tu posición. Mirá el ranking para ver dónde estás.",
    targetId: "xp-pill",
    santoMood: "star",
    highlightPadding: 12,
    // Al presionar Siguiente en este paso, navegamos a día 1 para mostrar los videos
    navigateTo: "/dashboard/dia-1",
  },
  {
    title: "Misiones en Video 📺",
    body: "¡Acá están! Marcá cada video como visto y sumás +10 XP — uno cada 5 minutos. Son 4 videos por fase. ¡Volvé seguido para acumular puntos!",
    targetId: "capsules",
    santoMood: "star",
    highlightPadding: 16,
    // Al presionar Atrás desde este paso, volvemos al dashboard
    backTo: "/dashboard",
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

const LS_KEY      = "govbidder_tour_v1";       // "1" = completado
const LS_STEP_KEY = "govbidder_tour_step_v1";  // N = step actual en curso

export function OnboardingTutorial({ hasSeenOnboarding }: { hasSeenOnboarding: boolean }) {
  const [step, setStep]           = useState(0);
  const [visible, setVisible]     = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [animating, setAnimating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Decide si mostrar — recupera step en progreso si existe
  useEffect(() => {
    if (hasSeenOnboarding) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(LS_KEY)) return; // ya completó

    const savedStep = localStorage.getItem(LS_STEP_KEY);
    const initialStep = savedStep ? parseInt(savedStep, 10) : 0;
    if (!isNaN(initialStep) && initialStep >= 0 && initialStep < STEPS.length) {
      setStep(initialStep);
    }

    const show = () => setTimeout(() => setVisible(true), 400);

    // Si el boot todavía no corrió (primera visita real), esperar el evento.
    // Si ya corrió (navegación entre páginas durante el tutorial), mostrar directo.
    const bootAlreadyDone = !!localStorage.getItem("gov_boot_v1");
    if (!bootAlreadyDone) {
      window.addEventListener("boot-complete", show, { once: true });
      return () => window.removeEventListener("boot-complete", show);
    } else {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [hasSeenOnboarding]);

  // Guardar step actual en localStorage para sobrevivir navegación
  useEffect(() => {
    if (!visible) return;
    localStorage.setItem(LS_STEP_KEY, String(step));
  }, [step, visible]);

  // Calcular spotlight sobre el elemento target
  // Usa retry para elementos que cargan async (ej: VideoCapsules fetches data)
  useEffect(() => {
    if (!visible) return;
    const current = STEPS[step];
    if (!current.targetId) { setSpotlight(null); return; }

    const applySpotlight = (el: Element) => {
      // Scroll first (instant) so getBoundingClientRect returns viewport-accurate coords
      el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });
      // Measure in the next animation frame — after layout reflects the scroll
      requestAnimationFrame(() => {
        const pad = current.highlightPadding ?? 12;
        const rect = el.getBoundingClientRect();
        setSpotlight({
          top:    rect.top    - pad,
          left:   rect.left   - pad,
          width:  rect.width  + pad * 2,
          height: rect.height + pad * 2,
        });
      });
    };

    // Intentar inmediatamente
    const el = document.querySelector(`[data-tour-id="${current.targetId}"]`);
    if (el) { applySpotlight(el); return; }

    // Elemento no encontrado — puede ser async (VideoCapsules). Reintentar hasta 3s.
    setSpotlight(null);
    let attempts = 0;
    const maxAttempts = 12; // 12 × 250ms = 3 segundos
    const interval = setInterval(() => {
      attempts++;
      const found = document.querySelector(`[data-tour-id="${current.targetId}"]`);
      if (found) {
        clearInterval(interval);
        applySpotlight(found);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        // Dejar sin spotlight — la card queda centrada
      }
    }, 250);

    return () => clearInterval(interval);
  }, [step, visible]);

  const complete = useCallback(async (redirectTo?: string) => {
    setVisible(false);
    localStorage.setItem(LS_KEY, "1");
    localStorage.removeItem(LS_STEP_KEY);
    try { await fetch("/api/onboarding/complete", { method: "POST" }); } catch { /* non-critical */ }
    if (redirectTo) window.location.href = redirectTo;
  }, []);

  const next = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    const current = STEPS[step];
    const nextStep = step + 1;

    if (nextStep >= STEPS.length) {
      complete("/dashboard");
      return;
    }

    if (current.navigateTo) {
      // Guardar el próximo step y navegar — el tutorial se retoma allá
      localStorage.setItem(LS_STEP_KEY, String(nextStep));
      setVisible(false);
      window.location.href = current.navigateTo;
      return;
    }

    setStep(nextStep);
  }, [step, animating, complete]);

  const prev = useCallback(() => {
    const current = STEPS[step];
    const prevStep = step - 1;

    if (current.backTo) {
      // Volver a otra página y retomar el step anterior
      localStorage.setItem(LS_STEP_KEY, String(prevStep));
      setVisible(false);
      window.location.href = current.backTo;
      return;
    }

    setStep(prevStep);
  }, [step]);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const isFirst = step === 0;

  // Posicionamiento inteligente de la card
  const cardStyle = (() => {
    const CARD_H = 310;
    const MARGIN = 14;
    if (!spotlight) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
    const spaceBelow = window.innerHeight - (spotlight.top + spotlight.height) - MARGIN;
    const spaceAbove = spotlight.top - MARGIN;
    if (spaceBelow >= CARD_H) {
      return { top: spotlight.top + spotlight.height + MARGIN, left: "50%", transform: "translateX(-50%)" };
    }
    if (spaceAbove >= CARD_H) {
      return { top: spotlight.top - CARD_H - MARGIN, left: "50%", transform: "translateX(-50%)" };
    }
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  })();

  return (
    <>
      {/* Overlay oscuro */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[99980]"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={(e) => { if (e.target === overlayRef.current) complete(); }}
      />

      {/* Spotlight — box-shadow trick */}
      {spotlight && (
        <div
          className="fixed z-[99981] pointer-events-none"
          style={{
            top:    spotlight.top,
            left:   spotlight.left,
            width:  spotlight.width,
            height: spotlight.height,
            borderRadius: "12px",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            border: "2px solid rgba(255,214,10,0.8)",
            background: "rgba(255,214,10,0.05)",
          }}
        />
      )}

      {/* Tutorial card */}
      <div className="fixed z-[99990] w-full max-w-sm px-4" style={cardStyle}>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0D1F36 0%, #143A6B 100%)",
            border: "2px solid rgba(255,214,10,0.4)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(255,214,10,0.15)",
          }}
        >
          {/* Dots de progreso */}
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

          {/* Contenido */}
          <div className="px-6 pt-5 pb-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative select-none" style={{ animation: "bar-bounce 1.4s ease-in-out infinite" }}>
                <div
                  className="w-20 h-20 rounded-full overflow-hidden"
                  style={{
                    border: "3px solid #FFD60A",
                    boxShadow: "0 0 28px rgba(255,214,10,0.5), 0 0 8px rgba(255,214,10,0.8)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/aguila.png"
                    alt="Govbidder"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                  />
                </div>
                <span
                  className="absolute -bottom-1 -right-1 text-lg leading-none"
                  style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.8))" }}
                >
                  {SANTO_EMOJIS[current.santoMood ?? "wave"]}
                </span>
              </div>
            </div>

            <h2 className="text-lg font-bold text-white mb-3 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              {current.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}>
              {current.body}
            </p>
          </div>

          {/* Acciones */}
          <div className="px-6 pt-4 pb-5 flex items-center justify-between gap-3">
            <button
              onClick={complete}
              className="text-xs transition-colors"
              style={{ color: "#3A5070", fontFamily: "var(--font-sans)" }}
            >
              Saltar
            </button>

            {!isFirst && (
              <button
                onClick={prev}
                className="text-xs px-4 py-2 rounded-lg transition-all"
                style={{ color: "#A8B5CC", border: "1px solid #1E3A5C", fontFamily: "var(--font-sans)" }}
              >
                ← Atrás
              </button>
            )}

            <button
              onClick={next}
              disabled={animating}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
              style={{
                background: isLast ? "linear-gradient(135deg, #00D67A, #00B865)" : "linear-gradient(135deg, #FFD60A, #FFA500)",
                color: "#000",
                fontFamily: "var(--font-sans)",
                boxShadow: isLast ? "0 0 16px rgba(0,214,122,0.4)" : "0 0 16px rgba(255,214,10,0.4)",
              }}
            >
              {isLast ? "🚀 ¡Comenzar misión!" : current.navigateTo ? "Siguiente → (ir a Día 1)" : "Siguiente →"}
            </button>
          </div>

          <p className="text-center pb-3 text-[9px]" style={{ color: "#1E3A5C", fontFamily: "var(--font-mono)" }}>
            PASO {step + 1} / {STEPS.length}
          </p>
        </div>
      </div>
    </>
  );
}
