"use client";

import { useEffect, useRef, useState } from "react";

export function StoryUpload({ alreadyDone }: { alreadyDone: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">(alreadyDone ? "done" : "idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Revoca el object URL anterior al cambiar/desmontar (evita memory leak de blobs).
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Solo se aceptan imágenes (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("La imagen no puede pesar más de 8 MB.");
      return;
    }
    setErrorMsg("");
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleSubmit = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || phase === "loading") return;

    setPhase("loading");
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/missions/story/submit", { method: "POST", body: form });
      const json = await res.json() as {
        ok?: boolean; awarded?: boolean; delta?: number; total?: number; error?: string; reason?: string;
      };

      // award_failed ahora vuelve con res.ok=false (rollback en el server) → reintentable.
      if (!res.ok || !json.ok) {
        setPhase("error");
        setErrorMsg(
          json.error === "upload_failed" ? "Error al subir la imagen. Intentá de nuevo."
          : json.error === "award_failed" ? "No pudimos acreditar los puntos. Intentá de nuevo."
          : json.error === "file_too_large" ? "La imagen es demasiado grande (máx 8 MB)."
          : json.error === "invalid_image" ? "Formato de imagen no válido."
          : "Error inesperado. Intentá de nuevo."
        );
        setTimeout(() => setPhase((p) => (p === "error" ? "idle" : p)), 3000);
        return;
      }

      setPhase("done");
      if (json.awarded && json.delta) {
        window.dispatchEvent(new CustomEvent("xp-gained", {
          detail: { delta: json.delta, total: json.total, source: "story" },
        }));
      }
    } catch {
      setPhase("error");
      setErrorMsg("Error de conexión. Intentá de nuevo.");
      setTimeout(() => setPhase((p) => (p === "error" ? "idle" : p)), 3000);
    }
  };

  if (phase === "done") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px",
        background: "rgba(0,214,122,0.08)",
        border: "1px solid rgba(0,214,122,0.35)",
        borderRadius: 12,
      }}>
        <span style={{ fontSize: 24 }}>✅</span>
        <div>
          <p style={{ fontWeight: 700, color: "#00D67A", fontSize: 14, margin: 0 }}>
            ¡Historia subida! +500 pts
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>
            Volvé mañana después de las 8 AM (hora Miami) para subir tu próxima historia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(20,58,107,0.85) 0%, rgba(10,37,64,0.92) 100%)",
      border: "1px solid #1E3A5C",
      borderRadius: 12,
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontWeight: 700, color: "#C8D6E8", fontSize: 14, margin: 0 }}>
          📸 Subí tu historia de hoy
        </p>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
          color: "#FFD700", background: "rgba(255,215,0,0.1)",
          border: "1px solid rgba(255,215,0,0.3)",
          borderRadius: 999, padding: "2px 10px",
        }}>+500 pts</span>
      </div>

      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: 0 }}>
        Posteá una historia en tus redes sobre el challenge y subí una captura de pantalla. Se reinicia cada día a las 8 AM (hora Miami).
      </p>

      {/* File picker zone */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: preview ? "none" : "2px dashed #1E3A5C",
          borderRadius: 10,
          cursor: "pointer",
          overflow: "hidden",
          minHeight: preview ? "auto" : 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: preview ? "transparent" : "rgba(255,255,255,0.02)",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 10, display: "block" }} />
        ) : (
          <p style={{ fontSize: 13, color: "#8DA2C4", textAlign: "center", padding: "20px", margin: 0 }}>
            📁 Tocá para elegir imagen (JPG, PNG, WEBP · máx 8 MB)
          </p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {errorMsg && (
        <p style={{ fontSize: 12, color: "#E42D2C", margin: 0 }}>{errorMsg}</p>
      )}

      {preview && phase !== "loading" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
            style={{
              flex: 1, padding: "9px 0",
              background: "transparent",
              border: "1.5px solid #1E3A5C",
              borderRadius: 8, color: "#8DA2C4",
              fontSize: 12, cursor: "pointer",
            }}
          >
            Cambiar imagen
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 2, padding: "9px 0",
              background: "#D7263D", border: "none",
              borderRadius: 8, color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            Subir y ganar 500 pts →
          </button>
        </div>
      )}

      {phase === "loading" && (
        <p style={{ fontSize: 13, color: "#8DA2C4", textAlign: "center", margin: 0 }}>Subiendo imagen...</p>
      )}
    </div>
  );
}
