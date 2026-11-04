"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Camera, Loader2, Send, ExternalLink, Target } from "lucide-react";

type Proof = "image" | "link" | "text" | "none";

interface Mission {
  id: string;
  day_number: number | null;
  title: string;
  description: string | null;
  action_url: string | null;
  proof: Proof;
  points_reward: number;
  submission: { status: "approved" | "rejected"; points_awarded: number } | null;
}

/**
 * Misiones fijas de On Demand: siempre las mismas, sin fecha. Cada una suma
 * puntos una vez. No son obligatorias; sirven para llegar a los premios.
 */
export function OndemandMissionsClient() {
  const [missions, setMissions] = useState<Mission[] | null>(null);

  const load = useCallback(() => {
    fetch("/api/ondemand/missions", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMissions(d.missions ?? []))
      .catch(() => setMissions([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = new Map<string, Mission[]>();
  for (const m of missions ?? []) {
    const key = m.day_number ? `Día ${m.day_number}` : "Misiones generales";
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const done = (missions ?? []).filter((m) => m.submission?.status === "approved").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E42D2C", margin: 0 }}>
          Suma puntos
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 3vw, 30px)", fontWeight: 800, margin: "4px 0 0", color: "var(--foreground)" }}>
          Misiones
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--muted-foreground)", margin: "6px 0 0", maxWidth: "62ch" }}>
          No son obligatorias: tus clases y tareas están en cada día. Cada misión suma puntos una sola vez, y con los puntos llegas a los premios.
          {missions && missions.length > 0 && <> Llevas <strong style={{ color: "var(--foreground)" }}>{done} de {missions.length}</strong>.</>}
        </p>
      </header>

      {missions === null && (
        <p style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 14 }}>
          <Loader2 size={16} className="animate-spin" /> Cargando misiones…
        </p>
      )}
      {missions?.length === 0 && (
        <div style={{ borderRadius: 16, border: "1px dashed var(--border)", background: "var(--card)", padding: "40px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
          Todavía no hay misiones. Vuelve pronto.
        </div>
      )}

      {[...groups.entries()].map(([label, list]) => (
        <section key={label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)", margin: 0 }}>{label}</h2>
          {list.map((m) => <MissionCard key={m.id} mission={m} onDone={load} />)}
        </section>
      ))}
    </div>
  );
}

function MissionCard({ mission: m, onDone }: { mission: Mission; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const done = m.submission?.status === "approved";
  const rejected = m.submission?.status === "rejected";

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ondemand/missions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mission_id: m.id, ...payload }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(
          d.error === "file_too_large" ? "La imagen pesa más de 5 MB."
          : d.error === "invalid_image" ? "Sube una imagen PNG, JPG o WEBP."
          : d.error === "invalid_link" ? "Pega un link que empiece con https://"
          : d.error === "empty" ? "Escribe tu respuesta."
          : "No se pudo enviar. Intenta de nuevo."
        );
        return;
      }
      if (d.awarded && d.delta) {
        window.dispatchEvent(new CustomEvent("xp-gained", { detail: { delta: d.delta, total: d.total, source: "mission" } }));
      }
      onDone();
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError("La imagen pesa más de 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => send({ base64: String(reader.result) });
    reader.readAsDataURL(f);
  }

  return (
    <div
      className="gb-elev"
      style={{
        borderRadius: 14, border: `1px solid ${done ? "color-mix(in srgb, var(--success) 45%, transparent)" : "var(--border)"}`,
        background: "var(--card)", padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start",
      }}
    >
      <span style={{
        display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: done ? "color-mix(in srgb, var(--success) 14%, transparent)" : "color-mix(in srgb, #E42D2C 12%, transparent)",
        color: done ? "var(--success)" : "#E42D2C",
      }}>
        {done ? <CheckCircle2 size={20} /> : <Target size={20} />}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8, justifyContent: "space-between" }}>
          <p style={{ fontWeight: 800, fontSize: 15.5, margin: 0, color: "var(--foreground)" }}>{m.title}</p>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800, color: done ? "var(--success)" : "#E42D2C" }}>
            {done ? `+${m.submission?.points_awarded ?? m.points_reward} pts` : `+${m.points_reward} pts`}
          </span>
        </div>
        {m.description && <p style={{ margin: 0, fontSize: 14, color: "var(--muted-foreground)", whiteSpace: "pre-line" }}>{m.description}</p>}
        {m.action_url && (
          <a href={m.action_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: "var(--primary)" }}>
            Ir a la misión <ExternalLink size={14} />
          </a>
        )}

        {done && <p style={{ margin: 0, fontSize: 13, color: "var(--success)", fontWeight: 700 }}>¡Misión completada!</p>}
        {rejected && <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>El equipo revisó tu respuesta y no la aprobó.</p>}

        {!m.submission && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {m.proof === "image" && (
              <>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} style={btn}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />} Subir captura
                </button>
              </>
            )}
            {(m.proof === "link" || m.proof === "text") && (
              <>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={m.proof === "link" ? "https://…" : "Tu respuesta"}
                  style={{ flex: 1, minWidth: 200, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", padding: "0 12px", fontSize: 14 }}
                />
                <button type="button" disabled={busy || !text.trim()} onClick={() => send({ text })} style={btn}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Enviar
                </button>
              </>
            )}
            {m.proof === "none" && (
              <button type="button" disabled={busy} onClick={() => send({})} style={btn}>
                {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Ya la hice
              </button>
            )}
          </div>
        )}
        {error && <p style={{ margin: 0, fontSize: 13, color: "#E42D2C" }}>{error}</p>}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 16px", borderRadius: 10,
  background: "#E42D2C", color: "#fff", border: 0, fontSize: 14, fontWeight: 800, cursor: "pointer",
};
