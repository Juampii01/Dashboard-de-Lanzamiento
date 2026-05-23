"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createParticleBurst, flyPoints } from "@/lib/wow-effects";

interface Capsule {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  points_reward: number;
  sort_order: number;
  completed: boolean;
}

interface VideoCapsulesProps {
  day: number;
}

const COOLDOWN_SECONDS = 5 * 60; // 5 minutes

function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?/\s]{11})/);
  return match?.[1] ?? null;
}

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
    <span
      className="text-[10px] tabular-nums"
      style={{ color: "#A8B5CC", fontFamily: "var(--font-mono)" }}
    >
      ⏳ {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

export function VideoCapsules({ day }: VideoCapsulesProps) {
  const [capsules, setCapsules]         = useState<Capsule[]>([]);
  const [loading, setLoading]           = useState(true);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [activeId, setActiveId]         = useState<string | null>(null);
  const [marking, setMarking]           = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const loadCapsules = useCallback(async () => {
    try {
      const res  = await fetch(`/api/capsules?day=${day}`);
      const data = await res.json() as { capsules: Capsule[]; lastCompletedAt: string | null };

      setCapsules(data.capsules ?? []);

      // Compute cooldown from last completion
      if (data.lastCompletedAt) {
        const elapsed = (Date.now() - new Date(data.lastCompletedAt).getTime()) / 1000;
        const left = Math.ceil(COOLDOWN_SECONDS - elapsed);
        setCooldownSecs(Math.max(0, left));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [day]);

  useEffect(() => { loadCapsules(); }, [loadCapsules]);

  // Pick a random unwatched capsule
  const handleWatch = useCallback(() => {
    const unwatched = capsules.filter((c) => !c.completed);
    if (unwatched.length === 0) return;
    const pick = unwatched[Math.floor(Math.random() * unwatched.length)];
    setActiveId(pick.id);
  }, [capsules]);

  // Mark capsule as watched
  const handleMark = useCallback(async () => {
    if (!activeId || marking) return;
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
        alreadyWatched?: boolean;
      };

      if (data.ok && data.points && data.total != null) {
        // XP effect
        window.dispatchEvent(
          new CustomEvent("xp-gained", {
            detail: { delta: data.points, total: data.total, source: "capsule" },
          })
        );

        // Particle burst from button
        if (btnRef.current) {
          const rect = btnRef.current.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top  + rect.height / 2;
          createParticleBurst(cx, cy, "cyan", 16);
          flyPoints(cx, cy, cx, cy - 80, `+${data.points} XP 📺`);
        }

        // Refresh list and close modal
        await loadCapsules();
        setActiveId(null);
        setCooldownSecs(COOLDOWN_SECONDS);
      } else if (data.cooldown && data.nextInSeconds) {
        setCooldownSecs(data.nextInSeconds);
        setActiveId(null);
      }
    } finally {
      setMarking(false);
    }
  }, [activeId, marking, loadCapsules]);

  const completed  = capsules.filter((c) => c.completed).length;
  const total      = capsules.length;
  const allDone    = total > 0 && completed === total;
  const canWatch   = cooldownSecs <= 0 && !allDone;
  const activeCap  = capsules.find((c) => c.id === activeId);
  const videoId    = activeCap ? getYoutubeId(activeCap.youtube_url) : null;

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
      {/* Modal overlay */}
      {activeId && activeCap && (
        <div
          className="fixed inset-0 z-[9990] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveId(null); }}
        >
          <div
            className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden"
            style={{ background: "#0A2540", border: "2px solid rgba(0,212,255,0.3)" }}
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-start justify-between" style={{ borderBottom: "1px solid #1E3A5C" }}>
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#00D4FF", fontFamily: "var(--font-mono)" }}>
                  📺 Video Misión
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

            {/* Video */}
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              {videoId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
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

            {/* Footer CTA */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: "1px solid #1E3A5C" }}>
              <p className="text-xs" style={{ color: "#5A6B85", fontFamily: "var(--font-mono)" }}>
                Mirá el video y marcá como visto para ganar XP
              </p>
              <button
                ref={btnRef}
                onClick={handleMark}
                disabled={marking}
                className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #00D67A, #00B865)",
                  color: "#000",
                  fontFamily: "var(--font-sans)",
                  boxShadow: "0 0 16px rgba(0,214,122,0.4)",
                }}
              >
                {marking ? "Guardando..." : `✓ Visto → +${activeCap.points_reward} XP`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget */}
      <div
        data-tour-id="capsules"
        className="rounded-xl border overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(10,37,64,0.7) 100%)",
          borderColor: "rgba(0,212,255,0.2)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Header */}
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
                {completed}/{total} completadas · {(total - completed) * 10} XP disponibles
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Progress pills */}
            <div className="flex gap-1">
              {capsules.map((c) => (
                <div
                  key={c.id}
                  className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px]"
                  style={{
                    background: c.completed ? "rgba(0,214,122,0.2)" : "rgba(0,212,255,0.1)",
                    border: `1px solid ${c.completed ? "#00D67A" : "rgba(0,212,255,0.3)"}`,
                    color: c.completed ? "#00D67A" : "#5A6B85",
                  }}
                >
                  {c.completed ? "✓" : "●"}
                </div>
              ))}
            </div>
            <span style={{ color: "#5A6B85", fontSize: "12px" }}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* Body */}
        {expanded && (
          <div className="px-5 py-4 space-y-4">
            {/* Main CTA */}
            <div className="flex items-center justify-between gap-4">
              <div>
                {allDone ? (
                  <p className="text-sm font-semibold" style={{ color: "#00D67A" }}>
                    🏆 ¡Todas las misiones completadas!
                  </p>
                ) : canWatch ? (
                  <p className="text-xs" style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}>
                    {capsules.filter((c) => !c.completed).length} misión{capsules.filter((c) => !c.completed).length !== 1 ? "es" : ""} disponible{capsules.filter((c) => !c.completed).length !== 1 ? "s" : ""}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-xs" style={{ color: "#5A6B85" }}>Próxima misión en</p>
                    <CooldownBadge seconds={cooldownSecs} />
                  </div>
                )}
              </div>

              {!allDone && (
                <button
                  onClick={handleWatch}
                  disabled={!canWatch}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  style={{
                    background: canWatch
                      ? "linear-gradient(135deg, #00D4FF, #0099CC)"
                      : "rgba(0,212,255,0.1)",
                    color: canWatch ? "#000" : "#3A5070",
                    fontFamily: "var(--font-sans)",
                    boxShadow: canWatch ? "0 0 16px rgba(0,212,255,0.35)" : "none",
                  }}
                >
                  ▶ Ver misión
                </button>
              )}
            </div>

            {/* Capsule list */}
            <div className="space-y-1.5">
              {capsules.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{
                    background: c.completed ? "rgba(0,214,122,0.06)" : "rgba(0,212,255,0.04)",
                    border: `1px solid ${c.completed ? "rgba(0,214,122,0.15)" : "rgba(0,212,255,0.08)"}`,
                  }}
                >
                  <span className="text-xs shrink-0" style={{ color: c.completed ? "#00D67A" : "#3A5070" }}>
                    {c.completed ? "✓" : "○"}
                  </span>
                  <span
                    className="flex-1 text-xs truncate"
                    style={{
                      color: c.completed ? "#00D67A" : "#A8B5CC",
                      textDecoration: c.completed ? "none" : "none",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {c.title}
                  </span>
                  <span
                    className="text-[10px] shrink-0"
                    style={{ color: c.completed ? "#00D67A" : "#3A5070", fontFamily: "var(--font-mono)" }}
                  >
                    +{c.points_reward} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
