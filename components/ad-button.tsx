"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flyPoints } from "@/lib/wow-effects";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AdVideo {
  id: string;
  video_url: string;
  title: string | null;
  duration_seconds: number | null;
}

type ButtonState = "idle" | "cooldown" | "loading" | "open";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}

function isYouTube(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function getYouTubeEmbedUrl(url: string): string {
  // https://youtu.be/ID  or  https://www.youtube.com/watch?v=ID
  const match =
    url.match(/youtu\.be\/([^?&]+)/) ||
    url.match(/[?&]v=([^?&]+)/);
  const id = match?.[1] ?? "";
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0
    ? `${m}m ${String(sec).padStart(2, "0")}s`
    : `${sec}s`;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
function AdModal({
  ad,
  onClose,
  onClaimed,
}: {
  ad: AdVideo;
  onClose: () => void;
  onClaimed: (xp: number, newTotal: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const claimBtnRef = useRef<HTMLButtonElement>(null);

  // Must-watch timer: seconds remaining until user can claim
  const mustWatchSec = ad.duration_seconds ?? 20;
  const [watchLeft, setWatchLeft] = useState(mustWatchSec);
  const [watched, setWatched] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Block navigation while modal is open
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Start must-watch countdown automatically
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setWatchLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setWatched(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current!); };
  }, []);

  // Also mark watched if <video> element fires onEnded before timer
  function handleVideoEnded() {
    if (timerRef.current) clearInterval(timerRef.current);
    setWatchLeft(0);
    setWatched(true);
  }

  const handleClaim = useCallback(async () => {
    if (!watched || claiming || claimed) return;
    setClaiming(true);
    try {
      const res = await fetch("/api/ads/claim", { method: "POST" });
      const data: { awarded: boolean; xp?: number; new_total?: number; reason?: string } =
        await res.json();

      if (data.awarded) {
        setClaimed(true);

        // XP effect
        window.dispatchEvent(
          new CustomEvent("xp-gained", {
            detail: { delta: data.xp ?? 20, total: data.new_total ?? 0, source: "ad" },
          })
        );

        // Fly points from claim button
        if (claimBtnRef.current) {
          const rect = claimBtnRef.current.getBoundingClientRect();
          flyPoints(
            rect.left + rect.width / 2,
            rect.top,
            rect.left + rect.width / 2,
            rect.top - 90,
            `+${data.xp ?? 20} XP 📺`
          );
        }

        onClaimed(data.xp ?? 20, data.new_total ?? 0);
        setTimeout(onClose, 1400);
      }
    } catch {
      // silent
    } finally {
      setClaiming(false);
    }
  }, [watched, claiming, claimed, onClaimed, onClose]);

  const useIframe = !isDirectVideo(ad.video_url);
  const iframeSrc = isYouTube(ad.video_url)
    ? getYouTubeEmbedUrl(ad.video_url)
    : ad.video_url;

  return (
    /* Backdrop */
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99995,
        background: "rgba(5,14,30,0.92)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "linear-gradient(160deg, #0A1828 0%, #0F2035 100%)",
          border: "1px solid #1E3A5C",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "ad-modal-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid #1E3A5C",
            background: "rgba(10,37,64,0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: "var(--font-arcade)",
                fontSize: "10px",
                color: "#00D67A",
                letterSpacing: "0.1em",
              }}
            >
              📺 ANUNCIO
            </span>
            {ad.title && (
              <span style={{ fontSize: "12px", color: "#5A6B85" }}>
                · {ad.title}
              </span>
            )}
          </div>
          {/* Must-watch countdown badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "12px",
              background: watched
                ? "rgba(0,214,122,0.15)"
                : "rgba(255,214,10,0.1)",
              border: `1px solid ${watched ? "rgba(0,214,122,0.3)" : "rgba(255,214,10,0.2)"}`,
              transition: "background 0.5s, border-color 0.5s",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: watched ? "#00D67A" : "#FFD60A",
                display: "inline-block",
                animation: watched ? "none" : "ad-dot-blink 1s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: watched ? "#00D67A" : "#FFD60A",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {watched ? "Listo para cobrar" : `Quedan ${formatTime(watchLeft)}`}
            </span>
          </div>
        </div>

        {/* Video player */}
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "56.25%", // 16:9
            background: "#000",
          }}
        >
          {useIframe ? (
            <iframe
              src={iframeSrc}
              allow="autoplay; fullscreen"
              allowFullScreen
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          ) : (
            <video
              ref={videoRef}
              src={ad.video_url}
              autoPlay
              controls
              onEnded={handleVideoEnded}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          )}

          {/* Overlay progress bar at bottom of video */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "#0A1828",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.max(0, ((mustWatchSec - watchLeft) / mustWatchSec) * 100)}%`,
                background: watched
                  ? "#00D67A"
                  : "linear-gradient(90deg, #00D67A, #FFD60A)",
                transition: "width 1s linear, background 0.5s",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            gap: "12px",
          }}
        >
          {/* Close (available any time, no XP) */}
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: "10px",
              border: "1px solid #1E3A5C",
              background: "transparent",
              color: "#5A6B85",
              fontSize: "13px",
              cursor: "pointer",
              transition: "color 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#A8B5CC";
              (e.currentTarget as HTMLElement).style.borderColor = "#2E4A6B";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#5A6B85";
              (e.currentTarget as HTMLElement).style.borderColor = "#1E3A5C";
            }}
          >
            {watched ? "Cerrar sin cobrar" : "Cerrar (sin XP)"}
          </button>

          {/* Claim button */}
          <button
            ref={claimBtnRef}
            onClick={handleClaim}
            disabled={!watched || claiming || claimed}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "12px",
              background: claimed
                ? "#00D67A"
                : watched
                ? "linear-gradient(135deg, #00D67A 0%, #00A86B 100%)"
                : "#1E3A5C",
              color: watched || claimed ? "#fff" : "#3A5070",
              fontWeight: 700,
              fontSize: "14px",
              border: "none",
              cursor: watched && !claiming && !claimed ? "pointer" : "not-allowed",
              transition: "background 0.5s, color 0.5s, box-shadow 0.5s",
              boxShadow: watched && !claimed
                ? "0 4px 20px rgba(0,214,122,0.45)"
                : "none",
              animation: watched && !claimed && !claiming
                ? "ad-claim-pulse 1.5s ease-in-out infinite"
                : "none",
              flex: 1,
              justifyContent: "center",
            }}
          >
            {claimed ? (
              "✓ ¡XP cobrado!"
            ) : claiming ? (
              "Procesando..."
            ) : watched ? (
              <>📺 Cobrar +20 XP</>
            ) : (
              <>⏳ Ver el video para cobrar</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ad-modal-in {
          from { opacity:0; transform: scale(0.92) translateY(20px); }
          to   { opacity:1; transform: scale(1)    translateY(0);    }
        }
        @keyframes ad-dot-blink {
          0%,100% { opacity:1; } 50% { opacity:0.2; }
        }
        @keyframes ad-claim-pulse {
          0%,100% { box-shadow: 0 4px 20px rgba(0,214,122,0.45); }
          50%      { box-shadow: 0 4px 32px rgba(0,214,122,0.75); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ad Button (mounts in the header)
// ---------------------------------------------------------------------------
interface AdButtonProps {
  initialLastAdAt: string | null; // ISO string from server
}

export function AdButton({ initialLastAdAt }: AdButtonProps) {
  const [state, setState] = useState<ButtonState>("loading");
  const [cooldownLeft, setCooldownLeft] = useState(0); // seconds
  const [ad, setAd] = useState<AdVideo | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Initialize cooldown from server-rendered value
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const COOLDOWN_MS = 10 * 60 * 1000;

    if (initialLastAdAt) {
      const elapsed = Date.now() - new Date(initialLastAdAt).getTime();
      const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      if (remaining > 0) {
        setCooldownLeft(remaining);
        setState("cooldown");
        startCooldownTick(remaining);
        return;
      }
    }
    setState("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCooldownTick(initial: number) {
    let left = initial;
    cooldownRef.current = setInterval(() => {
      left -= 1;
      setCooldownLeft(left);
      if (left <= 0) {
        clearInterval(cooldownRef.current!);
        setState("idle");
      }
    }, 1000);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch ad & open modal
  // ---------------------------------------------------------------------------
  async function handleClick() {
    if (state !== "idle") return;
    setState("loading");

    try {
      const res = await fetch("/api/ads/random");
      const data: {
        ad?: AdVideo;
        cooldown?: boolean;
        next_in_seconds?: number;
        error?: string;
      } = await res.json();

      if (data.cooldown && data.next_in_seconds) {
        setCooldownLeft(data.next_in_seconds);
        setState("cooldown");
        startCooldownTick(data.next_in_seconds);
        return;
      }

      if (!data.ad) {
        setState("idle");
        return;
      }

      setAd(data.ad);
      setState("open");
    } catch {
      setState("idle");
    }
  }

  // ---------------------------------------------------------------------------
  // After successful claim
  // ---------------------------------------------------------------------------
  function handleClaimed() {
    setAd(null);
    setState("cooldown");
    setCooldownLeft(10 * 60); // 10 min
    startCooldownTick(10 * 60);
  }

  function handleClose() {
    setAd(null);
    setState("idle");
  }

  // ---------------------------------------------------------------------------
  // Render button
  // ---------------------------------------------------------------------------
  const isCooldown = state === "cooldown";
  const isLoading = state === "loading";
  const isOpen = state === "open";

  const cooldownMin = Math.ceil(cooldownLeft / 60);
  const cooldownSec = cooldownLeft % 60;
  const cooldownDisplay =
    cooldownLeft >= 60
      ? `${cooldownMin}m`
      : `${cooldownLeft}s`;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isCooldown || isLoading || isOpen}
        title={
          isCooldown
            ? `Próximo anuncio en ${cooldownDisplay}`
            : "Ver anuncio y ganar +20 XP"
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 10px",
          borderRadius: "10px",
          border: isCooldown
            ? "1px solid #1E3A5C"
            : "1px solid rgba(0,214,122,0.4)",
          background: isCooldown
            ? "rgba(10,37,64,0.5)"
            : "rgba(0,214,122,0.08)",
          color: isCooldown ? "#3A5070" : "#00D67A",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          fontWeight: 600,
          cursor: isCooldown || isLoading ? "not-allowed" : "pointer",
          transition: "all 0.25s",
          whiteSpace: "nowrap",
          letterSpacing: "0.02em",
        }}
        onMouseEnter={(e) => {
          if (isCooldown || isLoading) return;
          (e.currentTarget as HTMLElement).style.background = "rgba(0,214,122,0.15)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(0,214,122,0.25)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = isCooldown
            ? "rgba(10,37,64,0.5)"
            : "rgba(0,214,122,0.08)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        {isLoading ? (
          <span style={{ opacity: 0.6 }}>...</span>
        ) : isCooldown ? (
          <>
            <span style={{ fontSize: "9px" }}>📺</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{cooldownDisplay}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: "9px" }}>📺</span>
            <span>+20 XP</span>
          </>
        )}
      </button>

      {/* Modal */}
      {isOpen && ad && (
        <AdModal
          ad={ad}
          onClose={handleClose}
          onClaimed={handleClaimed}
        />
      )}
    </>
  );
}
