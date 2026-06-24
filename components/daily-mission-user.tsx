"use client";

import { useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, Send } from "lucide-react";

interface Mission {
  id: string;
  title: string;
  description: string | null;
  points_reward: number;
}

export function DailyMissionUser({
  mission,
  alreadyDone,
}: {
  mission: Mission;
  alreadyDone: boolean;
}) {
  const [done, setDone] = useState(alreadyDone);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function award(data: { awarded?: boolean; delta?: number; total?: number }) {
    setDone(true);
    if (data.awarded && data.delta) {
      window.dispatchEvent(new CustomEvent("xp-gained", {
        detail: { delta: data.delta, total: data.total, source: "mission" },
      }));
    }
  }

  async function send(payload: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/missions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");
      award(data);
    } catch {
      setError("No pudimos enviar tu respuesta. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("La imagen no puede superar 5MB."); return; }
    const base64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    await send({ base64 });
  }

  function handleText() {
    const t = text.trim();
    if (!t) { setError("Escribí tu respuesta o pegá un link."); return; }
    const kind = /^https?:\/\//i.test(t) ? "link" : "text";
    send({ text: t, kind });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "var(--muted)", border: "1px solid var(--input)",
    borderRadius: 10, color: "var(--foreground)", fontSize: 14, padding: "11px 13px", outline: "none",
    fontFamily: "var(--font-sans)", resize: "vertical", minHeight: 54,
  };

  return (
    <div
      style={{
        position: "relative", overflow: "hidden",
        borderRadius: 18, padding: "clamp(20px, 4vw, 32px)",
        background: "radial-gradient(700px circle at 50% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 55%), var(--card)",
        border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))",
      }}
    >
      <p style={{
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
        letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--primary)", marginBottom: 8,
      }}>
        ⚡ Misión del día · +{mission.points_reward} XP
      </p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px, 3.5vw, 28px)", fontWeight: 800, color: "var(--foreground)", lineHeight: 1.15, margin: 0 }}>
        {mission.title}
      </h2>
      {mission.description && (
        <p style={{ fontSize: 14.5, color: "var(--muted-foreground)", lineHeight: 1.55, marginTop: 10, maxWidth: "60ch" }}>
          {mission.description}
        </p>
      )}

      <div style={{ marginTop: 18 }}>
        {done ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "color-mix(in srgb, var(--success) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 45%, transparent)",
            borderRadius: 999, padding: "10px 18px", color: "var(--success)", fontWeight: 700, fontSize: 14,
          }}>
            <CheckCircle2 size={18} /> ¡Respuesta enviada! Sumaste +{mission.points_reward} XP
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Texto / link */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Pegá un link o escribí tu respuesta acá…"
              style={inputStyle}
              disabled={busy}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={handleText}
                disabled={busy}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "11px 20px", borderRadius: 12, border: "none",
                  cursor: busy ? "wait" : "pointer", fontSize: 14.5, fontWeight: 800,
                  background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#0d1a3d",
                }}
              >
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                Enviar respuesta
              </button>

              {/* Captura */}
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "11px 18px", borderRadius: 12, cursor: busy ? "wait" : "pointer",
                  fontSize: 14.5, fontWeight: 700, color: "var(--foreground)",
                  background: "var(--muted)", border: "1px solid var(--border)",
                }}
              >
                <Camera size={17} /> Subir captura
              </button>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", margin: 0 }}>
              Podés responder con un <strong style={{ color: "var(--foreground)" }}>link</strong>, un <strong style={{ color: "var(--foreground)" }}>texto</strong> o una <strong style={{ color: "var(--foreground)" }}>captura</strong> (PNG/JPG, máx 5MB).
            </p>
          </div>
        )}
        {error && <p style={{ fontSize: 13, color: "var(--destructive)", marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  );
}
