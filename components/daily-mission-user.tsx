"use client";

import { useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, Upload } from "lucide-react";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("La imagen no puede superar 5MB."); return; }

    setUploading(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/missions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");

      setDone(true);
      if (data.awarded && data.delta) {
        window.dispatchEvent(new CustomEvent("xp-gained", {
          detail: { delta: data.delta, total: data.total, source: "mission" },
        }));
      }
    } catch {
      setError("No pudimos subir la captura. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        position: "relative", overflow: "hidden",
        borderRadius: 18, padding: "clamp(20px, 4vw, 32px)",
        background: "radial-gradient(700px circle at 50% 0%, rgba(255,215,0,0.10), transparent 55%), linear-gradient(160deg, #0d1a3d 0%, #080f24 100%)",
        border: "1px solid rgba(255,215,0,0.30)",
      }}
    >
      <p style={{
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
        letterSpacing: "0.16em", textTransform: "uppercase", color: "#FFD700", marginBottom: 8,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        ⚡ Misión del día · +{mission.points_reward} XP
      </p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px, 3.5vw, 28px)", fontWeight: 800, color: "#fff", lineHeight: 1.15, margin: 0 }}>
        {mission.title}
      </h2>
      {mission.description && (
        <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.82)", lineHeight: 1.55, marginTop: 10, maxWidth: "60ch" }}>
          {mission.description}
        </p>
      )}

      <div style={{ marginTop: 18 }}>
        {done ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(22,166,95,0.15)", border: "1px solid rgba(22,166,95,0.45)",
            borderRadius: 999, padding: "10px 18px", color: "#37d98a", fontWeight: 700, fontSize: 14,
          }}>
            <CheckCircle2 size={18} /> ¡Captura enviada! Sumaste +{mission.points_reward} XP
          </div>
        ) : (
          <>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 9,
                padding: "12px 22px", borderRadius: 12, border: "none",
                cursor: uploading ? "wait" : "pointer", fontSize: 15, fontWeight: 800,
                background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#0d1a3d",
                boxShadow: "0 6px 20px -6px rgba(255,215,0,0.6)",
              }}
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              {uploading ? "Subiendo..." : "Subir captura y ganar XP"}
            </button>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Upload size={13} /> Hacé la misión, sacá una captura y subila. PNG/JPG, máx 5MB.
            </p>
          </>
        )}
        {error && <p style={{ fontSize: 13, color: "#ff8a8a", marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  );
}
