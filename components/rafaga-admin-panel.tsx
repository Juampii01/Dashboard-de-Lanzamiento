"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface RafagaRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  points_reward: number;
  is_active: boolean;
  created_at: string;
}

export function RafagaAdminPanel() {
  const [missions, setMissions] = useState<RafagaRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState("120");
  const [points, setPoints] = useState("1000");
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/rafaga")
      .then((r) => r.json())
      .then((data: RafagaRow[]) => setMissions(data))
      .catch(() => {});
  }, []);

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
        }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { ok: boolean; id: string };
      const newRow: RafagaRow = {
        id: json.id,
        title: title.trim(),
        description: description.trim() || null,
        starts_at: localDate.toISOString(),
        duration_minutes: parseInt(duration, 10) || 120,
        points_reward: parseInt(points, 10) || 1000,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setMissions((prev) => [newRow, ...prev]);
      setTitle("");
      setDescription("");
      setStartsAt("");
      setDuration("120");
      setPoints("1000");
      toast.success("Misión ráfaga creada.");
    } catch {
      toast.error("Error al crear misión ráfaga.");
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
      {/* Create form */}
      <form onSubmit={create} className="space-y-3">
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
            ? "Creando..."
            : `Crear misión ráfaga +${(parseInt(points, 10) || 1000).toLocaleString("es")} pts`}
        </Button>
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
    </div>
  );
}
