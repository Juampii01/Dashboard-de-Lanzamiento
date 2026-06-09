"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { progressPercent } from "@/lib/utils";
import { Camera } from "lucide-react";
import { AvatarCropModal } from "@/components/avatar-upload";

const AVATAR_LS_KEY      = "govbidder_avatar_xp_at";
const AVATAR_COOLDOWN_MS = 60 * 60_000; // 60 minutos

/**
 * User avatar — clickable for XP (+3, 60 min cooldown), uploadable via the
 * camera badge. Visual is clean/premium; the gamey bounce/glow is gone but all
 * the XP + upload + cooldown logic is preserved.
 */
function UserAvatar({
  isAdmin,
  avatarUrl,
  onCameraClick,
  size = 34,
}: {
  isAdmin?: boolean;
  avatarUrl?: string | null;
  onCameraClick?: () => void;
  size?: number;
}) {
  const [visible, setVisible]   = useState(false);
  const [error, setError]       = useState(false);
  const [popping, setPopping]   = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [minsLeft, setMinsLeft] = useState(0);
  const [hovered, setHovered]   = useState(false);
  const imgRef  = useRef<HTMLImageElement>(null);

  const imgSrc = avatarUrl || "/aguila.png";
  const prevSrcRef = useRef(imgSrc);
  useEffect(() => {
    if (prevSrcRef.current !== imgSrc) {
      prevSrcRef.current = imgSrc;
      setVisible(false);
      setError(false);
    }
  }, [imgSrc]);

  // Restore cooldown from localStorage; refresh every 30 s. Admins never cooldown.
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

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) setVisible(true);
    const handleLoad = () => setVisible(true);
    img.addEventListener("load", handleLoad);
    return () => img.removeEventListener("load", handleLoad);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSrc]);

  const handleClick = useCallback(async () => {
    if (popping || cooldown) return;
    setPopping(true);
    setTimeout(() => setPopping(false), 220);

    try {
      const res = await fetch("/api/xp/avatar", { method: "POST" });
      const data: { awarded: boolean; points?: number; total?: number; nextInMinutes?: number } =
        await res.json();

      if (data.awarded && data.points && data.total != null) {
        if (!isAdmin) {
          localStorage.setItem(AVATAR_LS_KEY, String(Date.now()));
          setCooldown(true);
          setMinsLeft(60);
        }
        window.dispatchEvent(new CustomEvent("xp-gained", {
          detail: { delta: data.points, total: data.total, source: "avatar" },
        }));
      } else if (data.nextInMinutes && !isAdmin) {
        const msUsed = AVATAR_COOLDOWN_MS - data.nextInMinutes * 60_000;
        localStorage.setItem(AVATAR_LS_KEY, String(Date.now() - msUsed));
        setCooldown(true);
        setMinsLeft(data.nextInMinutes);
      }
    } catch { /* network error — allow retry */ }
  }, [popping, cooldown, isAdmin]);

  return (
    <div
      style={{ position: "relative", flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        onClick={handleClick}
        title={cooldown ? `Sumá XP de nuevo en ${minsLeft} min` : "Clic para sumar XP"}
        style={{
          width: size, height: size,
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid var(--card)",
          boxShadow: "0 0 0 1.5px var(--border)",
          background: "var(--secondary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: cooldown ? "default" : "pointer",
          filter: cooldown ? "grayscale(35%)" : "none",
          transform: popping ? "scale(0.9)" : hovered && !cooldown ? "scale(1.06)" : "scale(1)",
          transition: "transform 0.18s ease, filter 0.3s",
          position: "relative",
        }}
      >
        {!error && (
          <img
            ref={imgRef}
            src={imgSrc}
            alt=""
            onLoad={() => setVisible(true)}
            onError={() => { setError(true); setVisible(false); }}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center top",
              opacity: visible ? 1 : 0, transition: "opacity 0.25s ease",
            }}
          />
        )}
        <span style={{ fontSize: size * 0.46, lineHeight: 1, opacity: visible && !error ? 0 : 1, transition: "opacity 0.25s", color: "#fff" }}>
          🦅
        </span>
      </div>

      {/* Camera badge — on hover, opens upload */}
      {onCameraClick && (
        <button
          onClick={(e) => { e.stopPropagation(); onCameraClick(); }}
          title="Cambiar foto"
          style={{
            position: "absolute", bottom: -3, right: -3,
            width: 17, height: 17, borderRadius: "50%",
            background: "var(--secondary)", border: "2px solid var(--card)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            opacity: hovered ? 1 : 0,
            transform: hovered ? "scale(1)" : "scale(0.7)",
            transition: "opacity 0.18s, transform 0.18s",
            pointerEvents: hovered ? "auto" : "none",
            zIndex: 30,
          }}
        >
          <Camera style={{ width: 9, height: 9, color: "#fff" }} />
        </button>
      )}

      {/* Cooldown lock */}
      {cooldown && (
        <div style={{
          position: "absolute", bottom: -2, right: -2,
          width: 14, height: 14, borderRadius: "50%",
          background: "var(--muted)", border: "1.5px solid var(--card)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 8, lineHeight: 1, pointerEvents: "none",
        }}>
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
  const pct = progressPercent(completedDays);
  const isFull = pct === 100;
  const done = Math.max(0, Math.min(4, completedDays));

  // Avatar upload state
  const LS_AVATAR_KEY = "govbidder_avatar_url_v1";
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialAvatarUrl) {
      const stored = localStorage.getItem(LS_AVATAR_KEY);
      if (stored) setCurrentAvatarUrl(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ url: string | null }>).detail?.url;
      if (url) {
        setCurrentAvatarUrl(url);
        localStorage.setItem(LS_AVATAR_KEY, url);
      } else {
        setCurrentAvatarUrl(null);
        localStorage.removeItem(LS_AVATAR_KEY);
      }
    };
    window.addEventListener("avatar-updated", handler);
    return () => window.removeEventListener("avatar-updated", handler);
  }, [LS_AVATAR_KEY]);

  const handleCameraClick = useCallback(() => { fileInputRef.current?.click(); }, []);
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCropFile(file);
    e.target.value = "";
  }, []);
  const handleAvatarUploaded = useCallback((url: string) => {
    setCurrentAvatarUrl(url);
    setCropFile(null);
    localStorage.setItem("govbidder_avatar_url_v1", url);
    window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { url } }));
  }, []);

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      {cropFile && (
        <AvatarCropModal file={cropFile} onClose={() => setCropFile(null)} onUploaded={handleAvatarUploaded} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <UserAvatar
          isAdmin={isAdmin}
          avatarUrl={currentAvatarUrl}
          onCameraClick={handleCameraClick}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--muted-foreground)", fontFamily: "var(--font-mono)",
            }}>
              Tu progreso
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: isFull ? "var(--success)" : "var(--foreground)" }}>
              {isFull ? "¡Completado! 🎉" : `${done} de 4 días`}
            </span>
          </div>

          {/* Segmented progress — one segment per day */}
          <div style={{ display: "flex", gap: 5 }}>
            {[1, 2, 3, 4].map((d) => {
              const isDone = done >= d;
              const isCurrent = done === d - 1;
              return (
                <div key={d} style={{ flex: 1 }}>
                  <div style={{
                    height: 7, borderRadius: 20,
                    background: isDone ? "var(--success)" : "var(--muted)",
                    border: isCurrent ? "1px solid color-mix(in srgb, var(--primary) 45%, transparent)" : "1px solid transparent",
                    boxShadow: isCurrent ? "0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent)" : "none",
                    transition: "background 0.5s ease",
                  }} />
                  <div style={{
                    marginTop: 5, fontSize: 9.5, fontWeight: 600, textAlign: "center",
                    color: isDone ? "var(--success)" : isCurrent ? "var(--primary)" : "var(--muted-foreground)",
                    fontFamily: "var(--font-mono)",
                  }}>
                    {isDone ? "✓ " : ""}Día {d}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
