"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

interface SubmitResponse {
  correct: boolean;
  xp_awarded: number;
  total_points?: number | null;
  already_correct?: boolean;
  correct_option_index?: number;
  explanation?: string | null;
  error?: string;
}

type Phase = "idle" | "submitting" | "correct" | "already_correct" | "wrong";

interface QuizModalProps {
  capsuleId: string;
  isOpen: boolean;
  onClose: () => void;
  podcastUrl?: string | null;
  podcastCapsuleId?: string | null;
  /** When set, replaces the podcast CTA with a "continue to next mission" button */
  continueLabel?: string | null;
  onContinue?: (() => void) | null;
}

// ─── QuizModal ────────────────────────────────────────────────────────────────

/**
 * Multi-question sequential quiz.
 *
 * Flow per question:
 *  idle → user picks option → submitting → correct / wrong / already_correct
 *  correct:         options highlight green, explanation shown, auto-advance 2.2s
 *  already_correct: fast auto-advance 1s (no XP, no celebration)
 *  wrong:           selected turns red, correct turns green, explanation shown,
 *                   "Intentar de nuevo" resets to idle (server re-reveals correct
 *                   on next wrong attempt)
 *
 * correct_option_index and explanation come from the server on every submit
 * response — never pre-loaded (client never sees correct answer before submitting).
 */
export function QuizModal({ capsuleId, isOpen, onClose, podcastUrl, podcastCapsuleId, continueLabel, onContinue }: QuizModalProps) {
  const [questions,   setQuestions]   = useState<QuizRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [qIndex,      setQIndex]      = useState(0);
  const [phase,       setPhase]       = useState<Phase>("idle");
  const [selected,    setSelected]    = useState<number | null>(null);
  const [revealedIdx, setRevealedIdx] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [xpThisQ,     setXpThisQ]    = useState(0);
  const [allDone,     setAllDone]     = useState(false);
  const [apiError,    setApiError]    = useState<string | null>(null);
  const [podcastState, setPodcastState] = useState<"idle" | "claiming" | "done">("idle");
  // Resultado por pregunta (índice → correcta/incorrecta) para colorear los dots.
  const [results,     setResults]     = useState<Record<number, "correct" | "wrong">>({});
  const totalXpRef                   = useRef(0); // XP newly awarded this session
  const correctXpRef                 = useRef(0); // XP value of all correct answers (incl. already-earned)

  // ── Claim podcast XP + open the podcast link (once) ──────────────────────────
  const handlePodcast = useCallback(async () => {
    if (podcastUrl) window.open(podcastUrl, "_blank", "noopener,noreferrer");
    if (podcastState !== "idle" || !podcastCapsuleId) {
      setPodcastState((s) => (s === "idle" ? "done" : s));
      return;
    }
    setPodcastState("claiming");
    try {
      const res = await fetch("/api/xp/claim-podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capsuleId: podcastCapsuleId }),
      });
      const data = (await res.json()) as { ok?: boolean; points?: number; total?: number; alreadyClaimed?: boolean };
      if (data.ok && !data.alreadyClaimed && data.points && data.total != null) {
        window.dispatchEvent(new CustomEvent("xp-gained", {
          detail: { delta: data.points, total: data.total, source: "podcast" },
        }));
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        createParticleBurst(cx, cy, "gold", 16);
        flyPoints(cx, cy, cx, cy - 90, `+${data.points} XP 🎙`);
      }
    } catch { /* non-critical — link already opened */ } finally {
      setPodcastState("done");
    }
  }, [podcastUrl, podcastCapsuleId, podcastState]);

  // ── Reset on open ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !capsuleId) return;
    setQuestions([]);
    setLoading(true);
    setQIndex(0);
    setPhase("idle");
    setSelected(null);
    setRevealedIdx(null);
    setExplanation(null);
    setXpThisQ(0);
    setAllDone(false);
    setApiError(null);
    setPodcastState("idle");
    setResults({});
    totalXpRef.current = 0;
    correctXpRef.current = 0;

    const supabase = createClient();
    supabase
      .from("video_quizzes_public")
      .select("id, capsule_id, question, options, xp_reward, question_order")
      .eq("capsule_id", capsuleId)
      .order("question_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[QuizModal] fetch:", error);
        setQuestions((data as QuizRow[] | null) ?? []);
        setLoading(false);
      });
  }, [isOpen, capsuleId]);

  // ── Auto-close when no questions ─────────────────────────────────────────────

  useEffect(() => {
    if (!loading && questions.length === 0 && isOpen) onClose();
  }, [loading, questions, isOpen, onClose]);

  // ── Advance to next question (or close) ────────────────────────────────────

  const advance = useCallback(() => {
    const next = qIndex + 1;
    if (next >= questions.length) {
      setAllDone(true);
      // No auto-close — the user closes manually after seeing the podcast CTA
    } else {
      setQIndex(next);
      setPhase("idle");
      setSelected(null);
      setRevealedIdx(null);
      setExplanation(null);
      setXpThisQ(0);
    }
  }, [qIndex, questions.length, onClose]);

  // ── Submit answer ───────────────────────────────────────────────────────────

  const handleSelect = useCallback(async (optIdx: number) => {
    if (!questions[qIndex] || phase !== "idle") return;
    const q = questions[qIndex];
    setSelected(optIdx);
    setPhase("submitting");
    setApiError(null);

    try {
      const res = await fetch("/api/quiz/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ quiz_id: q.id, selected_option_index: optIdx }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setApiError((body as { error?: string }).error ?? `HTTP ${res.status}`);
        setPhase("idle");
        setSelected(null);
        return;
      }

      const data = await res.json() as SubmitResponse;
      if (data.correct_option_index != null) setRevealedIdx(data.correct_option_index);
      if (data.explanation)                  setExplanation(data.explanation);

      if (data.correct && !data.already_correct) {
        setXpThisQ(data.xp_awarded);
        totalXpRef.current += data.xp_awarded;
        correctXpRef.current += data.xp_awarded;
        setResults((r) => ({ ...r, [qIndex]: "correct" }));
        setPhase("correct");

        if (data.xp_awarded > 0 && data.total_points != null) {
          window.dispatchEvent(new CustomEvent("xp-gained", {
            detail: { delta: data.xp_awarded, total: data.total_points, source: "quiz" },
          }));
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          createParticleBurst(cx, cy, "gold", 18);
          flyPoints(cx, cy, cx, cy - 100, `+${data.xp_awarded} XP 🎯`);
        }
        setTimeout(advance, 2200);

      } else if (data.already_correct) {
        // Already earned before — count its value so the summary shows total XP
        correctXpRef.current += q.xp_reward;
        setResults((r) => ({ ...r, [qIndex]: "correct" }));
        setPhase("already_correct");
        setTimeout(advance, 900);

      } else {
        setResults((r) => ({ ...r, [qIndex]: "wrong" }));
        setPhase("wrong");
      }
    } catch (err) {
      console.error("[QuizModal]", err);
      setPhase("idle");
      setSelected(null);
    }
  }, [questions, qIndex, phase, advance]);

  // ── Advance after wrong (no retry — one shot per question) ────────────────

  const handleWrongNext = useCallback(() => advance(), [advance]);

  if (!isOpen) return null;

  const total    = questions.length;
  const doneCount = allDone ? total : qIndex;
  const currentQ = questions[qIndex] ?? null;

  const showFeedback = phase === "correct" || phase === "wrong";

  const borderColor =
    allDone || phase === "correct"   ? "rgba(0,214,122,0.55)"  :
    phase === "wrong"                ? "rgba(215,38,61,0.45)"   :
                                       "rgba(255,214,10,0.28)";
  const glowShadow =
    allDone || phase === "correct"   ? "0 0 48px rgba(0,214,122,0.2)"  :
    phase === "wrong"                ? "0 0 48px rgba(215,38,61,0.15)" :
                                       "0 0 32px rgba(255,214,10,0.06)";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)" }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0D2E50 0%, #0A2540 100%)",
          border:     `2px solid ${borderColor}`,
          boxShadow:  glowShadow,
          transition: "border-color 0.4s ease, box-shadow 0.4s ease",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div
          className="px-5 pt-4 pb-3.5 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Icon + title */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg">🎯</span>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "#FFD60A", fontFamily: "var(--font-arcade)" }}
            >
              Quiz Rápido
            </span>
          </div>

          {/* Progress dots — centered */}
          <div className="flex items-center gap-1.5 flex-1 justify-center">
            {!loading && total > 0 && !allDone && questions.map((_, i) => (
              <div
                key={i}
                style={{
                  width:        i === qIndex ? "24px" : "8px",
                  height:       "8px",
                  borderRadius: "4px",
                  background:
                    i === qIndex          ? "#FFD60A" :          // pregunta actual
                    results[i] === "correct" ? "#00D67A" :        // acertada → verde
                    results[i] === "wrong"   ? "#D7263D" :        // fallada → rojo
                    i < qIndex            ? "#00D67A" :           // fallback
                                            "rgba(255,255,255,0.1)", // pendiente
                  transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            ))}
          </div>

          {/* Lock — always locked until the required action is completed */}
          <div className="shrink-0">
            <span
              title="Completá la misión para continuar"
              style={{ fontSize: "13px", color: "#647FA8", cursor: "default" }}
            >
              🔒
            </span>
          </div>
        </div>

        {/* ── Progress bar ────────────────────────────────────────────────────── */}
        {!loading && total > 0 && (
          <div style={{ height: "3px", background: "#071728" }}>
            <div
              style={{
                height:     "100%",
                width:      `${(doneCount / total) * 100}%`,
                background: "linear-gradient(90deg, #FFD60A, #FF9500)",
                transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </div>
        )}

        {/* ── Body ────────────────────────────────────────────────────────────── */}
        <div className="px-5 py-5 space-y-4">

          {/* ── Loading ── */}
          {loading && (
            <div className="text-center py-12 space-y-3">
              <div
                className="w-8 h-8 rounded-full border-4 animate-spin mx-auto"
                style={{ borderColor: "rgba(255,214,10,0.15)", borderTopColor: "#FFD60A" }}
              />
              <p className="text-xs" style={{ color: "#8DA2C4", fontFamily: "var(--font-mono)" }}>
                Cargando preguntas…
              </p>
            </div>
          )}

          {/* ── All done ── */}
          {allDone && (
            <div className="text-center py-8 space-y-3">
              <p className="text-5xl">🏆</p>
              <div className="space-y-1">
                <p
                  className="font-bold text-2xl"
                  style={{ color: "#00D67A", fontFamily: "var(--font-display)" }}
                >
                  ¡Quiz completado!
                </p>
                <p className="text-sm" style={{ color: "#C9D6EC" }}>
                  {total} pregunta{total !== 1 ? "s" : ""} respondidas correctamente
                </p>
              </div>
              {totalXpRef.current > 0 ? (
                <p
                  className="text-2xl font-bold"
                  style={{
                    color: "#FFD60A",
                    fontFamily: "var(--font-arcade)",
                    textShadow: "0 0 24px rgba(255,214,10,0.55)",
                  }}
                >
                  +{totalXpRef.current} XP por las respuestas
                </p>
              ) : correctXpRef.current > 0 ? (
                <p
                  className="text-base font-bold"
                  style={{ color: "#00D67A", fontFamily: "var(--font-arcade)" }}
                >
                  ✓ Ya ganaste +{correctXpRef.current} XP en estas preguntas
                </p>
              ) : null}

              <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "8px auto 0", width: "70%" }} />

              {/* ── Continue to next mission (Mission 1 → Mission 2) ── */}
              {continueLabel && onContinue ? (
                <div className="pt-2 space-y-2">
                  <p className="text-xs" style={{ color: "#C9D6EC" }}>
                    ¡Ahora completá la siguiente misión para desbloquear el podcast!
                  </p>
                  <button
                    onClick={onContinue}
                    className="w-full py-3.5 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #00D4FF, #0099CC)",
                      color: "#000",
                      fontFamily: "var(--font-sans)",
                      boxShadow: "0 0 20px rgba(0,212,255,0.45)",
                    }}
                  >
                    {continueLabel}
                  </button>
                </div>
              ) : (
                <>
                  {/* ── Podcast CTA (shown after Mission 2 completes) ── */}
                  {podcastUrl ? (
                    <div className="pt-2 space-y-2">
                      <p className="text-xs pt-1" style={{ color: "#C9D6EC" }}>
                        ¡Completaste ambas misiones! Abrí el podcast para terminar:
                      </p>
                      <button
                        onClick={handlePodcast}
                        disabled={podcastState === "claiming"}
                        className="w-full py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2"
                        style={{
                          background: podcastState === "done"
                            ? "rgba(0,214,122,0.1)"
                            : "linear-gradient(135deg, #FF9500, #FF6B00)",
                          border: podcastState === "done" ? "1.5px solid rgba(0,214,122,0.4)" : "none",
                          color: podcastState === "done" ? "#00D67A" : "#fff",
                          fontFamily: "var(--font-sans)",
                          boxShadow: podcastState === "done" ? "none" : "0 0 16px rgba(255,149,0,0.4)",
                          cursor: podcastState === "claiming" ? "wait" : "pointer",
                        }}
                      >
                        {podcastState === "done"
                          ? "✓ Podcast abierto · +30 XP"
                          : podcastState === "claiming"
                          ? "..."
                          : "🎙 Ver podcast → +30 XP ↗"}
                      </button>
                      {/* Cerrar solo aparece después de abrir el podcast */}
                      {podcastState === "done" && (
                        <button
                          onClick={onClose}
                          className="w-full py-2.5 rounded-xl font-bold text-sm"
                          style={{
                            background: "rgba(0,214,122,0.08)",
                            border: "1.5px solid rgba(0,214,122,0.25)",
                            color: "#00D67A",
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          ✓ Listo — Cerrar
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Sin podcast URL: cerrar directo */
                    <button
                      onClick={onClose}
                      className="text-xs pt-1"
                      style={{ color: "#8DA2C4", fontFamily: "var(--font-sans)", textDecoration: "underline" }}
                    >
                      Cerrar
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── API error ── */}
          {!loading && !allDone && apiError && (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1.5">
                <p className="text-3xl">⚠️</p>
                <p
                  className="font-bold text-sm"
                  style={{ color: "#D7263D", fontFamily: "var(--font-display)" }}
                >
                  Error al enviar respuesta
                </p>
                <p className="text-xs" style={{ color: "#C9D6EC" }}>
                  {apiError === "day_locked"
                    ? "Este día aún no está desbloqueado."
                    : "Algo salió mal. Intentá de nuevo."}
                </p>
              </div>
              <button
                onClick={() => setApiError(null)}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{
                  background: "rgba(215,38,61,0.08)",
                  border:     "1.5px solid rgba(215,38,61,0.28)",
                  color:      "#D7263D",
                  fontFamily: "var(--font-sans)",
                }}
              >
                ↩ Intentar de nuevo
              </button>
            </div>
          )}

          {/* ── Question + Options ── */}
          {!loading && !allDone && !apiError && currentQ && (
            <>
              {/* Question */}
              <div className="space-y-1.5">
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(255,214,10,0.45)", fontFamily: "var(--font-mono)" }}
                >
                  Pregunta {qIndex + 1} de {total}
                </p>
                <p
                  className="text-sm leading-relaxed font-semibold text-white"
                  style={{ fontFamily: "var(--font-sans)", letterSpacing: "0.01em" }}
                >
                  {currentQ.question}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {(currentQ.options as string[]).map((opt, idx) => {
                  const isSelected  = selected === idx;
                  const isWrong     = showFeedback && phase === "wrong"    && isSelected;
                  const isGreen     = showFeedback && (
                    (phase === "wrong"    && revealedIdx === idx) ||
                    (phase === "correct"  && isSelected)
                  );
                  const isDimmed    = showFeedback && !isSelected && revealedIdx !== idx;
                  const isPending   = phase === "submitting" && isSelected;

                  let bg        = "rgba(255,255,255,0.04)";
                  let brd       = "rgba(255,255,255,0.08)";
                  let clr       = "#C8D6E8";
                  let iconLabel = String.fromCharCode(65 + idx);
                  let iconBg    = "rgba(255,214,10,0.1)";
                  let iconClr   = "#FFD60A88";

                  if (isGreen) {
                    bg = "rgba(0,214,122,0.12)"; brd = "#00D67A"; clr = "#00D67A";
                    iconLabel = "✓"; iconBg = "rgba(0,214,122,0.25)"; iconClr = "#00D67A";
                  } else if (isWrong) {
                    bg = "rgba(215,38,61,0.12)"; brd = "#D7263D"; clr = "#D7263D";
                    iconLabel = "✗"; iconBg = "rgba(215,38,61,0.25)"; iconClr = "#D7263D";
                  } else if (isPending) {
                    bg = "rgba(255,214,10,0.08)"; brd = "#FFD60A"; clr = "#FFD60A";
                    iconBg = "rgba(255,214,10,0.2)"; iconClr = "#FFD60A";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      disabled={phase !== "idle"}
                      style={{
                        width: "100%", textAlign: "left",
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "11px 15px",
                        borderRadius: "12px",
                        background: bg,
                        border: `1.5px solid ${brd}`,
                        color: clr,
                        opacity: isDimmed ? 0.28 : 1,
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: phase === "idle" ? "pointer" : "default",
                        transition: "background 0.2s, border-color 0.2s, color 0.2s, opacity 0.3s",
                        outline: "none",
                      }}
                      onMouseEnter={(e) => {
                        if (phase !== "idle") return;
                        const t = e.currentTarget;
                        t.style.background   = "rgba(255,214,10,0.08)";
                        t.style.borderColor  = "rgba(255,214,10,0.55)";
                        t.style.color        = "#FFD60A";
                      }}
                      onMouseLeave={(e) => {
                        if (phase !== "idle") return;
                        const t = e.currentTarget;
                        t.style.background   = "rgba(255,255,255,0.04)";
                        t.style.borderColor  = "rgba(255,255,255,0.08)";
                        t.style.color        = "#C8D6E8";
                      }}
                    >
                      {/* Letter / icon badge */}
                      <span
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: "22px", height: "22px", borderRadius: "50%",
                          background: iconBg, color: iconClr,
                          fontSize: (isGreen || isWrong) ? "13px" : "10px",
                          fontWeight: 800, flexShrink: 0,
                          transition: "all 0.2s ease",
                        }}
                      >
                        {iconLabel}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Explanation box */}
              {explanation && (phase === "correct" || phase === "wrong") && (
                <div
                  className="rounded-xl px-4 py-3"
                  style={{
                    background: phase === "correct"
                      ? "rgba(0,214,122,0.05)"
                      : "rgba(255,214,10,0.04)",
                    border: `1px solid ${phase === "correct"
                      ? "rgba(0,214,122,0.18)"
                      : "rgba(255,214,10,0.18)"}`,
                  }}
                >
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "#C9D6EC", fontFamily: "var(--font-sans)" }}
                  >
                    <span style={{ marginRight: "6px" }}>💡</span>
                    {explanation}
                  </p>
                </div>
              )}

              {/* XP earned */}
              {phase === "correct" && xpThisQ > 0 && (
                <p
                  className="text-center text-xl font-bold"
                  style={{
                    color: "#FFD60A",
                    fontFamily: "var(--font-arcade)",
                    textShadow: "0 0 20px rgba(255,214,10,0.5)",
                  }}
                >
                  +{xpThisQ} XP
                </p>
              )}

              {/* Status / action */}
              {phase === "idle" && (
                <p
                  className="text-[10px] text-center"
                  style={{ color: "#647FA8", fontFamily: "var(--font-mono)" }}
                >
                  +{currentQ.xp_reward} XP por responder correctamente · Sin límite de intentos
                </p>
              )}

              {phase === "submitting" && (
                <p
                  className="text-[10px] text-center"
                  style={{ color: "#8DA2C4", fontFamily: "var(--font-mono)" }}
                >
                  Verificando…
                </p>
              )}

              {phase === "correct" && (
                <p
                  className="text-center text-sm font-bold"
                  style={{ color: "#00D67A" }}
                >
                  ✓ ¡Correcto!{qIndex + 1 < total ? " Siguiente pregunta…" : ""}
                </p>
              )}

              {phase === "wrong" && (
                <div className="space-y-2">
                  <p className="text-center text-xs" style={{ color: "#8DA2C4", fontFamily: "var(--font-mono)" }}>
                    Sin XP esta vez — la respuesta correcta está marcada en verde
                  </p>
                  <button
                    onClick={handleWrongNext}
                    className="w-full py-3 rounded-xl font-bold text-sm"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border:     "1.5px solid rgba(255,255,255,0.12)",
                      color:      "#C9D6EC",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
