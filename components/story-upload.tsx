"use client";

import { useEffect, useRef, useState } from "react";

// El reset ocurre a las 8:00 AM hora Miami (America/New_York). Devolvemos esa
// MISMA hora expresada en la zona horaria LOCAL del navegador de quien lo ve
// (p. ej. "9:00 a.m." en Argentina). Se calcula tras montar para no romper la
// hidratación (server y cliente pueden estar en zonas distintas).
function miamiResetLocalLabel(hour = 8): string {
  try {
    const tz = "America/New_York";
    const now = new Date();
    const nyYMD = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now); // YYYY-MM-DD
    const [y, m, d] = nyYMD.split("-").map(Number);
    const offsetMin = (date: Date) => {
      const p = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      }).formatToParts(date).reduce<Record<string, string>>((a, x) => { a[x.type] = x.value; return a; }, {});
      const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
      return (asUTC - date.getTime()) / 60000;
    };
    const utcGuess = Date.UTC(y, m - 1, d, hour, 0, 0);
    const instant = new Date(utcGuess - offsetMin(new Date(utcGuess)) * 60000);
    return instant.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return `${hour}:00 AM`;
  }
}

export function StoryUpload({ alreadyDone }: { alreadyDone: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">(alreadyDone ? "done" : "idle");
  const [errorMsg, setErrorMsg] = useState("");
  // Hora del reset (8 AM Miami) expresada en la zona local del visitante.
  const [resetLabel, setResetLabel] = useState("8:00 AM");

  useEffect(() => { setResetLabel(miamiResetLocalLabel()); }, []);

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
          json.error === "upload_failed" ? "Error al subir la imagen. Intenta de nuevo."
          : json.error === "award_failed" ? "No pudimos acreditar los puntos. Intenta de nuevo."
          : json.error === "file_too_large" ? "La imagen es demasiado grande (máx 8 MB)."
          : json.error === "invalid_image" ? "Formato de imagen no válido."
          : "Error inesperado. Intenta de nuevo."
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
      setErrorMsg("Error de conexión. Intenta de nuevo.");
      setTimeout(() => setPhase((p) => (p === "error" ? "idle" : p)), 3000);
    }
  };

  if (phase === "done") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px",
        background: "color-mix(in srgb, var(--success) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)",
        borderRadius: 12,
      }}>
        <span style={{ fontSize: 24 }}>✅</span>
        <div>
          <p style={{ fontWeight: 700, color: "var(--success)", fontSize: 14, margin: 0 }}>
            ¡Historia subida! +500 pts
          </p>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
            Vuelve mañana después de las {resetLabel} (tu hora local) para subir tu próxima historia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontWeight: 700, color: "var(--foreground)", fontSize: 14, margin: 0 }}>
          📸 Sube tu historia de hoy
        </p>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
          color: "var(--accent-foreground)", background: "var(--accent)",
          borderRadius: 999, padding: "2px 10px",
        }}>+500 pts</span>
      </div>

      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
        Postea una historia en tus redes sobre el challenge y sube una captura de pantalla. Se reinicia cada día a las {resetLabel} (tu hora local).
      </p>

      {/* File picker zone */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: preview ? "none" : "2px dashed var(--border)",
          borderRadius: 10,
          cursor: "pointer",
          overflow: "hidden",
          minHeight: preview ? "auto" : 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: preview ? "transparent" : "var(--muted)",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 10, display: "block" }} />
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: "20px", margin: 0 }}>
            📁 Toca para elegir imagen (JPG, PNG, WEBP · máx 8 MB)
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
        <p style={{ fontSize: 12, color: "var(--primary)", margin: 0 }}>{errorMsg}</p>
      )}

      {preview && phase !== "loading" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
            style={{
              flex: 1, padding: "9px 0",
              background: "transparent",
              border: "1.5px solid var(--border)",
              borderRadius: 8, color: "var(--muted-foreground)",
              fontSize: 12, cursor: "pointer",
            }}
          >
            Cambiar imagen
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 2, padding: "9px 0",
              background: "var(--primary)", border: "none",
              borderRadius: 8, color: "var(--primary-foreground)",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            Subir y ganar 500 pts →
          </button>
        </div>
      )}

      {phase === "loading" && (
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", margin: 0 }}>Subiendo imagen...</p>
      )}
    </div>
  );
}
