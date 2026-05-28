"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { progressPercent } from "@/lib/utils";
import { triggerAvatarStars } from "@/lib/wow-effects";
import { Camera } from "lucide-react";
import { AvatarCropModal } from "@/components/avatar-upload";

const AVATAR_LS_KEY      = "govbidder_avatar_xp_at";
const AVATAR_COOLDOWN_MS = 60 * 60_000; // 60 minutos

function SantoAvatar({
  onClick,
  isAdmin,
  avatarUrl,
  onCameraClick,
}: {
  onClick?: (cx: number, cy: number) => void;
  isAdmin?: boolean;
  avatarUrl?: string | null;
  onCameraClick?: () => void;
}) {
  const [visible, setVisible]   = useState(false);
  const [error, setError]       = useState(false);
  const [jumping, setJumping]   = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [minsLeft, setMinsLeft] = useState(0);
  const [hovered, setHovered]   = useState(false);
  const imgRef  = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Reset visible/error when avatarUrl changes (new upload)
  const imgSrc = avatarUrl || "/aguila.png";
  const prevSrcRef = useRef(imgSrc);
  useEffect(() => {
    if (prevSrcRef.current !== imgSrc) {
      prevSrcRef.current = imgSrc;
      setVisible(false);
      setError(false);
    }
  }, [imgSrc]);

  // Restaurar cooldown desde localStorage al montar; refrescar cada 30 s
  // Los admins nunca tienen cooldown
  useEffect(() => {
    if (isAdmin) { setCooldown(false); return; }
    function check() {
      const stored = localStorage.getItem(AVATAR_LS_KEY);
      if (!stored) { setCooldown(false); return; }
      const elapsed = Date.now() - parseInt(stored, 10);
      if (elapsed < AVATAR_COOLDOWN_MS) {
        setCooldown(true);
        setMinsLeft(Math.ceil((AVATAR_COOLDOWN_MS - elapsed) / 60_000));
      } else {
        setCooldown(false);
        localStorage.removeItem(AVATAR_LS_KEY);
      }
    }
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [isAdmin]);

  // M5: Mark image as visible immediately if browser already cached it
  // (img.complete is true synchronously for cached images, so onLoad won't fire again).
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) setVisible(true);
    // Also listen for the load event in case the effect runs before the browser sets complete.
    const handleLoad = () => setVisible(true);
    img.addEventListener("load", handleLoad);
    return () => img.removeEventListener("load", handleLoad);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSrc]); // re-run when src changes so cached custom avatars become visible immediately

  const handleClick = useCallback(async () => {
    if (jumping || cooldown) return;
    setJumping(true);
    setTimeout(() => setJumping(false), 650);

    // Efecto de estrellas inmediato
    if (onClick && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      onClick(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    try {
      const res = await fetch("/api/xp/avatar", { method: "POST" });
      const data: {
        awarded: boolean;
        points?: number;
        total?: number;
        nextInMinutes?: number;
      } = await res.json();

      if (data.awarded && data.points && data.total != null) {
        // XP otorgado — bloquear avatar solo si no es admin
        if (!isAdmin) {
          localStorage.setItem(AVATAR_LS_KEY, String(Date.now()));
          setCooldown(true);
          setMinsLeft(60);
        }
        window.dispatchEvent(
          new CustomEvent("xp-gained", {
            detail: { delta: data.points, total: data.total, source: "avatar" },
          })
        );
      } else if (data.nextInMinutes && !isAdmin) {
        // Servidor dice que está en cooldown — sincronizar localStorage
        const msUsed = AVATAR_COOLDOWN_MS - data.nextInMinutes * 60_000;
        localStorage.setItem(AVATAR_LS_KEY, String(Date.now() - msUsed));
        setCooldown(true);
        setMinsLeft(data.nextInMinutes);
      }
      // Si no hay awarded ni nextInMinutes: error silencioso, NO bloquear
    } catch {
      // Error de red — no bloquear avatar, el usuario puede reintentar
    }
  }, [jumping, cooldown, onClick]);

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar clickeable — XP */}
      <div
        onClick={handleClick}
        title={cooldown ? `Cooldown — ${minsLeft} min` : "¡Clic para XP! 🕺"}
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          overflow: "hidden",
          border: `2px solid ${cooldown ? "#2A3F56" : "#00D67A"}`,
          background: "#0A2540",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: cooldown ? "not-allowed" : "pointer",
          boxShadow: cooldown
            ? "none"
            : "0 0 10px rgba(0,214,122,0.6), 0 0 20px rgba(0,214,122,0.3)",
          filter: cooldown ? "grayscale(70%) brightness(0.5)" : "none",
          animation: cooldown
            ? "none"
            : jumping
            ? "bar-avatar-jump 0.6s cubic-bezier(0.34,1.56,0.64,1)"
            : "bar-bounce 1.4s ease-in-out infinite",
          transition: "border-color 0.4s, box-shadow 0.4s, filter 0.4s",
        }}
      >
        {/* M5: Use opacity + absolute positioning for smooth image/emoji crossfade.
             This prevents the flash caused by toggling display on cached images. */}
        {!error && (
          <img
            ref={imgRef}
            src={imgSrc}
            alt=""
            onLoad={() => setVisible(true)}
            onError={() => { setError(true); setVisible(false); }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.25s ease",
            }}
          />
        )}
        {/* Emoji fallback — visible behind image until it loads, or permanently on error */}
        <span
          style={{
            fontSize: "14px",
            lineHeight: 1,
            opacity: visible && !error ? 0 : 1,
            transition: "opacity 0.25s ease",
          }}
        >🕺</span>
      </div>

      {/* Camera badge — appears on hover, opens upload modal */}
      {onCameraClick && (
        <button
          onClick={e => { e.stopPropagation(); onCameraClick(); }}
          title="Cambiar avatar"
          style={{
            position: "absolute",
            top: "-5px",
            right: "-7px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "#0A2540",
            border: "1px solid #3A6A9C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            opacity: hovered && !cooldown ? 1 : 0,
            transform: hovered && !cooldown ? "scale(1)" : "scale(0.7)",
            transition: "opacity 0.18s, transform 0.18s",
            pointerEvents: hovered && !cooldown ? "auto" : "none",
            zIndex: 30,
          }}
        >
          <Camera style={{ width: "8px", height: "8px", color: "#A8D4FF" }} />
        </button>
      )}

      {/* Candado de cooldown */}
      {cooldown && (
        <div
          style={{
            position: "absolute",
            bottom: "-1px",
            right: "-3px",
            width: "13px",
            height: "13px",
            borderRadius: "50%",
            background: "#061528",
            border: "1px solid #2A3F56",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "7px",
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          🔒
        </div>
      )}
    </div>
  );
}

interface ProgressBarProps {
  completedDays: number;
  isAdmin?: boolean;
  avatarUrl?: string | null;
}

export function ProgressBar({ completedDays, isAdmin, avatarUrl: initialAvatarUrl }: ProgressBarProps) {
  const targetPct = progressPercent(completedDays);
  const isEmpty = targetPct === 0;
  const isFull = targetPct === 100;

  // Cinematic entrance: bar starts at 0 and fills slowly on mount
  const [displayPct, setDisplayPct] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Avatar upload state
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setMounted(true), 120);
    const t2 = setTimeout(() => setDisplayPct(targetPct), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [targetPct]);

  const handleAvatarClick = useCallback((cx: number, cy: number) => {
    triggerAvatarStars(cx, cy);
  }, []);

  const handleCameraClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCropFile(file);
    // Reset input so same file can be picked again
    e.target.value = "";
  }, []);

  const handleAvatarUploaded = useCallback((url: string) => {
    setCurrentAvatarUrl(url);
    setCropFile(null);
    // Notify HeaderAvatar (and any other listener) so they refresh without a page reload
    window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { url } }));
  }, []);

  return (
    <div className="w-full">
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Avatar crop modal */}
      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onClose={() => setCropFile(null)}
          onUploaded={handleAvatarUploaded}
        />
      )}
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            style={{
              fontFamily: "var(--font-arcade)",
              fontSize: "8px",
              color: "#FFD60A",
              letterSpacing: "0.08em",
              textShadow: "0 0 8px rgba(255,214,10,0.9), 0 0 16px rgba(255,214,10,0.4)",
            }}
          >
            P1
          </span>
          <span
            className="uppercase tracking-widest text-[10px]"
            style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}
          >
            Tu progreso
          </span>
        </div>

        <span
          style={{
            fontFamily: "var(--font-arcade)",
            fontSize: "9px",
            color: isFull ? "#FFD60A" : isEmpty ? "#D7263D" : "#00D67A",
            textShadow: isFull
              ? "0 0 12px rgba(255,214,10,1), 0 0 24px rgba(255,214,10,0.5)"
              : !isEmpty
              ? "0 0 10px rgba(0,214,122,0.8), 0 0 20px rgba(0,214,122,0.4)"
              : "0 0 10px rgba(215,38,61,0.8)",
            transition: "color 600ms",
          }}
        >
          {isFull ? "FLAWLESS" : `${targetPct}%`}
        </span>
      </div>

      {/* The bar */}
      <div className="relative" style={{ height: "34px" }}>

        {/* HUD corner brackets — outside the bar */}
        <div className="absolute -top-[2px] -left-[2px] w-3 h-3 pointer-events-none z-30"
          style={{ borderTop: "2px solid #FFD60A", borderLeft: "2px solid #FFD60A", opacity: 0.8 }} />
        <div className="absolute -top-[2px] -right-[2px] w-3 h-3 pointer-events-none z-30"
          style={{ borderTop: "2px solid #FFD60A", borderRight: "2px solid #FFD60A", opacity: 0.8 }} />
        <div className="absolute -bottom-[2px] -left-[2px] w-3 h-3 pointer-events-none z-30"
          style={{ borderBottom: "2px solid #FFD60A", borderLeft: "2px solid #FFD60A", opacity: 0.8 }} />
        <div className="absolute -bottom-[2px] -right-[2px] w-3 h-3 pointer-events-none z-30"
          style={{ borderBottom: "2px solid #FFD60A", borderRight: "2px solid #FFD60A", opacity: 0.8 }} />

        {/* Outer chrome frame */}
        <div
          className={`absolute inset-0 bar-frame-pulse ${isEmpty ? "" : ""}`}
          style={{
            border: "2px solid #FFD60A",
            borderRadius: "2px",
            boxShadow: `
              0 0 0 1px #0A2540,
              0 0 20px rgba(255,214,10,0.22),
              inset 0 0 0 1px rgba(0,0,0,0.9)
            `,
            overflow: "hidden",
          }}
        >
          {/* Deep black BG */}
          <div className="absolute inset-0" style={{ background: "#030303" }} />

          {/* Ambient inner shadow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: "inset 0 2px 12px rgba(0,0,0,0.8), inset 0 -1px 4px rgba(0,0,0,0.6)" }} />

          {/* Green fill — cinematic transition */}
          {displayPct > 0 && (
            <div
              className="absolute top-0 left-0 bottom-0 overflow-hidden"
              style={{
                width: `${displayPct}%`,
                background: "linear-gradient(180deg, #12FF9A 0%, #00D67A 40%, #00B865 75%, #007A40 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                transition: mounted
                  ? `width 2800ms cubic-bezier(0.22, 0.61, 0.36, 1)`
                  : "none",
              }}
            >
              {/* Top specular highlight */}
              <div className="absolute top-0 left-0 right-0 h-[6px]"
                style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 100%)" }} />

              {/* Scanlines on fill */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.10) 3px, rgba(0,0,0,0.10) 4px)",
                }} />

              {/* Moving light sweep */}
              <div
                className="bar-light-sweep absolute top-0 bottom-0 pointer-events-none"
                style={{
                  width: "30%",
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.38) 50%, transparent 100%)",
                }}
              />

              {/* Crackle at the right edge of fill */}
              <div
                className="bar-edge-crackle absolute top-0 bottom-0 right-0"
                style={{
                  width: "3px",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(120,255,180,0.9) 50%, rgba(255,255,255,0.95) 100%)",
                }}
              />
            </div>
          )}

          {/* Segment dividers at 25 / 50 / 75 % */}
          {[25, 50, 75].map((pos) => (
            <div
              key={pos}
              className="absolute top-0 bottom-0 pointer-events-none z-10"
              style={{
                left: `${pos}%`,
                width: "1px",
                background: "linear-gradient(180deg, rgba(255,214,10,0.6) 0%, rgba(255,214,10,0.18) 100%)",
              }}
            />
          ))}

          {/* Low-health danger flicker */}
          {isEmpty && (
            <div
              className="absolute inset-0 low-health-flicker"
              style={{ background: "rgba(215,38,61,0.10)" }}
            />
          )}

          {/* Full — gold shimmer */}
          {isFull && (
            <div className="absolute inset-0 progress-shimmer opacity-25" />
          )}
        </div>

        {/* Santo avatar tracks the fill edge */}
        <div
          className="absolute top-1/2 -translate-y-1/2 select-none z-20"
          style={{
            left: `clamp(4px, calc(${displayPct}% - 15px), calc(100% - 30px))`,
            filter: "drop-shadow(0 0 8px rgba(0,214,122,0.9)) drop-shadow(0 0 16px rgba(0,214,122,0.5)) drop-shadow(0 3px 5px rgba(0,0,0,0.95))",
            transition: mounted
              ? `left 2800ms cubic-bezier(0.22, 0.61, 0.36, 1)`
              : "none",
          }}
          aria-hidden
        >
          <SantoAvatar
            onClick={handleAvatarClick}
            isAdmin={isAdmin}
            avatarUrl={currentAvatarUrl}
            onCameraClick={handleCameraClick}
          />
        </div>
      </div>

      {/* Day segment labels — below bar, slim */}
      <div className="flex mt-1.5 gap-px">
        {[1, 2, 3, 4].map((d) => {
          const done = completedDays >= d;
          const active = completedDays === d - 1;
          return (
            <div key={d} className="flex-1 flex items-center justify-center py-0.5">
              <span
                style={{
                  fontFamily: "var(--font-arcade)",
                  fontSize: "6px",
                  letterSpacing: "0.05em",
                  color: done ? "#00D67A" : active ? "#FFD60A" : "#1E3A5C",
                  textShadow: done
                    ? "0 0 6px rgba(0,214,122,0.7)"
                    : active
                    ? "0 0 6px rgba(255,214,10,0.8)"
                    : "none",
                  transition: "all 800ms",
                }}
              >
                {done ? `✓ DÍA ${d}` : `DÍA ${d}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
