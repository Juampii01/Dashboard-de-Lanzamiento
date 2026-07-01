"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface RafagaRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  points_reward: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface RafagaSub {
  id: string;
  rafaga_title: string;
  content_type: string;
  content_text: string | null;
  image_url: string | null;
  points_earned: number;
  full_name: string | null;
  email: string;
}

export function RafagaAdminPanel() {
  const [missions, setMissions] = useState<RafagaRow[]>([]);
  const [subs, setSubs] = useState<RafagaSub[]>([]);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState("120");
  const [points, setPoints] = useState("1000");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch("/api/admin/rafaga")
      .then((r) => r.json())
      .then((data: RafagaRow[]) => setMissions(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/rafaga/submissions")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setSubs(d.submissions ?? []); })
      .catch(() => {});
  }, []);

  async function moderate(id: string, action: "approve" | "reject") {
    setReviewing(id);
    try {
      await fetch("/api/admin/rafaga/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: id, action }),
      });
      setSubs((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error("Error al moderar la respuesta.");
    }
    setReviewing(null);
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/rafaga/image", { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (res.ok && json.url) {
        setImageUrl(json.url);
        toast.success("Imagen lista.");
      } else {
        toast.error(
          json.error === "invalid_image" ? "Formato no válido (JPG, PNG o WEBP)."
          : json.error === "file_too_large" ? "La imagen supera los 8 MB."
          : "Error al subir la imagen."
        );
      }
    } catch {
      toast.error("Error al subir la imagen.");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsAt) return;
    setCreating(true);
    try {
      // Convert local datetime-local value to UTC ISO string
      const localDate = new Date(startsAt);
      const res = await fetch("/api/admin/rafaga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          starts_at: localDate.toISOString(),
          duration_minutes: parseInt(duration, 10) || 120,
          points_reward: parseInt(points, 10) || 1000,
          image_url: imageUrl,
        }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { ok: boolean; id: string; imageSaved?: boolean };
      const newRow: RafagaRow = {
        id: json.id,
        title: title.trim(),
        description: description.trim() || null,
        starts_at: localDate.toISOString(),
        duration_minutes: parseInt(duration, 10) || 120,
        points_reward: parseInt(points, 10) || 1000,
        image_url: imageUrl,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setMissions((prev) => [newRow, ...prev]);
      setTitle("");
      setDescription("");
      setStartsAt("");
      setDuration("120");
      setPoints("1000");
      setImageUrl(null);
      if (imageUrl && json.imageSaved === false) {
        toast("Misión creada, pero la imagen no se guardó — falta correr la migración en Supabase.", { duration: 6000 });
      } else {
        toast.success("Misión ráfaga creada.");
      }
    } catch {
      toast.error("Error al crear misión ráfaga.");
    }
    setCreating(false);
  }

  function isoToLocalInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startEdit(m: RafagaRow) {
    setEditingId(m.id);
    setTitle(m.title);
    setDescription(m.description ?? "");
    setStartsAt(isoToLocalInput(m.starts_at));
    setDuration(String(m.duration_minutes));
    setPoints(String(m.points_reward));
    setImageUrl(m.image_url ?? null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle(""); setDescription(""); setStartsAt(""); setDuration("120"); setPoints("1000"); setImageUrl(null);
  }

  async function update(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !title.trim() || !startsAt) return;
    setCreating(true);
    try {
      const localDate = new Date(startsAt);
      const res = await fetch("/api/admin/rafaga", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          title: title.trim(),
          description: description.trim() || null,
          starts_at: localDate.toISOString(),
          duration_minutes: parseInt(duration, 10) || 120,
          points_reward: parseInt(points, 10) || 1000,
          image_url: imageUrl,
        }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { ok: boolean; imageSaved?: boolean };
      const editedId = editingId;
      setMissions((prev) => prev.map((m) => (m.id === editedId ? {
        ...m,
        title: title.trim(),
        description: description.trim() || null,
        starts_at: localDate.toISOString(),
        duration_minutes: parseInt(duration, 10) || 120,
        points_reward: parseInt(points, 10) || 1000,
        image_url: imageUrl,
        is_active: true,
      } : m)));
      cancelEdit();
      if (imageUrl && json.imageSaved === false) {
        toast("Cambios guardados, pero la imagen no se guardó — falta correr la migración.", { duration: 6000 });
      } else {
        toast.success("Misión actualizada.");
      }
    } catch {
      toast.error("Error al guardar los cambios.");
    }
    setCreating(false);
  }

  async function deactivate(id: string) {
    setDeactivating(id);
    try {
      const res = await fetch("/api/admin/rafaga", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, is_active: false } : m)));
      toast.success("Misión desactivada.");
    } catch {
      toast.error("Error al desactivar misión.");
    }
    setDeactivating(null);
  }

  function getMissionStatus(m: RafagaRow): "upcoming" | "active" | "expired" {
    const now = Date.now();
    const start = new Date(m.starts_at).getTime();
    const end = start + m.duration_minutes * 60 * 1000;
    if (now < start) return "upcoming";
    if (now <= end) return "active";
    return "expired";
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--background)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--foreground)",
    fontSize: 14,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "var(--font-sans)",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--muted-foreground)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 5,
    display: "block",
  };

  return (
    <div className="space-y-5">
      {/* Create / edit form */}
      <form ref={formRef} onSubmit={editingId ? update : create} className="space-y-3">
        {editingId && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderRadius: 8, background: "color-mix(in srgb, var(--primary) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary)" }}>✏️ Editando misión</span>
            <button type="button" onClick={cancelEdit} style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          </div>
        )}
        <div>
          <label style={labelStyle}>Título</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="Ej: Ráfaga del Día 2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Descripción / instrucciones</label>
          <textarea
            style={{ ...inputStyle, resize: "vertical", minHeight: 96, lineHeight: 1.5 }}
            placeholder="Explicá qué tienen que hacer los participantes durante la ventana de la ráfaga. Podés escribir varias líneas."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>Imagen (opcional)</label>
          {imageUrl ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" style={{ maxHeight: 150, maxWidth: "100%", borderRadius: 8, display: "block", border: "1px solid var(--border)" }} />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                style={{ marginTop: 6, background: "transparent", border: "none", color: "var(--destructive)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}
              >
                Quitar imagen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ ...inputStyle, width: "auto", cursor: uploading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)" }}
            >
              {uploading ? "Subiendo…" : "📷 Elegir imagen (JPG, PNG, WEBP · máx 8 MB)"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImagePick} />
          <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", margin: "5px 0 0" }}>
            Se muestra en la tarjeta de la ráfaga que ven los participantes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label style={labelStyle}>Fecha y hora de inicio</label>
            <input
              style={inputStyle}
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Duración (min)</label>
            <input
              style={inputStyle}
              type="number"
              min={5}
              max={720}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Puntos que otorga</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              max={100000}
              step={50}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>
        </div>

        <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", margin: 0 }}>
          Se usa tu hora local (se convierte a UTC). Nada se muestra hasta que empiece la ventana.
        </p>

        <Button type="submit" disabled={creating || !title.trim() || !startsAt} className="w-full">
          {creating
            ? (editingId ? "Guardando..." : "Creando...")
            : editingId
            ? "Guardar cambios"
            : `Crear misión ráfaga +${(parseInt(points, 10) || 1000).toLocaleString("es")} pts`}
        </Button>
        {editingId && (
          <Button type="button" variant="outline" onClick={cancelEdit} className="w-full">
            Cancelar edición
          </Button>
        )}
      </form>

      {/* List */}
      {missions.length > 0 && (
        <div className="space-y-2" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Misiones creadas</p>
          {missions.map((m) => {
            const status = !m.is_active ? "inactive" : getMissionStatus(m);
            const statusLabel =
              status === "inactive"
                ? "🚫 Desactivada"
                : status === "active"
                ? "⚡ Activa"
                : status === "upcoming"
                ? "⏳ Programada"
                : "🔒 Expirada";
            const statusColor =
              status === "inactive"
                ? "#E07A5F"
                : status === "active"
                ? "#FFD700"
                : status === "upcoming"
                ? "#8DA2C4"
                : "#647FA8";
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 p-3 border rounded-xl bg-card"
                style={{ borderColor: "var(--border)", opacity: !m.is_active ? 0.5 : 1 }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{m.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(m.starts_at).toLocaleString("es-US", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                    {m.duration_minutes} min · +{m.points_reward.toLocaleString("es")} pts
                  </p>
                </div>
                <span className="text-[10px] font-bold shrink-0" style={{ color: statusColor }}>
                  {statusLabel}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(m)}
                  className="text-xs shrink-0"
                >
                  Editar
                </Button>
                {m.is_active && status !== "expired" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deactivating === m.id}
                    onClick={() => deactivate(m.id)}
                    className="text-xs shrink-0"
                  >
                    {deactivating === m.id ? "..." : "Desactivar"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Respuestas de ráfaga pendientes de revisar */}
      {subs.length > 0 && (
        <div className="space-y-2" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Respuestas de ráfaga pendientes · {subs.length}
          </p>
          <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", margin: 0 }}>
            Aceptar = queda cumplida. Rechazar = descuenta los puntos y la persona puede reintentar.
          </p>
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
                  <p style={{ fontSize: 10.5, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: "1px 0 0" }}>
                    {s.rafaga_title} · +{s.points_earned.toLocaleString("es")} pts
                  </p>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => moderate(s.id, "approve")} disabled={reviewing === s.id}
                      style={{ flex: 1, padding: "5px", borderRadius: 6, border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)", background: "transparent", color: "var(--success)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                      {reviewing === s.id ? "..." : "Aceptar"}
                    </button>
                    <button onClick={() => moderate(s.id, "reject")} disabled={reviewing === s.id}
                      style={{ flex: 1, padding: "5px", borderRadius: 6, border: "1px solid color-mix(in srgb, var(--destructive) 40%, transparent)", background: "transparent", color: "var(--destructive)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                      {reviewing === s.id ? "..." : "Rechazar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
