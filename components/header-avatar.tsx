"use client";

import { useEffect, useState } from "react";

/**
 * HeaderAvatar
 * Small (28px) circular avatar badge shown in the top-right header next to the
 * user's name. Initialises from the SSR-provided avatarUrl and listens for the
 * "avatar-updated" CustomEvent dispatched by the upload flow so it refreshes
 * immediately after the user changes their photo (no page reload needed).
 */
export function HeaderAvatar({
  avatarUrl,
  fullName,
}: {
  avatarUrl: string | null;
  fullName: string;
}) {
  const [src, setSrc]       = useState<string | null>(avatarUrl);
  const [error, setError]   = useState(false);
  const [visible, setVisible] = useState(false);

  // Listen for real-time avatar updates from the upload modal
  useEffect(() => {
    function onAvatarUpdated(e: Event) {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      if (url) {
        setSrc(url);
        setError(false);
        setVisible(false); // will become true on next img load
      }
    }
    window.addEventListener("avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("avatar-updated", onAvatarUpdated);
  }, []);

  // Fallback: first letter of the name
  const initial = (fullName ?? "U")[0]?.toUpperCase() ?? "U";

  return (
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
      {/* Initials fallback (always rendered underneath) */}
      <span
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: "#C9D6EC",
          lineHeight: 1,
          position: "absolute",
          opacity: visible && !error ? 0 : 1,
          transition: "opacity 0.2s",
          userSelect: "none",
        }}
      >
        {initial}
      </span>

      {/* Custom or default avatar */}
      {src && !error && (
        <img
          key={src} // force re-mount on URL change → fresh load event
          src={src}
          alt=""
          onLoad={() => setVisible(true)}
          onError={() => setError(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.25s",
          }}
        />
      )}
    </div>
  );
}
