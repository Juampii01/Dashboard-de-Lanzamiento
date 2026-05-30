"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Check, Loader2, Mail, X } from "lucide-react";
import { AvatarCropModal } from "@/components/avatar-upload";

/**
 * ProfileButton
 * Renders as the avatar + name chip in the header.
 * Clicking opens a "Mi Perfil" modal where the user can:
 *   • Change their avatar (same crop-upload flow as the progress bar)
 *   • Edit their display name
 *   • See their email (read-only — never editable)
 *
 * Listens for the "avatar-updated" CustomEvent so both upload sources
 * (progress bar camera and this modal) stay in sync.
 */
export function ProfileButton({
  fullName,
  email,
  avatarUrl,
}: {
  fullName: string;
  email: string;
  avatarUrl: string | null;
}) {
  // ── Display state (shown in the header chip) ─────────────────────────────
  const LS_AVATAR_KEY = "govbidder_avatar_url_v1";
  const [displayName,   setDisplayName]   = useState(fullName);
  const [headerAvatar,  setHeaderAvatar]  = useState(avatarUrl);
  const [avatarError,   setAvatarError]   = useState(false);
  const [avatarVisible, setAvatarVisible] = useState(false);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [open,       setOpen]       = useState(false);
  const [editName,   setEditName]   = useState(fullName);
  const [modalAvatar, setModalAvatar] = useState(avatarUrl);

  // After client mount: if server gave no avatar, try localStorage fallback
  useEffect(() => {
    if (!avatarUrl) {
      const stored = localStorage.getItem(LS_AVATAR_KEY);
      if (stored) {
        setHeaderAvatar(stored);
        setModalAvatar(stored);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Name-save state ───────────────────────────────────────────────────────
  const [nameSaving,  setNameSaving]  = useState(false);
  const [nameStatus,  setNameStatus]  = useState<"idle" | "saved" | "error">("idle");

  // ── Avatar-crop state ─────────────────────────────────────────────────────
  const [cropFile,   setCropFile]   = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with avatar uploads from other components (e.g. progress-bar camera)
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      if (url) {
        setHeaderAvatar(url);
        setModalAvatar(url);
        setAvatarError(false);
        setAvatarVisible(false);
      }
    };
    window.addEventListener("avatar-updated", handler);
    return () => window.removeEventListener("avatar-updated", handler);
  }, []);

  // When modal opens, reset edit-name to the current display name
  const openModal = useCallback(() => {
    setEditName(displayName);
    setNameStatus("idle");
    setOpen(true);
  }, [displayName]);

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarUploaded = useCallback((url: string) => {
    setHeaderAvatar(url);
    setModalAvatar(url);
    setAvatarError(false);
    setAvatarVisible(false);
    // Persist in localStorage so avatar survives page reloads
    localStorage.setItem("govbidder_avatar_url_v1", url);
    // Notify progress-bar avatar + HeaderAvatar (if still mounted elsewhere)
    window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { url } }));
  }, []);

  // ── Name save ─────────────────────────────────────────────────────────────
  const handleSaveName = useCallback(async () => {
    const trimmed = editName.trim();
    if (trimmed.length < 2 || trimmed === displayName || nameSaving) return;
    setNameSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: trimmed }),
      });
      if (!res.ok) throw new Error("failed");
      setDisplayName(trimmed);
      setNameStatus("saved");
      setTimeout(() => setNameStatus("idle"), 2000);
    } catch {
      setNameStatus("error");
      setTimeout(() => setNameStatus("idle"), 2000);
    } finally {
      setNameSaving(false);
    }
  }, [editName, displayName, nameSaving]);

  const initial  = (displayName ?? "U")[0]?.toUpperCase() ?? "U";
  const canSave  = editName.trim().length >= 2 && editName.trim() !== displayName;

  const saveBtnBg =
    nameStatus === "saved" ? "#00D67A" :
    nameStatus === "error" ? "#D7263D" :
    "#0056D6";

  return (
    <>
      {/* ── Hidden file input for avatar ──────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) setCropFile(f);
          e.target.value = "";
        }}
      />

      {/* ── Crop modal (full-screen, z-index above profile modal) ─────────── */}
      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onClose={() => setCropFile(null)}
          onUploaded={url => { handleAvatarUploaded(url); setCropFile(null); }}
        />
      )}

      {/* ── Header chip (avatar + name, clickable) ────────────────────────── */}
      <button
        onClick={openModal}
        className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        {/* Mini circular avatar */}
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            overflow: "hidden",
            border: "1.5px solid rgba(168,181,204,0.35)",
            background: "#0A2540",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            position: "relative",
          }}
        >
          {/* Fallback — misma imagen que usa el ProgressBar para consistencia */}
          <img
            src="/aguila.png"
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              opacity: avatarVisible && !avatarError ? 0 : 1,
              transition: "opacity 0.2s",
              background: "#0A2540",
            }}
          />

          {/* User avatar — fades in on top of the eagle once loaded */}
          {headerAvatar && !avatarError && (
            <img
              key={headerAvatar}
              src={headerAvatar}
              alt=""
              onLoad={() => setAvatarVisible(true)}
              onError={() => setAvatarError(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
                opacity: avatarVisible ? 1 : 0,
                transition: "opacity 0.25s",
              }}
            />
          )}
        </div>

        <p className="text-xs font-medium text-white truncate max-w-[100px]">
          {displayName}
        </p>
      </button>

      {/* ── Profile modal ─────────────────────────────────────────────────── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99993,
              background: "rgba(3,10,20,0.88)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => setOpen(false)}
          />

          {/* Modal card */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99994,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                background: "linear-gradient(160deg, #0D2140 0%, #091628 100%)",
                border: "1px solid #1E3A5C",
                borderRadius: "16px",
                padding: "28px 24px 24px",
                width: "min(360px, 94vw)",
                boxShadow:
                  "0 0 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,214,10,0.06)",
                pointerEvents: "auto",
              }}
            >
              {/* Modal header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: "22px",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-arcade)",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    color: "#FFD60A",
                    textShadow: "0 0 10px rgba(255,214,10,0.7)",
                  }}
                >
                  MI PERFIL
                </p>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid #1E3A5C",
                    borderRadius: "6px",
                    padding: "5px",
                    cursor: "pointer",
                    color: "#5A7A96",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X style={{ width: "14px", height: "14px" }} />
                </button>
              </div>

              {/* ── Large avatar (clickable to change) ───────────────────── */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{ position: "relative", cursor: "pointer" }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Cambiar avatar"
                >
                  {/* Glow ring */}
                  <div
                    style={{
                      position: "absolute",
                      inset: "-3px",
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, #00D67A, #0056D6, #FFD60A)",
                      zIndex: 0,
                      opacity: 0.55,
                    }}
                  />

                  {/* Avatar circle */}
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "#0A2540",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {modalAvatar ? (
                      <img
                        src={modalAvatar}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center top",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "28px",
                          fontWeight: 700,
                          color: "#A8B5CC",
                        }}
                      >
                        {initial}
                      </span>
                    )}
                  </div>

                  {/* Camera badge */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      zIndex: 2,
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "#0056D6",
                      border: "2px solid #091628",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Camera style={{ width: "12px", height: "12px", color: "#fff" }} />
                  </div>
                </div>
              </div>

              {/* ── Form fields ──────────────────────────────────────────── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                {/* Name — editable */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#7A9AC0",
                      letterSpacing: "0.08em",
                      marginBottom: "6px",
                    }}
                  >
                    NOMBRE
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => {
                        setEditName(e.target.value);
                        setNameStatus("idle");
                      }}
                      onKeyDown={e => { if (e.key === "Enter") handleSaveName(); }}
                      maxLength={100}
                      placeholder="Tu nombre"
                      style={{
                        flex: 1,
                        background: "#071525",
                        border: "1px solid #1E3A5C",
                        borderRadius: "8px",
                        padding: "9px 12px",
                        fontSize: "13px",
                        color: "#E8F0FB",
                        outline: "none",
                        minWidth: 0,
                      }}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={!canSave || nameSaving}
                      style={{
                        padding: "9px 14px",
                        borderRadius: "8px",
                        border: "none",
                        background: saveBtnBg,
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: canSave && !nameSaving ? "pointer" : "not-allowed",
                        opacity: canSave ? 1 : 0.4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "50px",
                        transition: "background 0.2s",
                      }}
                    >
                      {nameSaving ? (
                        <Loader2
                          style={{
                            width: "14px",
                            height: "14px",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                      ) : nameStatus === "saved" ? (
                        <Check style={{ width: "14px", height: "14px" }} />
                      ) : (
                        "OK"
                      )}
                    </button>
                  </div>
                  {nameStatus === "error" && (
                    <p style={{ fontSize: "11px", color: "#D7263D", marginTop: "5px" }}>
                      Error al guardar — intentá de nuevo
                    </p>
                  )}
                </div>

                {/* Email — read-only */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#7A9AC0",
                      letterSpacing: "0.08em",
                      marginBottom: "6px",
                    }}
                  >
                    EMAIL
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(7,21,37,0.7)",
                      border: "1px solid rgba(30,58,92,0.45)",
                      borderRadius: "8px",
                      padding: "9px 12px",
                    }}
                  >
                    <Mail
                      style={{
                        width: "13px",
                        height: "13px",
                        color: "#5A7A96",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#7A9AC0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {email}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
