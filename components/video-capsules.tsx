"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createParticleBurst, flyPoints } from "@/lib/wow-effects";
import { QuizModal } from "./quiz-modal";

// ─── YouTube IFrame API types (minimal) ─────────────────────────────────────
declare global {
  interface Window {
    YT?: {
      Player: new (
        target: string | HTMLElement,
        opts: {
          events?: {
            onStateChange?: (e: { data: number }) => void;
            onReady?:       () => void;
          };
        }
      ) => unknown;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Capsule {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  podcast_url: string | null;
  video_type: string;       // "normal" | "podcast"
  orientation: string;      // "horizontal" | "vertical"
  duration_seconds: number | null;
  points_reward: number;
  sort_order: number;
  completed: boolean;
}

interface VideoCapsulesProps {
  day: number;
  isAdmin?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COOLDOWN_SECONDS = 5 * 60; // 5 minutes
// Emergency fallback: unlock button if YouTube API never fires (e.g. API blocked).
// Set high so the intended flow is always "video ends → button unlocks".
const FALLBACK_LOCK_SECS = 60 * 60; // 1 hour — effectively "API only"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?/\s]{11})/);
  return match?.[1] ?? null;
}

function typeBadge(videoType: string) {
  if (videoType === "podcast") return { label: "🎙 Podcast", color: "#FF9500" };
  return                               { label: "📹 Video",  color: "#00D4FF" };
}

// ─── CooldownBadge ────────────────────────────────────────────────────────────

function CooldownBadge({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const t = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  if (remaining <= 0) return null;

  return (
    <span className="text-[10px] tabular-nums" style={{ color: "#A8B5CC", fontFamily: "var(--font-mono)" }}>
      ⏳ {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

// ─── PodcastClaimButton ───────────────────────────────────────────────────────

function PodcastClaimButton({ capsuleId, btnRef }: { capsuleId: string; btnRef: React.RefObject<HTMLButtonElement | null> }) {
  const [state, setState] = useState<"idle" | "claiming" | "claimed">("idle");

  const claim = useCallback(async () => {
    if (state !== "idle") return;
    setState("claiming");
    try {
      const res  = await fetch("/api/xp/claim-podcast", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ capsuleId }),
      });
      const data = await res.json() as { ok?: boolean; points?: number; total?: number; alreadyClaimed?: boolean };
      if (data.ok) {
        setState("claimed");
        if (!data.alreadyClaimed && data.points && data.total != null) {
          window.dispatchEvent(new CustomEvent("xp-gained", {
            detail: { delta: data.points, total: data.total, source: "podcast" },
          }));
          if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top  + rect.height / 2;
            createParticleBurst(cx, cy, "gold", 14);
            flyPoints(cx, cy, cx, cy - 80, `+${data.points} XP 🎙`);
          }
        }
      }
    } catch (err) {
      console.error("[podcast-claim]", err);
      setState("idle");
    }
  }, [capsuleId, state, btnRef]);

  if (state === "claimed") {
    return (
      <span style={{ fontSize: "11px", color: "#00D67A", fontFamily: "var(--font-mono)" }}>
        ✓ +30 XP reclamados
      </span>
    );
  }

  return (
    <button
      ref={btnRef}
      onClick={claim}
      disabled={state === "claiming"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 14px",
        borderRadius: "8px",
        border: "none",
        background: "linear-gradient(135deg, #FF9500, #FF6B00)",
        color: "#fff",
        fontFamily: "var(--font-sans)",
        fontSize: "12px",
        fontWeight: 700,
        cursor: state === "claiming" ? "wait" : "pointer",
        boxShadow: "0 0 14px rgba(255,149,0,0.4)",
        opacity: state === "claiming" ? 0.7 : 1,
      }}
    >
      {state === "claiming" ? "..." : "🎙 Escuché el podcast completo → +30 XP"}
    </button>
  );
}

// ─── VideoCapsules ────────────────────────────────────────────────────────────

export function VideoCapsules({ day, isAdmin }: VideoCapsulesProps) {
  const [capsules, setCapsules]         = useState<Capsule[]>([]);
  const [loading, setLoading]           = useState(true);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [activeId, setActiveId]         = useState<string | null>(null);
  const [marking, setMarking]           = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const [quizCapsuleId, setQuizCapsuleId] = useState<string | null>(null);

  // Video locking — unlocks when video ends (IFrame API) or fallback timer fires
  const [videoUnlocked, setVideoUnlocked] = useState(false);
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const fallbackRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markBtnRef   = useRef<HTMLButtonElement>(null);
  const podcastBtnRef = useRef<HTMLButtonElement>(null);

  // ── Load capsules ────────────────────────────────────────────────────────────

  const loadCapsules = useCallback(async () => {
    try {
      const res  = await fetch(`/api/capsules?day=${day}`);
      const data = await res.json() as {
        capsules: Capsule[];
        lastCompletedAt: string | null;
      };
      setCapsules(data.capsules ?? []);

      if (!isAdmin && data.lastCompletedAt) {
        const elapsed = (Date.now() - new Date(data.lastCompletedAt).getTime()) / 1000;
        const left = Math.ceil(COOLDOWN_SECONDS - elapsed);
        setCooldownSecs(Math.max(0, left));
      }
    } catch (err) {
      console.error("[video-capsules] loadCapsules failed:", err);
    } finally {
      setLoading(false);
    }
  }, [day, isAdmin]);

  useEffect(() => { loadCapsules(); }, [loadCapsules]);

  // ── Open a specific capsule ───────────────────────────────────────────────────

  const handleWatchCapsule = useCallback((id: string) => {
    setActiveId(id);
    setVideoUnlocked(!!isAdmin); // admins skip the watch gate
  }, [isAdmin]);

  // ── YouTube IFrame API + fallback timer when modal opens ─────────────────────

  useEffect(() => {
    if (!activeId) {
      // Clear any pending fallback when modal closes
      if (fallbackRef.current) { clearTimeout(fallbackRef.current); fallbackRef.current = null; }
      return;
    }

    const activeCap = capsules.find((c) => c.id === activeId);
    if (!activeCap) return;

    const lockSecs = activeCap.duration_seconds ?? FALLBACK_LOCK_SECS;

    // Fallback timer — fires after duration (or 30s minimum)
    fallbackRef.current = setTimeout(() => {
      setVideoUnlocked(true);
    }, Math.max(lockSecs, FALLBACK_LOCK_SECS) * 1000);

    // YouTube IFrame API for ENDED event
    const videoId = getYoutubeId(activeCap.youtube_url);
    if (!videoId) return;

    const tryCreatePlayer = () => {
      const iframe = iframeRef.current;
      if (!iframe || !window.YT?.Player) return;

      new window.YT.Player(iframe, {
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === 0) {
              // ENDED
              if (fallbackRef.current) { clearTimeout(fallbackRef.current); fallbackRef.current = null; }
              setVideoUnlocked(true);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      // API already loaded
      tryCreatePlayer();
    } else {
      // Load API script once
      if (!document.getElementById("yt-iframe-api")) {
        const script = document.createElement("script");
        script.id  = "yt-iframe-api";
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
      window.onYouTubeIframeAPIReady = tryCreatePlayer;
    }

    return () => {
      if (fallbackRef.current) { clearTimeout(fallbackRef.current); fallbackRef.current = null; }
    };
  }, [activeId, capsules]);

  // ── Mark capsule as watched ───────────────────────────────────────────────────

  const handleMark = useCallback(async () => {
    if (!activeId || marking || !videoUnlocked) return;
    setMarking(true);

    try {
      const res  = await fetch("/api/xp/watch-capsule", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ capsuleId: activeId }),
      });
      const data = await res.json() as {
        ok: boolean; points?: number; total?: number;
        cooldown?: boolean; nextInSeconds?: number;
        alreadyWatched?: boolean; combo?: number;
      };

      if (data.ok && data.alreadyWatched) {
        // Admin re-watch: close modal and reopen quiz (no XP)
        const watchedId = activeId;
        setActiveId(null);
        setVideoUnlocked(false);
        if (watchedId) setQuizCapsuleId(watchedId);
      } else if (data.ok && data.points && data.total != null) {
        window.dispatchEvent(new CustomEvent("xp-gained", {
          detail: { delta: data.points, total: data.total, source: "capsule" },
        }));

        if (data.combo != null) {
          window.dispatchEvent(new CustomEvent("combo-progress", { detail: { progress: data.combo } }));
        }

        if (markBtnRef.current) {
          const rect = markBtnRef.current.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top  + rect.height / 2;
          createParticleBurst(cx, cy, "cyan", 16);
          flyPoints(cx, cy, cx, cy - 80, `+${data.points} XP 📺`);
        }

        await loadCapsules();
        const watchedId = activeId;
        setActiveId(null);
        setVideoUnlocked(false);
        if (!isAdmin) setCooldownSecs(COOLDOWN_SECONDS);
        if (watchedId) setQuizCapsuleId(watchedId);
      } else if (data.cooldown && data.nextInSeconds) {
        setCooldownSecs(data.nextInSeconds);
        setActiveId(null);
        setVideoUnlocked(false);
      }
    } finally {
      setMarking(false);
    }
  }, [activeId, marking, videoUnlocked, loadCapsules, isAdmin]);

  // ── Derived ───────────────────────────────────────────────────────────────────

  const completed   = capsules.filter((c) => c.completed).length;
  const total       = capsules.length;
  const allDone     = total > 0 && completed === total;
  const onCooldown  = cooldownSecs > 0;
  const activeCap   = capsules.find((c) => c.id === activeId);
  const videoId   = activeCap ? getYoutubeId(activeCap.youtube_url) : null;
  const isVertical = activeCap?.orientation === "vertical";

  if (loading) {
    return (
      <div className="rounded-xl border p-5" style={{ background: "rgba(20,58,107,0.4)", borderColor: "#1E3A5C" }}>
        <div className="skeleton h-4 w-40 mb-3" />
        <div className="skeleton h-10 w-full" />
      </div>
    );
  }

  if (total === 0) return null;

  return (
    <>
      {/* ── Video Modal ─────────────────────────────────────────────────────── */}
      {activeId && activeCap && (
        <div
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveId(null); }}
        >
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              maxWidth: isVertical ? "360px" : "672px",
              background: "#0A2540",
              border: "2px solid rgba(0,212,255,0.3)",
            }}
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-start justify-between" style={{ borderBottom: "1px solid #1E3A5C" }}>
              <div>
                {/* Type badge */}
                <p
                  className="text-[10px] uppercase tracking-widest mb-1"
                  style={{ color: typeBadge(activeCap.video_type).color, fontFamily: "var(--font-mono)" }}
                >
                  {typeBadge(activeCap.video_type).label}
                </p>
                <h3 className="text-base font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                  {activeCap.title}
                </h3>
                {activeCap.description && (
                  <p className="text-xs mt-1" style={{ color: "#A8B5CC" }}>{activeCap.description}</p>
                )}
              </div>
              <button
                onClick={() => setActiveId(null)}
                className="text-[#5A6B85] hover:text-white transition-colors ml-4 mt-0.5"
                style={{ fontSize: "18px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Video container — responsive by orientation */}
            <div
              className="relative w-full"
              style={{ paddingTop: isVertical ? "177.78%" : "56.25%" }}
            >
              {videoId ? (
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&controls=0&iv_load_policy=3&cc_load_policy=0`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              ) : (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                  style={{ background: "#061528" }}
                >
                  <span className="text-4xl">🎬</span>
                  <p className="text-sm" style={{ color: "#5A6B85" }}>
                    Video próximamente — el admin está subiendo el contenido
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-4 flex flex-col gap-3"
              style={{ borderTop: "1px solid #1E3A5C" }}
            >
              {/* Mark as watched row */}
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: "#5A6B85", fontFamily: "var(--font-mono)" }}>
                  {videoUnlocked
                    ? "Video visto — marcá para ganar XP"
                    : "⏳ Mirá el video completo para desbloquear"}
                </p>
                <button
                  ref={markBtnRef}
                  onClick={handleMark}
                  disabled={marking || !videoUnlocked}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: videoUnlocked
                      ? "linear-gradient(135deg, #00D67A, #00B865)"
                      : "rgba(0,214,122,0.1)",
                    color: videoUnlocked ? "#000" : "#3A5070",
                    fontFamily: "var(--font-sans)",
                    boxShadow: videoUnlocked ? "0 0 16px rgba(0,214,122,0.4)" : "none",
                    transition: "background 0.4s, box-shadow 0.4s, color 0.3s",
                  }}
                >
                  {marking ? "Guardando..." : `✓ Visto → +${activeCap.points_reward} XP`}
                </button>
              </div>

              {/* Podcast claim button (only for podcast type) */}
              {activeCap.video_type === "podcast" && (
                <div className="flex justify-end">
                  <PodcastClaimButton
                    capsuleId={activeCap.id}
                    btnRef={podcastBtnRef}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Quiz Modal ──────────────────────────────────────────────────────── */}
      <QuizModal
        capsuleId={quizCapsuleId ?? ""}
        isOpen={!!quizCapsuleId}
        onClose={() => setQuizCapsuleId(null)}
      />

      {/* ── Widget ──────────────────────────────────────────────────────────── */}
      <div
        data-tour-id="capsules"
        className="rounded-xl border overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(10,37,64,0.88) 100%)",
          borderColor: "rgba(0,212,255,0.2)",
        }}
      >
        {/* Widget Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 cursor-pointer"
          style={{ borderBottom: expanded ? "1px solid rgba(0,212,255,0.12)" : "none" }}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg select-none">📺</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00D4FF", fontFamily: "var(--font-arcade)" }}>
                Misiones en video
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "#5A6B85", fontFamily: "var(--font-mono)" }}>
                {completed}/{total} completadas · {capsules.filter(c => !c.completed).reduce((sum, c) => sum + c.points_reward, 0)} XP disponibles
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Progress pills */}
            <div className="flex gap-1">
              {capsules.map((c) => {
                const badge = typeBadge(c.video_type);
                return (
                  <div
                    key={c.id}
                    title={badge.label}
                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px]"
                    style={{
                      background: c.completed ? "rgba(0,214,122,0.2)" : "rgba(0,212,255,0.1)",
                      border: `1px solid ${c.completed ? "#00D67A" : "rgba(0,212,255,0.3)"}`,
                      color: c.completed ? "#00D67A" : "#5A6B85",
                    }}
                  >
                    {c.completed ? "✓" : "●"}
                  </div>
                );
              })}
            </div>
            <span style={{ color: "#5A6B85", fontSize: "12px" }}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* Widget Body */}
        {expanded && (
          <div className="px-5 py-4">

            {/* Status row — only shown when cooldown active or all done */}
            {allDone && (
              <p className="text-sm font-semibold mb-3" style={{ color: "#00D67A" }}>
                🏆 ¡Todas las misiones completadas!
              </p>
            )}
            {!allDone && onCooldown && (
              <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
                <p className="text-xs" style={{ color: "#5A6B85" }}>Próxima misión en</p>
                <CooldownBadge seconds={cooldownSecs} />
              </div>
            )}

            {/* Capsule list — each row has its own action button */}
            <div className="space-y-2">
              {capsules.map((c) => {
                const badge    = typeBadge(c.video_type);
                const canDoThis = !c.completed && !onCooldown;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{
                      background: c.completed ? "rgba(0,214,122,0.06)" : "rgba(0,212,255,0.04)",
                      border: `1px solid ${c.completed ? "rgba(0,214,122,0.15)" : "rgba(0,212,255,0.08)"}`,
                    }}
                  >
                    {/* Completion dot */}
                    <span className="text-xs shrink-0" style={{ color: c.completed ? "#00D67A" : "#3A5070" }}>
                      {c.completed ? "✓" : "○"}
                    </span>

                    {/* Type badge */}
                    <span
                      className="text-[9px] shrink-0 px-1.5 py-0.5 rounded"
                      style={{
                        color: badge.color,
                        background: "rgba(0,0,0,0.3)",
                        border: `1px solid ${badge.color}33`,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {badge.label}
                    </span>

                    {/* Title */}
                    <span
                      className="flex-1 text-xs truncate"
                      style={{ color: c.completed ? "#00D67A" : "#A8B5CC", fontFamily: "var(--font-sans)" }}
                    >
                      {c.title}
                    </span>

                    {/* XP reward */}
                    <span
                      className="text-[10px] shrink-0"
                      style={{ color: c.completed ? "#00D67A" : "#3A5070", fontFamily: "var(--font-mono)" }}
                    >
                      +{c.points_reward} XP
                    </span>

                    {/* Per-capsule action button */}
                    {c.completed ? (
                      <button
                        onClick={() => handleWatchCapsule(c.id)}
                        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all"
                        style={{
                          color: "#00D67A",
                          background: "rgba(0,214,122,0.08)",
                          border: "1px solid rgba(0,214,122,0.2)",
                          fontFamily: "var(--font-mono)",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget).style.background = "rgba(0,214,122,0.18)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget).style.background = "rgba(0,214,122,0.08)";
                        }}
                      >
                        ✓ Ver de nuevo
                      </button>
                    ) : (
                      <button
                        onClick={() => handleWatchCapsule(c.id)}
                        disabled={!canDoThis}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: canDoThis
                            ? "linear-gradient(135deg, #00D4FF, #0099CC)"
                            : "rgba(0,212,255,0.08)",
                          color: canDoThis ? "#000" : "#3A5070",
                          fontFamily: "var(--font-sans)",
                          boxShadow: canDoThis ? "0 0 10px rgba(0,212,255,0.3)" : "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ▶ Hacer misión
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
