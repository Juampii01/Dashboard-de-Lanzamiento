"use client";

import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Quiz {
  id: string;
  capsule_id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  xp_reward: number;
  question_order: number;
}

interface Capsule {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  youtube_url: string;
  podcast_url: string | null;
  video_type: string;
  orientation: string;
  duration_seconds: number | null;
  points_reward: number;
  sort_order: number;
  quizzes: Quiz[];
}

interface Day {
  day_number: number;
  capsules: Capsule[];
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const P = {
  bg:      "#061528",
  surface: "#0A2540",
  border:  "#1E3A5C",
  cyan:    "#00D4FF",
  green:   "#00D67A",
  orange:  "#FF9500",
  red:     "#FF453A",
  text:    "#E8F0FE",
  muted:   "#5A6B85",
  subtle:  "#A8B5CC",
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: P.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0F1E30",
  border: `1px solid ${P.border}`,
  borderRadius: "6px",
  color: P.text,
  fontSize: "13px",
  padding: "6px 10px",
  fontFamily: "var(--font-sans)",
  outline: "none",
  width: "100%",
};

const btnStyle = (color: string, bg: string): React.CSSProperties => ({
  padding: "5px 12px",
  borderRadius: "6px",
  border: "none",
  background: bg,
  color,
  fontSize: "11px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.04em",
});

// ─── QuizBlock ────────────────────────────────────────────────────────────────

function QuizBlock({
  quiz,
  onSaved,
  onDeleted,
}: {
  quiz: Quiz;
  onSaved: (q: Quiz) => void;
  onDeleted: (id: string) => void;
}) {
  const [q, setQ] = useState<Quiz>({ ...quiz });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const changed =
    q.question             !== quiz.question             ||
    q.options.join("|")    !== quiz.options.join("|")    ||
    q.correct_option_index !== quiz.correct_option_index ||
    q.xp_reward            !== quiz.xp_reward            ||
    q.question_order       !== quiz.question_order;

  const save = useCallback(async () => {
    if (!changed || saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const res  = await fetch("/api/admin/content/quiz", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: q.id,
          question: q.question,
          options: q.options,
          correct_option_index: q.correct_option_index,
          xp_reward: q.xp_reward,
          question_order: q.question_order,
        }),
      });
      const data = await res.json() as { ok?: boolean; quiz?: Quiz; error?: string };
      if (data.ok && data.quiz) {
        onSaved(data.quiz);
        setMsg({ ok: true, text: "Guardado ✓" });
      } else {
        setMsg({ ok: false, text: data.error ?? "Error" });
      }
    } catch {
      setMsg({ ok: false, text: "Error de red" });
    } finally {
      setSaving(false);
    }
  }, [q, quiz, changed, saving, onSaved]);

  const del = useCallback(async () => {
    if (deleting) return;
    if (!confirm("¿Eliminar esta pregunta?")) return;
    setDeleting(true);
    try {
      const res  = await fetch("/api/admin/content/quiz", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: q.id }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) onDeleted(q.id);
      else setMsg({ ok: false, text: data.error ?? "Error" });
    } catch {
      setMsg({ ok: false, text: "Error de red" });
    } finally {
      setDeleting(false);
    }
  }, [q.id, deleting, onDeleted]);

  const addOption = () => {
    if (q.options.length >= 5) return;
    setQ((prev) => ({ ...prev, options: [...prev.options, ""] }));
  };

  const removeOption = (i: number) => {
    if (q.options.length <= 2) return;
    setQ((prev) => {
      const opts = prev.options.filter((_, idx) => idx !== i);
      const corr = prev.correct_option_index >= opts.length
        ? opts.length - 1
        : prev.correct_option_index;
      return { ...prev, options: opts, correct_option_index: corr };
    });
  };

  return (
    <div
      style={{
        background: "rgba(0,212,255,0.04)",
        border: `1px solid rgba(0,212,255,0.12)`,
        borderRadius: "8px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Label>Pregunta #{q.question_order}</Label>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            type="number"
            min={1}
            value={q.question_order}
            onChange={(e) => setQ((p) => ({ ...p, question_order: Number(e.target.value) }))}
            style={{ ...inputStyle, width: "52px", textAlign: "center", padding: "4px 6px" }}
            title="Orden"
          />
          <button style={btnStyle("#000", P.red)} onClick={del} disabled={deleting}>
            {deleting ? "..." : "✕ Borrar"}
          </button>
        </div>
      </div>

      {/* Question text */}
      <Field label="Enunciado">
        <textarea
          value={q.question}
          onChange={(e) => setQ((p) => ({ ...p, question: e.target.value }))}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Field>

      {/* Options */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <Label>Opciones</Label>
          {q.options.length < 5 && (
            <button style={btnStyle(P.cyan, "rgba(0,212,255,0.1)")} onClick={addOption}>
              + Agregar opción
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {q.options.map((opt, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="radio"
                name={`correct-${q.id}`}
                checked={q.correct_option_index === i}
                onChange={() => setQ((p) => ({ ...p, correct_option_index: i }))}
                title="Respuesta correcta"
                style={{ accentColor: P.green, flexShrink: 0 }}
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const opts = [...q.options];
                  opts[i] = e.target.value;
                  setQ((p) => ({ ...p, options: opts }));
                }}
                placeholder={`Opción ${i + 1}`}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                style={{ ...btnStyle(P.muted, "transparent"), padding: "3px 6px", border: `1px solid ${P.border}` }}
                onClick={() => removeOption(i)}
                disabled={q.options.length <= 2}
                title="Eliminar opción"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "10px", color: P.muted, marginTop: "4px" }}>
          • El radio seleccionado marca la respuesta correcta (índice {q.correct_option_index})
        </p>
      </div>

      {/* XP reward */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Label>XP correcto</Label>
        <input
          type="number"
          min={0}
          max={100}
          value={q.xp_reward}
          onChange={(e) => setQ((p) => ({ ...p, xp_reward: Number(e.target.value) }))}
          style={{ ...inputStyle, width: "64px", textAlign: "center" }}
        />
      </div>

      {/* Save row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          style={btnStyle("#000", changed ? P.green : P.border)}
          onClick={save}
          disabled={!changed || saving}
        >
          {saving ? "Guardando..." : changed ? "💾 Guardar pregunta" : "Sin cambios"}
        </button>
        {msg && (
          <span style={{ fontSize: "11px", color: msg.ok ? P.green : P.red }}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── NewQuizForm ──────────────────────────────────────────────────────────────

function NewQuizForm({
  capsuleId,
  nextOrder,
  onCreated,
}: {
  capsuleId: string;
  nextOrder: number;
  onCreated: (q: Quiz) => void;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions]   = useState(["", "", "", ""]);
  const [correct, setCorrect]   = useState(0);
  const [xp, setXp]             = useState(10);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState<string | null>(null);

  const create = async () => {
    if (!question.trim() || options.some((o) => !o.trim())) {
      setErr("Completá el enunciado y todas las opciones");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res  = await fetch("/api/admin/content/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capsule_id: capsuleId,
          question,
          options,
          correct_option_index: correct,
          xp_reward: xp,
          question_order: nextOrder,
        }),
      });
      const data = await res.json() as { ok?: boolean; quiz?: Quiz; error?: string };
      if (data.ok && data.quiz) {
        onCreated(data.quiz);
        setQuestion(""); setOptions(["","","",""]); setCorrect(0); setXp(10);
        setOpen(false);
      } else {
        setErr(data.error ?? "Error al crear");
      }
    } catch {
      setErr("Error de red");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button style={btnStyle(P.cyan, "rgba(0,212,255,0.08)")} onClick={() => setOpen(true)}>
        + Nueva pregunta
      </button>
    );
  }

  return (
    <div style={{ background: "rgba(0,214,122,0.04)", border: `1px solid rgba(0,214,122,0.15)`, borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Label>Nueva pregunta (orden {nextOrder})</Label>
        <button style={btnStyle(P.muted, "transparent")} onClick={() => setOpen(false)}>Cancelar</button>
      </div>

      <Field label="Enunciado">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="¿Cuál es la pregunta?" />
      </Field>

      <div>
        <Label>Opciones (seleccioná la correcta)</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input type="radio" name={`new-correct-${capsuleId}`} checked={correct === i} onChange={() => setCorrect(i)} style={{ accentColor: P.green }} />
              <input type="text" value={opt} onChange={(e) => { const o = [...options]; o[i] = e.target.value; setOptions(o); }} placeholder={`Opción ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Label>XP correcto</Label>
        <input type="number" min={0} max={100} value={xp} onChange={(e) => setXp(Number(e.target.value))} style={{ ...inputStyle, width: "64px", textAlign: "center" }} />
      </div>

      {err && <span style={{ fontSize: "11px", color: P.red }}>{err}</span>}

      <button style={btnStyle("#000", P.green)} onClick={create} disabled={saving}>
        {saving ? "Creando..." : "✓ Crear pregunta"}
      </button>
    </div>
  );
}

// ─── CapsuleEditor ────────────────────────────────────────────────────────────

function CapsuleEditor({ capsule: initial }: { capsule: Capsule }) {
  const [cap, setCap]       = useState<Capsule>({ ...initial, quizzes: [...initial.quizzes] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  const capChanged =
    cap.title            !== initial.title            ||
    cap.description      !== initial.description      ||
    cap.youtube_url      !== initial.youtube_url      ||
    cap.podcast_url      !== initial.podcast_url      ||
    cap.video_type       !== initial.video_type       ||
    cap.orientation      !== initial.orientation      ||
    (cap.duration_seconds ?? 0) !== (initial.duration_seconds ?? 0) ||
    cap.points_reward    !== initial.points_reward;

  const saveCapsule = useCallback(async () => {
    if (!capChanged || saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const res  = await fetch("/api/admin/content/capsule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cap.id,
          title: cap.title,
          description: cap.description,
          youtube_url: cap.youtube_url || null,
          podcast_url: cap.podcast_url || null,
          video_type: cap.video_type,
          orientation: cap.orientation,
          duration_seconds: cap.duration_seconds || null,
          points_reward: cap.points_reward,
        }),
      });
      const data = await res.json() as { ok?: boolean; capsule?: Partial<Capsule>; error?: string };
      if (data.ok) {
        setMsg({ ok: true, text: "Video guardado ✓" });
      } else {
        setMsg({ ok: false, text: data.error ?? "Error" });
      }
    } catch {
      setMsg({ ok: false, text: "Error de red" });
    } finally {
      setSaving(false);
    }
  }, [cap, capChanged, saving]);

  const typeLabel = cap.video_type === "podcast" ? "🎙 Podcast" : "📹 Normal";

  return (
    <div
      style={{
        background: P.surface,
        border: `1px solid ${P.border}`,
        borderRadius: "10px",
        overflow: "hidden",
        marginBottom: "12px",
      }}
    >
      {/* Capsule header */}
      <div
        style={{
          background: "rgba(0,212,255,0.06)",
          borderBottom: `1px solid ${P.border}`,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: P.cyan }}>
          {typeLabel}
        </span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: P.text, flex: 1 }}>
          {cap.title}
        </span>
        <span style={{ fontSize: "10px", color: P.muted, fontFamily: "var(--font-mono)" }}>
          orden {cap.sort_order} · {cap.points_reward} XP
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Row 1: title + type + orientation */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", alignItems: "end" }}>
          <Field label="Título">
            <input type="text" value={cap.title} onChange={(e) => setCap((p) => ({ ...p, title: e.target.value }))} style={inputStyle} />
          </Field>
          <Field label="Tipo">
            <select
              value={cap.video_type}
              onChange={(e) => setCap((p) => ({ ...p, video_type: e.target.value }))}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="normal">Normal</option>
              <option value="podcast">Podcast</option>
            </select>
          </Field>
          <Field label="Orientación">
            <select
              value={cap.orientation}
              onChange={(e) => setCap((p) => ({ ...p, orientation: e.target.value }))}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="horizontal">Horizontal (16:9)</option>
              <option value="vertical">Vertical (9:16)</option>
            </select>
          </Field>
        </div>

        {/* Row 2: description */}
        <Field label="Descripción (opcional)">
          <textarea
            value={cap.description ?? ""}
            onChange={(e) => setCap((p) => ({ ...p, description: e.target.value || null }))}
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Subtítulo o descripción breve del video"
          />
        </Field>

        {/* Row 3: youtube_url + duration + points */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", alignItems: "end" }}>
          <Field label="URL de YouTube">
            <input
              type="url"
              value={cap.youtube_url}
              onChange={(e) => setCap((p) => ({ ...p, youtube_url: e.target.value }))}
              style={inputStyle}
              placeholder="https://youtube.com/watch?v=..."
            />
          </Field>
          <Field label="Duración (seg)">
            <input
              type="number"
              min={0}
              value={cap.duration_seconds ?? ""}
              onChange={(e) => setCap((p) => ({ ...p, duration_seconds: e.target.value ? Number(e.target.value) : null }))}
              style={{ ...inputStyle, width: "88px", textAlign: "center" }}
              placeholder="—"
            />
          </Field>
          <Field label="XP video">
            <input
              type="number"
              min={0}
              max={1000}
              value={cap.points_reward}
              onChange={(e) => setCap((p) => ({ ...p, points_reward: Number(e.target.value) }))}
              style={{ ...inputStyle, width: "64px", textAlign: "center" }}
            />
          </Field>
        </div>

        {/* Row 4: podcast_url (shown when type = podcast) */}
        {cap.video_type === "podcast" && (
          <Field label="URL del podcast completo (opcional — para botón +30 XP)">
            <input
              type="url"
              value={cap.podcast_url ?? ""}
              onChange={(e) => setCap((p) => ({ ...p, podcast_url: e.target.value || null }))}
              style={inputStyle}
              placeholder="https://open.spotify.com/..."
            />
          </Field>
        )}

        {/* Save capsule */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            style={btnStyle("#000", capChanged ? P.cyan : P.border)}
            onClick={saveCapsule}
            disabled={!capChanged || saving}
          >
            {saving ? "Guardando..." : capChanged ? "💾 Guardar video" : "Sin cambios"}
          </button>
          {msg && <span style={{ fontSize: "11px", color: msg.ok ? P.green : P.red }}>{msg.text}</span>}
        </div>

        {/* ── Quiz questions ─────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: P.cyan, letterSpacing: "0.06em" }}>
              PREGUNTAS DEL QUIZ ({cap.quizzes.length})
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {cap.quizzes
              .sort((a, b) => a.question_order - b.question_order)
              .map((q) => (
                <QuizBlock
                  key={q.id}
                  quiz={q}
                  onSaved={(updated) =>
                    setCap((p) => ({
                      ...p,
                      quizzes: p.quizzes.map((x) => (x.id === updated.id ? updated : x)),
                    }))
                  }
                  onDeleted={(id) =>
                    setCap((p) => ({ ...p, quizzes: p.quizzes.filter((x) => x.id !== id) }))
                  }
                />
              ))}

            <NewQuizForm
              capsuleId={cap.id}
              nextOrder={cap.quizzes.length + 1}
              onCreated={(q) => setCap((p) => ({ ...p, quizzes: [...p.quizzes, q] }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DayAccordion ─────────────────────────────────────────────────────────────

function DayAccordion({ day }: { day: Day }) {
  const [open, setOpen] = useState(day.day_number === 1);

  return (
    <div
      style={{
        borderRadius: "12px",
        border: `1px solid ${P.border}`,
        overflow: "hidden",
        marginBottom: "14px",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,212,255,0.06)",
          border: "none",
          borderBottom: open ? `1px solid ${P.border}` : "none",
          padding: "14px 18px",
          cursor: "pointer",
          color: P.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontFamily: "var(--font-arcade)", fontSize: "12px", color: P.cyan }}>
            DÍA {day.day_number}
          </span>
          <span style={{ fontSize: "12px", color: P.subtle, fontFamily: "var(--font-mono)" }}>
            {day.capsules.length} video{day.capsules.length !== 1 ? "s" : ""} ·{" "}
            {day.capsules.reduce((s, c) => s + c.quizzes.length, 0)} pregunta{day.capsules.reduce((s, c) => s + c.quizzes.length, 0) !== 1 ? "s" : ""}
          </span>
        </div>
        <span style={{ fontSize: "12px", color: P.muted }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "14px 18px", background: P.bg }}>
          {day.capsules.map((c) => (
            <CapsuleEditor key={c.id} capsule={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function ContentAdminClient({ days }: { days: Day[] }) {
  return (
    <div style={{ color: P.text, fontFamily: "var(--font-sans)" }}>
      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontFamily: "var(--font-arcade)",
            fontSize: "18px",
            color: P.cyan,
            letterSpacing: "0.08em",
            marginBottom: "4px",
          }}
        >
          📺 CONTENIDO DE VIDEOS
        </h1>
        <p style={{ fontSize: "13px", color: P.subtle }}>
          Editá URLs, tipos, orientaciones y preguntas del quiz por cada cápsula de video.
          Los cambios se guardan en Supabase de forma inmediata.
        </p>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "18px",
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
          color: P.muted,
        }}
      >
        <span>🎙 Podcast = video tipo podcast (habilita botón +30 XP)</span>
        <span>📹 Normal = video educativo estándar</span>
      </div>

      {/* Day accordions */}
      {days.map((d) => (
        <DayAccordion key={d.day_number} day={d} />
      ))}

      {days.length === 0 && (
        <p style={{ color: P.muted, textAlign: "center", padding: "40px" }}>
          No hay cápsulas de video configuradas aún.
        </p>
      )}
    </div>
  );
}
