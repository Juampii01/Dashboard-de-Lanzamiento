"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface Mission {
  id: string;
  title: string;
  description: string | null;
  points_reward: number;
}
interface Submission {
  id: string;
  image_url: string | null;
  content_type: string;          // 'image' | 'link' | 'text'
  content_text: string | null;
  status: string;
  points_awarded: number;
  created_at: string;
  full_name: string | null;
  email: string;
}

export function DailyMissionAdmin({ initialMission = null }: { initialMission?: Mission | null }) {
  const [mission, setMission] = useState<Mission | null>(initialMission);
  const [title, setTitle] = useState(initialMission?.title ?? "");
  const [desc, setDesc] = useState(initialMission?.description ?? "");
  const [pts, setPts] = useState<number>(initialMission?.points_reward ?? 1000);
  const [saving, setSaving] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [hasRows, setHasRows] = useState(false);

  // Cargar la misión activa al montar (permite usarlo sin pasar initialMission).
  useEffect(() => {
    fetch("/api/admin/daily-mission")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setHasRows(!!d.hasRows);
          if (d.mission) {
            setMission(d.mission);
            setTitle(d.mission.title ?? "");
            setDesc(d.mission.description ?? "");
            setPts(d.mission.points_reward ?? 1000);
          }
        }
      })
      .catch(() => { /* noop */ });
  }, []);

  async function loadSubs() {
    try {
      const r = await fetch("/api/admin/mission-submissions");
      const d = await r.json();
      if (d.ok) setSubs(d.submissions ?? []);
    } catch { /* noop */ }
  }
  useEffect(() => { loadSubs(); }, [mission?.id]);

  async function save(action: "set" | "clear" | "remove") {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/daily-mission", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "set" ? { action, title, description: desc, points_reward: pts } : { action }),
      });
      const d = await r.json();
      if (r.ok) {
        setMission(d.mission);
        if (action !== "set") setSubs([]);
        setHasRows(action !== "remove"); // set/clear dejan fila; remove la borra
      }
    } catch { /* noop */ }
    setSaving(false);
  }

  async function moderate(id: string, action: "reject" | "approve") {
    setBusy(id);
    try {
      await fetch("/api/admin/mission-submissions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: id, action }),
      });
      await loadSubs();
    } catch { /* noop */ }
    setBusy(null);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--background)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--foreground)", fontSize: 14, padding: "9px 12px",
    outline: "none", fontFamily: "var(--font-sans)", boxSizing: "border-box",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p style={{ fontWeight: 700, color: "var(--muted-foreground)", fontSize: 13 }}>
          {mission ? "Misión activa" : "Sin misión activa"}
        </p>
        {mission && (
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--success)", background: "color-mix(in srgb, var(--success) 14%, transparent)",
            borderRadius: 999, padding: "3px 10px",
          }}>● Activa</span>
        )}
      </div>

      <div className="space-y-2">
        <input style={inputStyle} placeholder="Título de la misión (ej: Comparte tu Día 1 en LinkedIn)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 64 }} placeholder="Descripción / instrucciones para los participantes" value={desc ?? ""} onChange={(e) => setDesc(e.target.value)} />
        <div className="flex items-center gap-2 flex-wrap">
          <label style={{ fontSize: 13, color: "var(--muted-foreground)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            Puntos:
            <input
              type="number" min={0} max={100000} step={50}
              value={pts}
              onChange={(e) => setPts(Math.max(0, Math.min(100000, Math.round(Number(e.target.value) || 0))))}
              style={{ width: 92, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)", fontSize: 14, padding: "7px 10px", outline: "none", fontFamily: "var(--font-sans)" }}
            />
          </label>
          <button onClick={() => save("set")} disabled={saving || !title.trim()}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5, background: "var(--primary)", color: "var(--primary-foreground)", opacity: (saving || !title.trim()) ? 0.6 : 1 }}>
            {saving ? "Guardando..." : mission ? "Actualizar misión" : "Publicar misión"}
          </button>
          {mission && (
            <button onClick={() => save("clear")} disabled={saving}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid color-mix(in srgb, var(--destructive) 45%, transparent)", cursor: "pointer", fontWeight: 700, fontSize: 13, background: "transparent", color: "var(--destructive)" }}>
              Cerrar — “La misión caducó”
            </button>
          )}
          {(mission || hasRows) && (
            <button onClick={() => save("remove")} disabled={saving}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer", fontWeight: 600, fontSize: 13, background: "transparent", color: "var(--muted-foreground)" }}>
              Volver a “Próximamente”
            </button>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          {mission
            ? "Los usuarios ven esta misión y pueden subir su captura."
            : hasRows
              ? "Sin misión activa: los usuarios ven “La misión caducó”."
              : "Sin misión activa: los usuarios ven “Próximamente”."}
        </p>
      </div>

      {/* Respuestas pendientes de revisar */}
      <div className="space-y-2" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
          Respuestas pendientes {subs.length > 0 && <span style={{ color: "var(--muted-foreground)", fontWeight: 500 }}>· {subs.length}</span>}
        </p>
        <p style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
          Aceptar = queda cumplida (se borra el contenido). Rechazar = resta los puntos y la persona puede reintentar. Lo que no revises queda como cumplido.
        </p>
        {subs.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No hay respuestas para revisar.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
            {subs.map((s) => (
              <div key={s.id} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                {s.content_type === "image" && s.image_url ? (
                  <a href={s.image_url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.image_url} alt="captura" style={{ width: "100%", height: 110, objectFit: "cover", display: "block", background: "var(--muted)" }} />
                  </a>
                ) : (
                  <div style={{ padding: "10px 12px", minHeight: 70, background: "var(--muted)", fontSize: 12.5, color: "var(--foreground)", wordBreak: "break-word" }}>
                    {s.content_type === "link" && s.content_text ? (
                      <a href={s.content_text} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>{s.content_text}</a>
                    ) : (
                      <span>{s.content_text || "—"}</span>
                    )}
                  </div>
                )}
                <div style={{ padding: "8px 10px" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.full_name || s.email || "—"}
                  </p>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => moderate(s.id, "approve")} disabled={busy === s.id}
                      style={{ flex: 1, padding: "5px", borderRadius: 6, border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)", background: "transparent", color: "var(--success)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                      {busy === s.id ? <Loader2 size={12} className="animate-spin inline" /> : "Aceptar"}
                    </button>
                    <button onClick={() => moderate(s.id, "reject")} disabled={busy === s.id}
                      style={{ flex: 1, padding: "5px", borderRadius: 6, border: "1px solid color-mix(in srgb, var(--destructive) 40%, transparent)", background: "transparent", color: "var(--destructive)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                      {busy === s.id ? <Loader2 size={12} className="animate-spin inline" /> : "Rechazar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
