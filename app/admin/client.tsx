"use client";

import { useState, useEffect } from "react";

function UserResetButton({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "loading" | "done">("idle");

  const handleReset = async () => {
    setPhase("loading");
    await fetch("/api/admin/reset-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId }),
    });
    setPhase("done");
    setTimeout(() => setPhase("idle"), 2000);
  };

  if (phase === "confirm")
    return (
      <span className="flex gap-1">
        <button
          onClick={handleReset}
          className="text-[10px] text-red-400 border border-red-400/40 px-1.5 py-0.5 rounded"
        >
          Sí
        </button>
        <button
          onClick={() => setPhase("idle")}
          className="text-[10px] text-gray-400 border border-gray-600 px-1.5 py-0.5 rounded"
        >
          No
        </button>
      </span>
    );
  if (phase === "loading") return <span className="text-[10px] text-gray-400">...</span>;
  if (phase === "done") return <span className="text-[10px] text-green-400">✓</span>;

  return (
    <button
      onClick={() => setPhase("confirm")}
      className="text-[10px] text-red-400/70 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 px-1.5 py-0.5 rounded transition-colors"
      title={`Reset ${userEmail}`}
    >
      ↺
    </button>
  );
}
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle2, Trophy, Users, UserPlus, Radio, Lock, Unlock, CalendarClock, Key, Zap, Trash2, Mail } from "lucide-react";
import { MagicBlastPanel } from "@/components/magic-blast-panel";
import Link from "next/link";
import { isExpired } from "@/lib/utils";

interface AdminToggle {
  day_number: number;
  is_globally_unlocked: boolean;
  unlocked_at: string | null;
  scheduled_unlock_at: string | null;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  total_points: number;
  access_expires_at: string | null;
  last_seen_at: string | null;
}

interface Progress {
  user_id: string;
  day_number: number;
  is_completed: boolean;
  is_unlocked: boolean;
}

interface Sorteo {
  user_id: string;
  eligible: boolean;
  submitted_at: string | null;
}

const DAY_LABELS: Record<number, string> = {
  0: "Inicio — Dashboard",
  1: "Día 1 — Perfil Estratégico",
  2: "Día 2 — Mapa de Códigos",
  3: "Día 3 — Web + Portales",
  4: "Día 4 — Capability Statement",
};

// ---------------------------------------------------------------------------
// Dashboard Lock state
// ---------------------------------------------------------------------------
interface LockState {
  is_locked: boolean;
  call_url: string | null;
  message: string | null;
  locked_at: string | null;
}

const DEFAULT_MESSAGE = "La llamada en vivo está en curso. Volvé cuando termine.";

function DashboardLockControl() {
  const [lock, setLock] = useState<LockState>({
    is_locked: false,
    call_url: null,
    message: null,
    locked_at: null,
  });
  const [callUrlInput, setCallUrlInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    fetch("/api/admin/dashboard-lock")
      .then((r) => r.json())
      .then((data: LockState) => {
        setLock(data);
        setCallUrlInput(data.call_url ?? "");
        setMessageInput(data.message ?? "");
        setFetched(true);
      })
      .catch(() => setFetched(true));
  }, []);

  async function toggle(newLocked: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lock: newLocked,
          call_url: callUrlInput.trim() || null,
          message: messageInput.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.state) {
        setLock(data.state);
        toast.success(newLocked ? "Dashboard bloqueado. Los usuarios ven el overlay." : "Dashboard desbloqueado. Los usuarios recuperan acceso.");
      }
    } catch {
      toast.error("Error al cambiar estado de bloqueo.");
    } finally {
      setLoading(false);
    }
  }

  if (!fetched) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-6">
        <Radio className="w-4 h-4 animate-pulse" />
        Cargando estado...
      </div>
    );
  }

  const displayMessage = messageInput.trim() || DEFAULT_MESSAGE;

  return (
    <div className="space-y-5">

      {/* ── Status indicator bar ── */}
      <div
        className="flex items-center justify-between rounded-xl px-5 py-4 transition-all duration-500"
        style={
          lock.is_locked
            ? {
                background: "linear-gradient(135deg, rgba(215,38,61,0.15) 0%, rgba(161,29,46,0.08) 100%)",
                border: "1.5px solid rgba(215,38,61,0.5)",
                boxShadow: "0 0 24px rgba(215,38,61,0.12)",
              }
            : {
                background: "rgba(0,214,122,0.04)",
                border: "1.5px solid rgba(0,214,122,0.2)",
              }
        }
      >
        <div className="flex items-center gap-3">
          {lock.is_locked ? (
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: "40px",
                height: "40px",
                background: "rgba(215,38,61,0.2)",
                border: "1px solid rgba(215,38,61,0.4)",
              }}
            >
              <Radio className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: "40px",
                height: "40px",
                background: "rgba(0,214,122,0.1)",
                border: "1px solid rgba(0,214,122,0.3)",
              }}
            >
              <Unlock className="w-4 h-4" style={{ color: "#00D67A" }} />
            </div>
          )}
          <div>
            {lock.is_locked ? (
              <>
                <p className="font-bold text-sm text-red-400">DASHBOARD BLOQUEADO</p>
                <p className="text-xs text-muted-foreground">
                  Los usuarios ven el overlay de llamada en vivo
                  {lock.locked_at && (
                    <> · Desde las {new Date(lock.locked_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</>
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-sm" style={{ color: "#00D67A" }}>Dashboard abierto</p>
                <p className="text-xs text-muted-foreground">Los usuarios navegan normalmente</p>
              </>
            )}
          </div>
        </div>

        <span
          className="text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0"
          style={
            lock.is_locked
              ? { background: "rgba(215,38,61,0.2)", color: "#D7263D", border: "1px solid rgba(215,38,61,0.3)" }
              : { background: "rgba(0,214,122,0.12)", color: "#00D67A", border: "1px solid rgba(0,214,122,0.25)" }
          }
        >
          {lock.is_locked ? "🔴 LIVE" : "🟢 LIBRE"}
        </span>
      </div>

      {/* ── Config fields ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            URL de la llamada
          </label>
          <input
            type="url"
            placeholder="https://zoom.us/j/..."
            value={callUrlInput}
            onChange={(e) => setCallUrlInput(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-colors"
            style={{ borderColor: "#1E3A5C" }}
          />
          <p className="text-[11px] text-muted-foreground">
            Aparece como botón "Ir a la llamada" en el overlay.
          </p>
        </div>

        {/* Mensaje */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Mensaje para los usuarios
          </label>
          <input
            type="text"
            placeholder={DEFAULT_MESSAGE}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-colors"
            style={{ borderColor: "#1E3A5C" }}
          />
          <p className="text-[11px] text-muted-foreground">
            Vacío = mensaje por defecto.
          </p>
        </div>
      </div>

      {/* ── Preview miniatura ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #1E3A5C" }}
      >
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: "#0F1E30", borderBottom: "1px solid #1E3A5C" }}>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Preview del overlay</span>
          <span className="text-[10px] text-muted-foreground/50">· lo que ven los usuarios</span>
        </div>
        <div
          className="flex flex-col items-center justify-center py-8 px-4 text-center gap-3"
          style={{ background: "linear-gradient(160deg, #060D1A 0%, #0A1828 100%)" }}
        >
          {/* Mini live badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: "rgba(215,38,61,0.15)", border: "1px solid rgba(215,38,61,0.35)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            <span className="text-[9px] font-bold text-red-400 tracking-widest">TRANSMISIÓN EN VIVO</span>
          </div>
          <p className="text-xs font-bold text-white" style={{ fontFamily: "var(--font-arcade)", letterSpacing: "0.04em", textShadow: "0 0 20px rgba(215,38,61,0.4)" }}>
            LLAMADA EN VIVO
          </p>
          <p className="text-[11px] max-w-xs" style={{ color: "#7A8BA0" }}>{displayMessage}</p>
          {callUrlInput && (
            <div
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#D7263D,#A11D2E)", boxShadow: "0 4px 16px rgba(215,38,61,0.4)" }}
            >
              📞 Ir a la llamada ↗
            </div>
          )}
        </div>
      </div>

      {/* ── Action button ── */}
      <div className="flex items-center gap-3 pt-1">
        {lock.is_locked ? (
          <button
            onClick={() => toggle(false)}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "#0A2540",
              color: "#00D67A",
              border: "2px solid #00D67A",
              boxShadow: "0 0 20px rgba(0,214,122,0.15)",
            }}
          >
            <Unlock className="w-4 h-4" />
            {loading ? "Desbloqueando..." : "Desbloquear — terminar llamada"}
          </button>
        ) : (
          <button
            onClick={() => toggle(true)}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #D7263D 0%, #A11D2E 100%)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 4px 20px rgba(215,38,61,0.35)",
            }}
          >
            <Lock className="w-4 h-4" />
            {loading ? "Bloqueando..." : "Bloquear — iniciar llamada"}
          </button>
        )}

        <p className="text-[11px] text-muted-foreground leading-tight max-w-[220px]">
          Los usuarios detectan el cambio en <strong>hasta 20 segundos</strong> automáticamente.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Programación de lanzamiento (fecha y hora por día)
// ---------------------------------------------------------------------------

/** ISO (UTC) → valor para <input type="datetime-local"> en hora LOCAL del admin. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LaunchScheduleControl({ initialToggles }: { initialToggles: AdminToggle[] }) {
  const days = [0, 1, 2, 3, 4];
  const byDay = Object.fromEntries(initialToggles.map((t) => [t.day_number, t]));

  // Estado de inputs por día (hora local del admin).
  const [inputs, setInputs] = useState<Record<number, string>>(() =>
    Object.fromEntries(days.map((d) => [d, isoToLocalInput(byDay[d]?.scheduled_unlock_at ?? null)]))
  );
  const [savedIso, setSavedIso] = useState<Record<number, string | null>>(() =>
    Object.fromEntries(days.map((d) => [d, byDay[d]?.scheduled_unlock_at ?? null]))
  );
  const [savingDay, setSavingDay] = useState<number | null>(null);

  // Zona horaria del admin, para que sepa en qué hora está escribiendo.
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  async function save(day: number) {
    setSavingDay(day);
    const raw = inputs[day]?.trim();
    const unlock_at = raw ? new Date(raw).toISOString() : null;
    try {
      const res = await fetch("/api/admin/launch-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_number: day, unlock_at }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "error");
      const { row } = await res.json();
      setSavedIso((prev) => ({ ...prev, [day]: row?.scheduled_unlock_at ?? null }));
      const lbl = day === 0 ? "Inicio" : `Día ${day}`;
      toast.success(
        unlock_at
          ? `${lbl}: el contador marca el ${new Date(unlock_at).toLocaleString()}`
          : `${lbl}: sin fecha (usa el valor por defecto).`
      );
    } catch {
      toast.error("No se pudo guardar la fecha. Reintentá.");
    }
    setSavingDay(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Definí la hora que muestra el <strong>contador</strong> de cada día/Inicio (la hora de la clase).
        Es <strong>solo visual</strong>: el día NO se abre solo al llegar a 0 — lo desbloqueás vos abajo en
        “Desbloqueo Manual”. Escribís en <strong>tu hora local{tz ? ` (${tz})` : ""}</strong> y cada usuario
        ve el contador en su propia hora local. Vaciar el campo deja la hora por defecto.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {days.map((day) => {
          const iso = savedIso[day];
          const isPast = iso ? Date.parse(iso) <= Date.now() : false;
          const dirty = isoToLocalInput(iso ?? null) !== (inputs[day] ?? "");
          return (
            <div key={day} className="p-4 border rounded-xl bg-card space-y-2" style={{ borderColor: "#1E3A5C" }}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{DAY_LABELS[day]}</p>
                {iso && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={
                      isPast
                        ? { background: "rgba(0,214,122,0.12)", color: "#00D67A" }
                        : { background: "rgba(215,38,61,0.15)", color: "#D7263D" }
                    }
                  >
                    {isPast ? "ABIERTO" : "PROGRAMADO"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={inputs[day] ?? ""}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [day]: e.target.value }))}
                  disabled={savingDay === day}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  style={{ borderColor: "#1E3A5C" }}
                />
                <Button size="sm" onClick={() => save(day)} disabled={savingDay === day || !dirty}>
                  {savingDay === day ? "..." : "Guardar"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {iso
                  ? `Se desbloquea: ${new Date(iso).toLocaleString()}`
                  : "Sin fecha personalizada (usa el valor por defecto)."}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── KeywordsAdminPanel ─────────────────────────────────────────────────────

interface KeywordRow { day_number: number; keyword?: string; updated_at?: string; }

function KeywordsAdminPanel() {
  const [rows, setRows] = useState<KeywordRow[]>([]);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/keywords")
      .then((r) => r.json())
      .then((data: KeywordRow[]) => {
        setRows(data);
        const init: Record<number, string> = {};
        data.forEach((r) => { if (r.keyword) init[r.day_number] = r.keyword; });
        setInputs(init);
      })
      .catch(() => {});
  }, []);

  async function save(day: number) {
    const keyword = (inputs[day] ?? "").trim();
    if (!keyword) return;
    setSaving(day);
    try {
      const res = await fetch("/api/admin/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_number: day, keyword }),
      });
      if (!res.ok) throw new Error();
      setRows((prev) => {
        const existing = prev.find((r) => r.day_number === day);
        if (existing) return prev.map((r) => r.day_number === day ? { ...r, keyword } : r);
        return [...prev, { day_number: day, keyword }];
      });
      toast.success(`Keyword del Día ${day} guardada.`);
    } catch {
      toast.error("Error al guardar keyword.");
    }
    setSaving(null);
  }

  async function remove(day: number) {
    setSaving(day);
    try {
      const res = await fetch("/api/admin/keywords", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_number: day }),
      });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.day_number !== day));
      setInputs((prev) => ({ ...prev, [day]: "" }));
      toast.success(`Keyword del Día ${day} eliminada.`);
    } catch {
      toast.error("Error al eliminar keyword.");
    }
    setSaving(null);
  }

  const existing = Object.fromEntries(rows.map((r) => [r.day_number, r.keyword]));

  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((day) => (
        <div key={day} className="flex items-center gap-3 p-3 border rounded-xl bg-card" style={{ borderColor: "#1E3A5C" }}>
          <span className="text-xs font-bold text-muted-foreground w-12 shrink-0">Día {day}</span>
          <input
            type="text"
            placeholder={existing[day] ? `Actual: ${existing[day]}` : "Ingresá la keyword secreta..."}
            value={inputs[day] ?? ""}
            onChange={(e) => setInputs((prev) => ({ ...prev, [day]: e.target.value }))}
            disabled={saving === day}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            style={{ borderColor: "#1E3A5C" }}
          />
          <Button size="sm" onClick={() => save(day)} disabled={saving === day || !(inputs[day] ?? "").trim()}>
            {saving === day ? "..." : existing[day] ? "Actualizar" : "Guardar"}
          </Button>
          {existing[day] && (
            <>
              <span className="text-[10px] font-bold text-green-500 shrink-0">✓</span>
              <button
                onClick={() => remove(day)}
                disabled={saving === day}
                title={`Eliminar keyword del Día ${day}`}
                aria-label={`Eliminar keyword del Día ${day}`}
                className="shrink-0 p-2 rounded-lg transition-colors hover:bg-destructive/10 disabled:opacity-50"
                style={{ color: "var(--destructive)" }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── RafagaAdminPanel ────────────────────────────────────────────────────────

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

function RafagaAdminPanel() {
  const [missions, setMissions] = useState<RafagaRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState("120");
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
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json() as { ok: boolean; id: string };
      const newRow: RafagaRow = {
        id: json.id,
        title: title.trim(),
        description: description.trim() || null,
        starts_at: localDate.toISOString(),
        duration_minutes: parseInt(duration, 10) || 120,
        points_reward: 1000,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setMissions((prev) => [newRow, ...prev]);
      setTitle(""); setDescription(""); setStartsAt(""); setDuration("120");
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
      setMissions((prev) => prev.map((m) => m.id === id ? { ...m, is_active: false } : m));
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

  return (
    <div className="space-y-5">
      {/* Create form */}
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</label>
          <input
            type="text" placeholder="Ej: Ráfaga del Día 2" value={title}
            onChange={(e) => setTitle(e.target.value)} required
            className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            style={{ borderColor: "#1E3A5C" }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción (opcional)</label>
          <input
            type="text" placeholder="Instrucciones para los participantes" value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ borderColor: "#1E3A5C" }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha y hora de inicio</label>
          <input
            type="datetime-local" value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)} required
            className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ borderColor: "#1E3A5C" }}
          />
          <p className="text-[11px] text-muted-foreground">Se usa tu hora local (se convierte a UTC).</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duración (minutos)</label>
          <input
            type="number" min={5} max={720} value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ borderColor: "#1E3A5C" }}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={creating || !title.trim() || !startsAt} className="w-full">
            {creating ? "Creando..." : "Crear misión ráfaga +1,000 pts"}
          </Button>
        </div>
      </form>

      {/* List */}
      {missions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Misiones creadas</p>
          {missions.map((m) => {
            const status = !m.is_active ? "inactive" : getMissionStatus(m);
            const statusLabel = status === "inactive" ? "🚫 Desactivada" : status === "active" ? "⚡ Activa" : status === "upcoming" ? "⏳ Programada" : "🔒 Expirada";
            const statusColor = status === "inactive" ? "#E07A5F" : status === "active" ? "#FFD700" : status === "upcoming" ? "#8DA2C4" : "#647FA8";
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 p-3 border rounded-xl bg-card" style={{ borderColor: "#1E3A5C", opacity: !m.is_active ? 0.5 : 1 }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{m.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(m.starts_at).toLocaleString("es-US", { dateStyle: "short", timeStyle: "short" })} · {m.duration_minutes} min
                  </p>
                </div>
                <span className="text-[10px] font-bold shrink-0" style={{ color: statusColor }}>{statusLabel}</span>
                {m.is_active && status !== "expired" && (
                  <Button
                    variant="outline" size="sm"
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

// ---------------------------------------------------------------------------

interface AdminClientProps {
  initialToggles: AdminToggle[];
  users: User[];
  allProgress: Progress[];
  sorteos: Sorteo[];
}

export function AdminClient({ initialToggles, users, allProgress, sorteos }: AdminClientProps) {
  const [toggles, setToggles] = useState(initialToggles);
  const [updatingDay, setUpdatingDay] = useState<number | null>(null);
  const [overrideLoading, setOverrideLoading] = useState<string | null>(null);

  const progressByUser = allProgress.reduce<Record<string, Progress[]>>((acc, p) => {
    if (!acc[p.user_id]) acc[p.user_id] = [];
    acc[p.user_id].push(p);
    return acc;
  }, {});

  const sorteoMap = Object.fromEntries(sorteos.map((s) => [s.user_id, s]));

  // Métricas de ingreso al dashboard
  const totalUsers = users.length;
  const enteredCount = users.filter((u) => !!u.last_seen_at).length;
  const todayStr = new Date().toDateString();
  const activeTodayCount = users.filter(
    (u) => u.last_seen_at && new Date(u.last_seen_at).toDateString() === todayStr
  ).length;
  const enteredPct = totalUsers > 0 ? Math.round((enteredCount / totalUsers) * 100) : 0;

  async function toggleDay(dayNumber: number, value: boolean) {
    setUpdatingDay(dayNumber);
    try {
      const res = await fetch("/api/admin/day-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_number: dayNumber, value }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "error");
      setToggles((prev) =>
        prev.map((t) =>
          t.day_number === dayNumber
            ? { ...t, is_globally_unlocked: value, unlocked_at: value ? new Date().toISOString() : null }
            : t
        )
      );
      const lbl = dayNumber === 0 ? "Inicio" : `Día ${dayNumber}`;
      toast.success(value ? `${lbl} desbloqueado para todos.` : `${lbl} bloqueado.`);
    } catch {
      toast.error("Error al actualizar. Recargá la página.");
    }
    setUpdatingDay(null);
  }

  async function overrideUserDay(userId: string, dayNumber: number, unlock: boolean) {
    const key = `${userId}-${dayNumber}`;
    setOverrideLoading(key);
    try {
      const res = await fetch("/api/admin/day-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, day_number: dayNumber, unlock }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "error");
      toast.success(`Día ${dayNumber} ${unlock ? "desbloqueado" : "bloqueado"} para el usuario.`);
    } catch {
      toast.error("Error al aplicar override.");
    }
    setOverrideLoading(null);
  }

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Panel de Administración</h1>
          <p className="text-muted-foreground mt-1">
            Controlá los días del challenge en vivo y monitoreá el progreso de los alumnos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/contenido"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1E3A5C] text-[#00D4FF] text-sm font-semibold hover:bg-[rgba(0,212,255,0.1)] transition-colors shrink-0"
          >
            📺 Contenido
          </Link>
          <Link
            href="/admin/usuarios/nuevo"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Crear usuario
          </Link>
        </div>
      </div>

      {/* Acceso por Magic Link (envío masivo) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#00D4FF]" />
            Acceso por Magic Link
          </CardTitle>
          <CardDescription>
            Enviá a los usuarios el link de acceso directo al dashboard (sin contraseña). Probá con tu email antes de enviar a todos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MagicBlastPanel />
        </CardContent>
      </Card>

      {/* Métricas de ingreso */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-primary">{totalUsers}</p>
            <p className="text-sm text-muted-foreground mt-1">Usuarios con acceso</p>
          </CardContent>
        </Card>
        <Card style={{ borderColor: "color-mix(in srgb, var(--success) 40%, var(--border))" }}>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold" style={{ color: "var(--success)" }}>
              {enteredCount}
              <span className="text-base font-medium text-muted-foreground"> / {totalUsers}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ingresaron al dashboard <span className="font-semibold">({enteredPct}%)</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-primary">{activeTodayCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Activos hoy</p>
          </CardContent>
        </Card>
      </div>

      {/* Secciones propias: misiones y referidos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/misiones">
          <Card className="hover:border-[var(--secondary)] transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">📸 Misiones Diarias</span>
                <span className="text-sm text-muted-foreground font-normal">Ir →</span>
              </CardTitle>
              <CardDescription>
                Publicá y moderá la misión del día en su sección propia. Los participantes responden con captura, link o texto.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/referidos">
          <Card className="hover:border-[var(--secondary)] transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">🤝 Referidos</span>
                <span className="text-sm text-muted-foreground font-normal">Ir →</span>
              </CardTitle>
              <CardDescription>
                Mirá quién refirió a quién, qué referidos ya pagaron y los puntos acreditados a cada referidor.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Palabras Clave de Llamadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#FFD700]" />
            Palabras Clave de Llamadas
          </CardTitle>
          <CardDescription>
            Configurá la keyword secreta de cada día de llamada. Los participantes la ingresan en Misiones Extra para ganar +1,000 pts. Solo puede haber una keyword por día.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KeywordsAdminPanel />
        </CardContent>
      </Card>

      {/* Misiones Ráfaga */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FFD700]" />
            Misiones Ráfaga
          </CardTitle>
          <CardDescription>
            Programá misiones de ventana corta (defecto 2 horas). Los participantes las ven en Misiones Extra y pueden reclamar +1,000 pts durante la ventana. Nada se muestra hasta que empiece.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RafagaAdminPanel />
        </CardContent>
      </Card>

      {/* Bloqueo de dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#D7263D]" />
            Bloqueo de Dashboard — Llamada en Vivo
          </CardTitle>
          <CardDescription>
            Cuando está bloqueado, los usuarios ven un overlay a pantalla completa y no pueden interactuar con el dashboard.
            El overlay desaparece automáticamente (en hasta 20 segundos) cuando desbloqueás.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardLockControl />
        </CardContent>
      </Card>

      {/* Programación de lanzamiento (fecha y hora por día) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-[#00D4FF]" />
            Hora del Contador (Inicio + Días)
          </CardTitle>
          <CardDescription>
            Hora que marca el contador de cada día/Inicio (cosmético: la hora de la clase, 7pm Miami). El
            desbloqueo real es <strong>manual</strong>, desde “Desbloqueo Manual” más abajo. Cada usuario ve el
            contador en su hora local.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LaunchScheduleControl initialToggles={toggles} />
        </CardContent>
      </Card>

      {/* Toggles globales */}
      <Card>
        <CardHeader>
          <CardTitle>Desbloqueo Manual (Inicio + Días)</CardTitle>
          <CardDescription>
            Activá el switch para abrir el Inicio o un día para TODOS los usuarios al instante (podés abrirlo
            antes o después de la hora del contador). Tras cada clase, abrí el día acá. A los admins nunca se les bloquea.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {toggles.map((toggle) => (
              <div
                key={toggle.day_number}
                className="flex items-center justify-between p-4 border rounded-xl bg-card"
              >
                <div>
                  <p className="font-semibold text-sm">{DAY_LABELS[toggle.day_number]}</p>
                  {toggle.unlocked_at && toggle.is_globally_unlocked && (
                    <p className="text-xs text-muted-foreground">
                      Abierto: {new Date(toggle.unlocked_at).toLocaleString("es-US")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      toggle.is_globally_unlocked
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }
                  >
                    {toggle.is_globally_unlocked ? "Abierto" : "Cerrado"}
                  </Badge>
                  <Switch
                    checked={toggle.is_globally_unlocked}
                    onCheckedChange={(val) => toggleDay(toggle.day_number, val)}
                    disabled={updatingDay === toggle.day_number}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Progreso Global de Alumnos
          </CardTitle>
          <CardDescription>
            {users.length} usuarios registrados.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead className="text-center">D1</TableHead>
                <TableHead className="text-center">D2</TableHead>
                <TableHead className="text-center">D3</TableHead>
                <TableHead className="text-center">D4</TableHead>
                <TableHead className="text-center">Puntos</TableHead>
                <TableHead className="text-center">Sorteo</TableHead>
                <TableHead className="text-center">Acceso</TableHead>
                <TableHead className="text-center">Override</TableHead>
                <TableHead className="text-center">Reset</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const userProgress = progressByUser[user.id] ?? [];
                const sorteo = sorteoMap[user.id];
                const expired = isExpired(user.access_expires_at);
                const completedCount = userProgress.filter((p) => p.is_completed).length;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{user.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    {[1, 2, 3, 4].map((day) => {
                      const p = userProgress.find((pr) => pr.day_number === day);
                      return (
                        <TableCell key={day} className="text-center">
                          {p?.is_completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-medium">
                      {user.total_points}
                    </TableCell>
                    <TableCell className="text-center">
                      {sorteo?.eligible ? (
                        <Trophy className="w-4 h-4 text-amber-500 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={
                          expired
                            ? "bg-red-100 text-red-700 text-xs"
                            : "bg-green-100 text-green-700 text-xs"
                        }
                      >
                        {expired ? "Expirado" : "Activo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4].map((day) => {
                          const p = userProgress.find((pr) => pr.day_number === day);
                          const key = `${user.id}-${day}`;
                          return (
                            <Button
                              key={day}
                              variant="outline"
                              size="sm"
                              className="h-6 w-7 p-0 text-xs"
                              disabled={overrideLoading === key}
                              onClick={() => overrideUserDay(user.id, day, !(p?.is_unlocked))}
                              title={`${p?.is_unlocked ? "Bloquear" : "Desbloquear"} Día ${day}`}
                            >
                              {day}
                            </Button>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <UserResetButton userId={user.id} userEmail={user.email} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((day) => {
          const completed = allProgress.filter(
            (p) => p.day_number === day && p.is_completed
          ).length;
          return (
            <Card key={day} className="text-center">
              <CardContent className="pt-6">
                <p className="text-3xl font-bold text-primary">{completed}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Completaron Día {day}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
