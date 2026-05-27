"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { flyPoints, createParticleBurst } from "@/lib/wow-effects";

interface QuizRow {
  id: string;
  capsule_id: string;
  question: string;
  options: string[];
  xp_reward: number;
}

type SubmitResult =
  | { correct: true;  xp_awarded: number; total_points: number; already_correct?: boolean }
  | { correct: false; xp_awarded: 0 };

interface QuizModalProps {
  capsuleId: string;        // text FK from video_capsules
  isOpen: boolean;
  onClose: () => void;
}

/**
 * QuizModal — shows a multiple-choice question after the user marks a video as watched.
 *
 * Flow:
 *  1. Fetches quiz from video_quizzes_public (answer hidden, view grants SELECT to authenticated)
 *  2. User picks an option → POST /api/quiz/submit
 *  3. Correct:   green state, XP flyPoints, dispatches xp-gained, auto-closes in 2 s
 *  4. Incorrect: red state, allows retry
 *  5. Already correct on server: shows "ya completaste" immediately
 *  6. No quiz for this capsule: silently closes (quiz is optional)
 */
export function QuizModal({ capsuleId, isOpen, onClose }: QuizModalProps) {
  const [quiz, setQuiz]         = useState<QuizRow | null>(null);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult]     = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch quiz when modal opens
  useEffect(() => {
    if (!isOpen || !capsuleId) return;
    setQuiz(null);
    setSelected(null);
    setResult(null);
    setLoading(true);

    const supabase = createClient();
    supabase
      .from("video_quizzes_public")
      .select("id, capsule_id, question, options, xp_reward")
      .eq("capsule_id", capsuleId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[QuizModal] fetch error:", error);
        setQuiz(data as QuizRow | null);
        setLoading(false);
      });
  }, [isOpen, capsuleId]);

  // If no quiz exists for this capsule, close immediately (non-blocking)
  useEffect(() => {
    if (!loading && quiz === null && isOpen) {
      onClose();
    }
  }, [loading, quiz, isOpen, onClose]);

  const handleSubmit = useCallback(async (optionIndex: number) => {
    if (!quiz || submitting) return;
    setSelected(optionIndex);
    setSubmitting(true);

    try {
      const res  = await fetch("/api/quiz/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ quiz_id: quiz.id, selected_option_index: optionIndex }),
      });
      const data: SubmitResult = await res.json();
      setResult(data);

      if (data.correct && data.xp_awarded > 0 && "total_points" in data && data.total_points != null) {
        // Fire XP effects
        window.dispatchEvent(
          new CustomEvent("xp-gained", {
            detail: { delta: data.xp_awarded, total: data.total_points, source: "quiz" },
          })
        );
        // Particle burst from center of screen
        const cx = window.innerWidth  / 2;
        const cy = window.innerHeight / 2;
        createParticleBurst(cx, cy, "gold", 18);
        flyPoints(cx, cy, cx, cy - 100, `+${data.xp_awarded} XP 🎯`);
      }

      // Auto-close after 2 s on correct answer
      if (data.correct) {
        setTimeout(onClose, 2000);
      }
    } catch (err) {
      console.error("[QuizModal] submit error:", err);
    } finally {
      setSubmitting(false);
    }
  }, [quiz, submitting, onClose]);

  const handleRetry = useCallback(() => {
    setSelected(null);
    setResult(null);
  }, []);

  if (!isOpen) return null;

  const isAnswered = result !== null;
  const isCorrect  = result?.correct === true;
  const isWrong    = result?.correct === false;

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: "#0A2540",
          border: `2px solid ${isCorrect ? "rgba(0,214,122,0.5)" : isWrong ? "rgba(215,38,61,0.4)" : "rgba(255,214,10,0.35)"}`,
          boxShadow: isCorrect
            ? "0 0 40px rgba(0,214,122,0.2)"
            : isWrong
            ? "0 0 40px rgba(215,38,61,0.15)"
            : "0 0 40px rgba(255,214,10,0.12)",
          transition: "border-color 0.4s, box-shadow 0.4s",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid #1E3A5C" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "#FFD60A", fontFamily: "var(--font-arcade)" }}
            >
              Quiz Rápido
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A6B85] hover:text-white transition-colors"
            style={{ fontSize: "16px", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Loading state */}
          {loading && (
            <div className="text-center py-8 space-y-2">
              <div
                className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin mx-auto"
                style={{ borderColor: "rgba(255,214,10,0.3)", borderTopColor: "#FFD60A" }}
              />
              <p className="text-xs" style={{ color: "#5A6B85", fontFamily: "var(--font-mono)" }}>
                Cargando pregunta…
              </p>
            </div>
          )}

          {/* Already correct */}
          {!loading && isCorrect && result?.already_correct && (
            <div className="text-center py-6 space-y-2">
              <p className="text-3xl">✅</p>
              <p className="font-bold text-lg" style={{ color: "#00D67A", fontFamily: "var(--font-display)" }}>
                ¡Ya completaste este quiz!
              </p>
              <p className="text-xs" style={{ color: "#5A6B85" }}>Cerrando…</p>
            </div>
          )}

          {/* Correct (first time) */}
          {!loading && isCorrect && !result?.already_correct && (
            <div className="text-center py-6 space-y-2">
              <p className="text-3xl">🎉</p>
              <p className="font-bold text-xl" style={{ color: "#00D67A", fontFamily: "var(--font-display)" }}>
                ¡Correcto!
              </p>
              {result.xp_awarded > 0 && (
                <p
                  className="text-2xl font-bold"
                  style={{ color: "#FFD60A", fontFamily: "var(--font-arcade)", textShadow: "0 0 20px rgba(255,214,10,0.6)" }}
                >
                  +{result.xp_awarded} XP
                </p>
              )}
              <p className="text-xs" style={{ color: "#5A6B85" }}>Cerrando en 2 s…</p>
            </div>
          )}

          {/* Quiz question + options */}
          {!loading && quiz && !isAnswered && (
            <>
              <p
                className="text-sm leading-relaxed font-medium text-white"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {quiz.question}
              </p>

              <div className="space-y-2.5">
                {(quiz.options as string[]).map((opt, idx) => (
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
                Respuesta correcta = +{quiz.xp_reward} XP
              </p>
            </>
          )}

          {/* Wrong answer — show retry */}
          {!loading && isWrong && quiz && (
            <div className="space-y-4">
              <div className="text-center space-y-2 py-2">
                <p className="text-2xl">❌</p>
                <p className="font-bold text-sm" style={{ color: "#D7263D", fontFamily: "var(--font-display)" }}>
                  Respuesta incorrecta
                </p>
                <p className="text-xs" style={{ color: "#A8B5CC" }}>
                  Revisá el video y volvé a intentarlo — no hay límite de intentos.
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
