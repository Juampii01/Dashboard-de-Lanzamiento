"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { flyPoints, createParticleBurst } from "@/lib/wow-effects";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizRow {
  id: string;
  capsule_id: string;
  question: string;
  options: string[];
  xp_reward: number;
  question_order: number;
}

type SubmitResult =
  | { correct: true;  xp_awarded: number; total_points: number; already_correct?: boolean }
  | { correct: false; xp_awarded: 0 };

interface QuizModalProps {
  capsuleId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * QuizModal — multi-question sequential quiz after watching a video capsule.
 *
 * Flow:
 *  1. Fetch all questions for the capsule from video_quizzes_public (ordered by question_order)
 *  2. Show questions one by one — user cannot close until all are answered correctly
 *  3. Wrong answer: red state + retry (unlimited attempts)
 *  4. Correct: XP flyPoints dispatched, advance to next question
 *  5. Already correct server-side: skip (counts as done), advance
 *  6. All done: celebrate + auto-close in 2 s
 *  7. No quiz for this capsule: silently close
 */
export function QuizModal({ capsuleId, isOpen, onClose }: QuizModalProps) {
  const [questions, setQuestions] = useState<QuizRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [qIndex, setQIndex]       = useState(0);          // current question index
  const [selected, setSelected]   = useState<number | null>(null);
  const [result, setResult]       = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allDone, setAllDone]     = useState(false);

  // Reset state on open
  useEffect(() => {
    if (!isOpen || !capsuleId) return;
    setQuestions([]);
    setSelected(null);
    setResult(null);
    setQIndex(0);
    setAllDone(false);
    setLoading(true);

    const supabase = createClient();
    supabase
      .from("video_quizzes_public")
      .select("id, capsule_id, question, options, xp_reward, question_order")
      .eq("capsule_id", capsuleId)
      .order("question_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[QuizModal] fetch error:", error);
        setQuestions((data as QuizRow[] | null) ?? []);
        setLoading(false);
      });
  }, [isOpen, capsuleId]);

  // No quiz for this capsule → close immediately
  useEffect(() => {
    if (!loading && questions.length === 0 && isOpen) {
      onClose();
    }
  }, [loading, questions, isOpen, onClose]);

  const currentQ = questions[qIndex] ?? null;

  const handleSubmit = useCallback(async (optionIndex: number) => {
    if (!currentQ || submitting) return;
    setSelected(optionIndex);
    setSubmitting(true);

    try {
      const res  = await fetch("/api/quiz/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ quiz_id: currentQ.id, selected_option_index: optionIndex }),
      });
      const data: SubmitResult = await res.json();
      setResult(data);

      if (data.correct) {
        // XP effect only on first correct answer (not already_correct)
        if (data.xp_awarded > 0 && "total_points" in data && data.total_points != null) {
          window.dispatchEvent(
            new CustomEvent("xp-gained", {
              detail: { delta: data.xp_awarded, total: data.total_points, source: "quiz" },
            })
          );
          const cx = window.innerWidth  / 2;
          const cy = window.innerHeight / 2;
          createParticleBurst(cx, cy, "gold", 18);
          flyPoints(cx, cy, cx, cy - 100, `+${data.xp_awarded} XP 🎯`);
        }

        // Advance after a short pause
        setTimeout(() => {
          const nextIdx = qIndex + 1;
          if (nextIdx >= questions.length) {
            setAllDone(true);
            setTimeout(onClose, 2500);
          } else {
            setQIndex(nextIdx);
            setSelected(null);
            setResult(null);
          }
        }, 1200);
      }
    } catch (err) {
      console.error("[QuizModal] submit error:", err);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }, [currentQ, submitting, qIndex, questions.length, onClose]);

  const handleRetry = useCallback(() => {
    setSelected(null);
    setResult(null);
  }, []);

  if (!isOpen) return null;

  const total      = questions.length;
  const progress   = allDone ? total : qIndex;
  const isAnswered = result !== null;
  const isCorrect  = result?.correct === true;
  const isWrong    = result?.correct === false;

  // Border / glow colour based on state
  const borderColor = allDone || isCorrect
    ? "rgba(0,214,122,0.5)"
    : isWrong
    ? "rgba(215,38,61,0.4)"
    : "rgba(255,214,10,0.35)";
  const glowColor = allDone || isCorrect
    ? "rgba(0,214,122,0.2)"
    : isWrong
    ? "rgba(215,38,61,0.15)"
    : "rgba(255,214,10,0.12)";

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: "#0A2540",
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 40px ${glowColor}`,
          transition: "border-color 0.4s, box-shadow 0.4s",
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1E3A5C" }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "#FFD60A", fontFamily: "var(--font-arcade)" }}
            >
              Quiz Rápido
            </span>
            {!loading && total > 0 && !allDone && (
              <span
                className="text-[10px] tabular-nums"
                style={{ color: "#5A6B85", fontFamily: "var(--font-mono)" }}
              >
                {progress + 1}/{total}
              </span>
            )}
          </div>
          {/* Close is locked until all questions are done */}
          {allDone ? (
            <button
              onClick={onClose}
              className="text-[#5A6B85] hover:text-white transition-colors"
              style={{ fontSize: "16px", lineHeight: 1 }}
            >
              ✕
            </button>
          ) : (
            <span
              title="Completá el quiz para cerrar"
              style={{ fontSize: "12px", color: "#3A5070", cursor: "default" }}
            >
              🔒
            </span>
          )}
        </div>

        {/* Progress bar */}
        {!loading && total > 1 && (
          <div style={{ height: "3px", background: "#0F1E30" }}>
            <div
              style={{
                height: "100%",
                width: `${((allDone ? total : qIndex) / total) * 100}%`,
                background: "linear-gradient(90deg, #FFD60A, #FF9500)",
                transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </div>
        )}

        <div className="px-5 py-5 space-y-5">

          {/* Loading */}
          {loading && (
            <div className="text-center py-8 space-y-2">
              <div
                className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin mx-auto"
                style={{ borderColor: "rgba(255,214,10,0.3)", borderTopColor: "#FFD60A" }}
              />
              <p className="text-xs" style={{ color: "#5A6B85", fontFamily: "var(--font-mono)" }}>
                Cargando preguntas…
              </p>
            </div>
          )}

          {/* All done celebration */}
          {allDone && (
            <div className="text-center py-6 space-y-3">
              <p className="text-4xl">🏆</p>
              <p className="font-bold text-xl" style={{ color: "#00D67A", fontFamily: "var(--font-display)" }}>
                ¡Quiz completado!
              </p>
              <p className="text-sm" style={{ color: "#A8B5CC" }}>
                Respondiste {total} pregunta{total !== 1 ? "s" : ""} correctamente.
              </p>
              <p className="text-xs" style={{ color: "#5A6B85" }}>Cerrando en 2 s…</p>
            </div>
          )}

          {/* After answering correctly — transitioning to next */}
          {!loading && !allDone && isCorrect && !result?.already_correct && (
            <div className="text-center py-4 space-y-2">
              <p className="text-3xl">✅</p>
              <p className="font-bold text-base" style={{ color: "#00D67A", fontFamily: "var(--font-display)" }}>
                ¡Correcto!
              </p>
              {result.xp_awarded > 0 && (
                <p
                  className="text-xl font-bold"
                  style={{ color: "#FFD60A", fontFamily: "var(--font-arcade)", textShadow: "0 0 20px rgba(255,214,10,0.6)" }}
                >
                  +{result.xp_awarded} XP
                </p>
              )}
              {qIndex + 1 < questions.length && (
                <p className="text-xs" style={{ color: "#5A6B85" }}>Siguiente pregunta…</p>
              )}
            </div>
          )}

          {/* Already correct — skip to next */}
          {!loading && !allDone && isCorrect && result?.already_correct && (
            <div className="text-center py-4 space-y-2">
              <p className="text-2xl">✅</p>
              <p className="text-sm" style={{ color: "#A8B5CC" }}>
                Ya respondiste esta correctamente.
              </p>
            </div>
          )}

          {/* Question + options */}
          {!loading && !allDone && currentQ && !isAnswered && (
            <>
              <p
                className="text-sm leading-relaxed font-medium text-white"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {currentQ.question}
              </p>

              <div className="space-y-2.5">
                {(currentQ.options as string[]).map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(idx)}
                    disabled={submitting}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                    style={{
                      background: selected === idx && submitting
                        ? "rgba(255,214,10,0.15)"
                        : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${selected === idx && submitting ? "#FFD60A" : "rgba(255,255,255,0.08)"}`,
                      color: selected === idx && submitting ? "#FFD60A" : "#C8D6E8",
                      fontFamily: "var(--font-sans)",
                      cursor: submitting ? "wait" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!submitting) {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,214,10,0.08)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,214,10,0.4)";
                        (e.currentTarget as HTMLButtonElement).style.color = "#FFD60A";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submitting || selected !== idx) {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
                        (e.currentTarget as HTMLButtonElement).style.color = "#C8D6E8";
                      }
                    }}
                  >
                    <span
                      className="inline-block w-5 h-5 rounded-full text-[10px] font-bold mr-2.5 text-center leading-5 shrink-0"
                      style={{ background: "rgba(255,214,10,0.12)", color: "#FFD60A" }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-center" style={{ color: "#3A5070", fontFamily: "var(--font-mono)" }}>
                Respuesta correcta = +{currentQ.xp_reward} XP · No hay límite de intentos
              </p>
            </>
          )}

          {/* Wrong answer — retry */}
          {!loading && !allDone && isWrong && currentQ && (
            <div className="space-y-4">
              <div className="text-center space-y-2 py-2">
                <p className="text-2xl">❌</p>
                <p className="font-bold text-sm" style={{ color: "#D7263D", fontFamily: "var(--font-display)" }}>
                  Respuesta incorrecta
                </p>
                <p className="text-xs" style={{ color: "#A8B5CC" }}>
                  Revisá el video y volvé a intentarlo.
                </p>
              </div>
              <button
                onClick={handleRetry}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: "rgba(215,38,61,0.12)",
                  border: "1.5px solid rgba(215,38,61,0.3)",
                  color: "#D7263D",
                  fontFamily: "var(--font-sans)",
                }}
              >
                ↩ Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
