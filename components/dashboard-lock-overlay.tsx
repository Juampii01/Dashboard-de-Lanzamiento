"use client";

import { useEffect, useRef, useState } from "react";

interface LockState {
  is_locked: boolean;
  call_url: string | null;
  message: string | null;
}

export function DashboardLockOverlay() {
  const [lock, setLock] = useState<LockState>({
    is_locked: false,
    call_url: null,
    message: null,
  });
  const [visible, setVisible] = useState(false); // animate in

  async function fetchLock() {
    try {
      const res = await fetch("/api/dashboard-lock", { cache: "no-store" });
      if (res.ok) {
        const data: LockState = await res.json();
        setLock(data);
        if (data.is_locked) setVisible(true);
      }
    } catch {
      // red caída — mantener estado
    }
  }

  useEffect(() => {
    fetchLock();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!lock.is_locked) return null;

  const message =
    lock.message ?? "La llamada en vivo está en curso. Volvé cuando termine.";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99990,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        // Background on root so nothing bleeds through
        background: "linear-gradient(160deg, #060D1A 0%, #0A1828 50%, #050C18 100%)",
        animation: visible ? "lock-fade-in 0.6s cubic-bezier(0.22,1,0.36,1) both" : undefined,
      }}
    >
      {/* ── Red vignette edge glow ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 130% 70% at 50% 110%, rgba(215,38,61,0.20) 0%, transparent 60%), " +
            "radial-gradient(ellipse 100% 50% at 50% -5%, rgba(215,38,61,0.13) 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Scanlines ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)",
          pointerEvents: "none",
        }}
      />

      {/* ── Content ── */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "520px",
          width: "100%",
          textAlign: "center",
          gap: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            marginBottom: "28px",
            opacity: 0.85,
            filter: "drop-shadow(0 0 18px rgba(255,255,255,0.18))",
          }}
        >
          <img
            src="/halcon.png"
            alt="Govbidder Challenge"
            style={{ height: "60px", width: "auto", display: "block" }}
          />
        </div>

        {/* LIVE badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            background: "rgba(215,38,61,0.15)",
            border: "1px solid rgba(215,38,61,0.45)",
            borderRadius: "20px",
            padding: "4px 14px",
            marginBottom: "20px",
          }}
        >
          <span
            className="live-dot"
            style={{
              display: "inline-block",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#D7263D",
              boxShadow: "0 0 6px rgba(215,38,61,0.8)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-arcade)",
              fontSize: "11px",
              color: "#D7263D",
              letterSpacing: "0.12em",
            }}
          >
            TRANSMISIÓN EN VIVO
          </span>
        </div>

        {/* Main title — arcade font */}
        <h1
          style={{
            fontFamily: "var(--font-arcade)",
            fontSize: "clamp(22px, 5vw, 34px)",
            color: "#FFFFFF",
            margin: "0 0 6px",
            lineHeight: 1.15,
            textShadow:
              "0 0 30px rgba(215,38,61,0.55), 0 0 60px rgba(215,38,61,0.25), 2px 2px 0 rgba(0,0,0,0.6)",
            letterSpacing: "0.04em",
          }}
        >
          LLAMADA EN VIVO
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(13px, 2.5vw, 15px)",
            color: "#7A8BA0",
            margin: "0 0 32px",
            lineHeight: 1.6,
            maxWidth: "380px",
          }}
        >
          {message}
        </p>

        {/* Divider */}
        <div
          style={{
            width: "100%",
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(215,38,61,0.35) 30%, rgba(215,38,61,0.35) 70%, transparent)",
            marginBottom: "32px",
          }}
        />

        {/* CTA button */}
        {lock.call_url ? (
          <a
            href={lock.call_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "15px 36px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #D7263D 0%, #A11D2E 100%)",
              color: "#FFFFFF",
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: "15px",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow:
                "0 6px 28px rgba(215,38,61,0.55), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
              animation: "lock-btn-glow 2.5s ease-in-out infinite",
              marginBottom: "20px",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "translateY(-3px) scale(1.03)";
              el.style.boxShadow =
                "0 10px 36px rgba(215,38,61,0.7), 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "";
              el.style.boxShadow =
                "0 6px 28px rgba(215,38,61,0.55), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)";
            }}
          >
            {/* Shimmer sweep */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)",
                animation: "lock-shimmer 3s linear infinite",
                pointerEvents: "none",
              }}
            />
            <span style={{ fontSize: "18px" }}>📞</span>
            <span>Ir a la llamada</span>
            <span style={{ fontSize: "13px", opacity: 0.75 }}>↗</span>
          </a>
        ) : (
          /* No URL: pulsing waiting state */
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 28px",
              borderRadius: "14px",
              border: "1px solid rgba(215,38,61,0.3)",
              background: "rgba(215,38,61,0.08)",
              marginBottom: "20px",
            }}
          >
            <span
              className="live-dot"
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#D7263D",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                color: "#7A8BA0",
              }}
            >
              La llamada está en curso
            </span>
          </div>
        )}

        {/* Status note */}
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "11px",
            color: "#3A5070",
            margin: 0,
            fontStyle: "italic",
          }}
        >
          Puede tardar unos segundos en actualizarse · Recargá la página cuando termine
        </p>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes lock-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lock-btn-glow {
          0%, 100% { box-shadow: 0 6px 28px rgba(215,38,61,0.55), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12); }
          50%       { box-shadow: 0 6px 38px rgba(215,38,61,0.80), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12); }
        }
        @keyframes lock-shimmer {
          0%   { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(300%)  skewX(-15deg); }
        }
      `}</style>
    </div>
  );
}
