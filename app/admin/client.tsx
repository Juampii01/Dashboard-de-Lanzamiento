"use client";

import { useState, useEffect } from "react";
import { CLASS_LINKS } from "@/lib/class-links";

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
import { CheckCircle2, Trophy, Users, UserPlus, Radio, Lock, Unlock, CalendarClock, Key, Trash2, Mail, Video, MessageCircle } from "lucide-react";
import { MagicBlastPanel } from "@/components/magic-blast-panel";
import { ReminderBlastPanel } from "@/components/reminder-blast-panel";
import { WebReportsAdminPanel } from "@/components/web-reports-admin-panel";
import { ProximoPasoClicksPanel } from "@/components/proximo-paso-clicks-panel";
import { MentoriaBlastPanel } from "@/components/mentoria-blast-panel";
import { breakdownRows, type Breakdown } from "@/lib/points-breakdown";
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
  is_admin?: boolean;
  is_student?: boolean;
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
  5: "Tu Próximo Paso",
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

// Tarjeta "Conectados ahora" — refresca sola cada 20s (cuenta /api/admin/online-count).
function OnlineNowCard() {
  const [online, setOnline] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/online-count", { cache: "no-store" });
        const d = await res.json();
        if (alive && res.ok) setOnline(d.online ?? 0);
      } catch { /* noop */ }
    }
    load();
    const id = setInterval(load, 20_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return (
    <Card style={{ borderColor: "color-mix(in srgb, var(--success) 55%, var(--border))" }}>
      <CardContent className="pt-6">
        <p className="text-3xl font-bold flex items-center gap-2" style={{ color: "var(--success)" }}>
          <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
          {online === null ? "…" : online}
        </p>
        <p className="text-sm text-muted-foreground mt-1">Conectados ahora <span className="opacity-60">· en vivo</span></p>
      </CardContent>
    </Card>
  );
}

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
          {/* Quick-set: rellena el campo de arriba con el link de Zoom de cada día */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Links por día:
            </span>
            {[1, 2, 3, 4].map((d) => {
              const active = callUrlInput.trim() === CLASS_LINKS[d];
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setCallUrlInput(CLASS_LINKS[d])}
                  disabled={loading}
                  title={CLASS_LINKS[d]}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50"
                  style={
                    active
                      ? { background: "rgba(0,114,255,0.18)", color: "#4DA3FF", borderColor: "rgba(0,114,255,0.5)" }
                      : { background: "#0F1E30", color: "#7A8BA0", borderColor: "#1E3A5C" }
                  }
                >
                  Día {d}
                </button>
              );
            })}
          </div>
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

// ─── RecordingsAdminPanel ────────────────────────────────────────────────────

function RegistroLinkPanel() {
  const url = "https://dboard.govbidder.net/registro";
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
        style={{ borderColor: "#1E3A5C", minWidth: 240 }}
      />
      <Button size="sm" onClick={copy}>{copied ? "✓ Copiado" : "Copiar link"}</Button>
      <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary">Abrir ↗</a>
    </div>
  );
}

function TutorialAdminPanel() {
  const [value, setValue] = useState("");
  const [current, setCurrent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.tutorial_youtube === "string") { setCurrent(d.tutorial_youtube); setValue(d.tutorial_youtube); }
      })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "tutorial_youtube", value }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error();
      setCurrent(d.value ?? "");
      setValue(d.value ?? "");
      toast.success(d.value ? "Tutorial actualizado." : "Tutorial en 'Próximamente' (sin video).");
    } catch { toast.error("Error al guardar el tutorial."); }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Pegá el link de YouTube (o el ID)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={saving}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          style={{ borderColor: "#1E3A5C", minWidth: 240 }}
        />
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "..." : "Guardar"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {current
          ? <>Video actual: <span className="font-mono">{current}</span> · <a href={`https://youtu.be/${current}`} target="_blank" rel="noreferrer" className="text-primary font-semibold">ver ↗</a></>
          : "Sin video → el tutorial muestra “Próximamente”. Dejá el campo vacío y guardá para volver a ese estado."}
      </p>
    </div>
  );
}

function PausePointsPanel() {
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setPaused(d?.points_paused === "true"))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle(val: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "points_paused", value: val ? "true" : "false" }),
      });
      if (!res.ok) throw new Error();
      setPaused(val);
      toast.success(val ? "⏸ Puntos pausados — nadie suma ni pierde puntos." : "▶ Puntos reanudados.");
    } catch {
      toast.error("No se pudo cambiar la pausa.");
    }
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="flex items-center justify-between p-4 border rounded-xl bg-card" style={{ borderColor: paused ? "#D7263D" : "#1E3A5C" }}>
      <div>
        <p className="font-semibold text-sm">{paused ? "⏸ Puntos PAUSADOS" : "▶ Puntos activos (normal)"}</p>
        <p className="text-xs text-muted-foreground">
          {paused ? "Nadie está sumando puntos ahora mismo." : "El sistema de puntos funciona con normalidad."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={paused ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
          {paused ? "Pausado" : "Activo"}
        </Badge>
        <Switch checked={paused} onCheckedChange={toggle} disabled={saving} />
      </div>
    </div>
  );
}

interface RecordingRow { recording_number: number; youtube_url?: string | null; }

function RecordingsAdminPanel() {
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/recordings")
      .then((r) => r.json())
      .then((data: RecordingRow[]) => {
        const init: Record<number, string> = {};
        const done: Record<number, boolean> = {};
        data.forEach((r) => {
          if (r.youtube_url) { init[r.recording_number] = r.youtube_url; done[r.recording_number] = true; }
        });
        setInputs(init);
        setSaved(done);
      })
      .catch(() => {});
  }, []);

  async function save(num: number) {
    const youtube_url = (inputs[num] ?? "").trim();
    setSaving(num);
    try {
      const res = await fetch("/api/admin/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_number: num, youtube_url }),
      });
      if (!res.ok) throw new Error();
      setSaved((prev) => ({ ...prev, [num]: !!youtube_url }));
      toast.success(youtube_url ? `Grabación ${num} guardada.` : `Grabación ${num} limpiada.`);
    } catch {
      toast.error("Error al guardar la grabación.");
    }
    setSaving(null);
  }

  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((num) => (
        <div key={num} className="flex items-center gap-3 p-3 border rounded-xl bg-card" style={{ borderColor: "#1E3A5C" }}>
          <span className="text-xs font-bold text-muted-foreground w-24 shrink-0">Grabación día {num}</span>
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={inputs[num] ?? ""}
            onChange={(e) => setInputs((prev) => ({ ...prev, [num]: e.target.value }))}
            disabled={saving === num}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            style={{ borderColor: "#1E3A5C" }}
          />
          <Button size="sm" onClick={() => save(num)} disabled={saving === num}>
            {saving === num ? "..." : "Guardar"}
          </Button>
          {saved[num] && <span className="text-[10px] font-bold text-green-500 shrink-0">✓</span>}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Dejá el campo vacío y tocá Guardar para quitar el link de un botón. Los botones aparecen al lado de los puntos en el dashboard.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function AdminSection({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-6 scroll-mt-24">
      <div className="flex items-start gap-3 pb-3 border-b" style={{ borderColor: "#1E3A5C" }}>
        <span className="text-2xl leading-none">{icon}</span>
        <div>
          <h2 className="text-xl font-bold text-primary leading-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

const ADMIN_SECTIONS = [
  { id: "resumen", icon: "📊", label: "Resumen" },
  { id: "usuarios", icon: "👥", label: "Usuarios" },
  { id: "misiones", icon: "🎯", label: "Misiones" },
  { id: "puntuacion", icon: "🏆", label: "Puntuación" },
  { id: "configuracion", icon: "⚙️", label: "Configuración" },
] as const;

function AdminSectionNav() {
  return (
    <div
      className="sticky top-0 z-20 -mx-6 px-6 py-2.5 mb-2 flex items-center gap-2 overflow-x-auto border-b backdrop-blur"
      style={{ borderColor: "#1E3A5C", background: "color-mix(in srgb, var(--background) 92%, transparent)" }}
    >
      {ADMIN_SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors hover:bg-primary/10"
          style={{ borderColor: "#1E3A5C" }}
        >
          <span>{s.icon}</span>
          {s.label}
        </a>
      ))}
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
  // Desglose de puntos por usuario (modal admin).
  const [bdUser, setBdUser] = useState<User | null>(null);
  const [bdData, setBdData] = useState<Breakdown | null>(null);
  const [bdLoading, setBdLoading] = useState(false);
  // Link de acceso (magic link) de un usuario, para enviarlo a mano (no por email).
  const [linkUser, setLinkUser] = useState<User | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);

  async function openBreakdown(user: User) {
    setBdUser(user);
    setBdData(null);
    setBdLoading(true);
    try {
      const res = await fetch(`/api/admin/user-breakdown?userId=${user.id}`);
      const d = await res.json();
      if (res.ok) setBdData({ total: d.total ?? 0, tracked: d.tracked ?? 0, by_category: d.by_category ?? {} });
    } catch { /* noop */ }
    setBdLoading(false);
  }

  async function openAccessLink(user: User) {
    setLinkUser(user);
    setLinkUrl(null);
    setLinkLoading(true);
    try {
      const res = await fetch("/api/admin/users/access-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const d = await res.json();
      if (res.ok && d.link) {
        setLinkUrl(d.link);
        try { await navigator.clipboard.writeText(d.link); toast.success("Link copiado al portapapeles"); } catch { /* sin portapapeles */ }
      } else {
        toast.error(d.error === "no_email" ? "Ese usuario no tiene email." : "No se pudo generar el link.");
        setLinkUser(null);
      }
    } catch {
      toast.error("Error al generar el link.");
      setLinkUser(null);
    }
    setLinkLoading(false);
  }

  const progressByUser = allProgress.reduce<Record<string, Progress[]>>((acc, p) => {
    if (!acc[p.user_id]) acc[p.user_id] = [];
    acc[p.user_id].push(p);
    return acc;
  }, {});

  const sorteoMap = Object.fromEntries(sorteos.map((s) => [s.user_id, s]));

  // Métricas de ingreso al dashboard — excluye cuentas de equipo (is_admin), y
  // separa pagos (is_student = false) de gratuitos (is_student = true, se
  // registraron solos por el link público, no pagaron ni compiten por premios).
  const nonAdminUsers = users.filter((u) => !u.is_admin);
  const paidUsers = nonAdminUsers.filter((u) => !u.is_student);
  const freeUsers = nonAdminUsers.filter((u) => u.is_student);
  const todayStr = new Date().toDateString();

  function userMetrics(list: User[]) {
    const total = list.length;
    const entered = list.filter((u) => !!u.last_seen_at).length;
    const activeToday = list.filter(
      (u) => u.last_seen_at && new Date(u.last_seen_at).toDateString() === todayStr
    ).length;
    const enteredPct = total > 0 ? Math.round((entered / total) * 100) : 0;
    return { total, entered, activeToday, enteredPct };
  }

  const totalUsers = nonAdminUsers.length;
  const paidMetrics = userMetrics(paidUsers);
  const freeMetrics = userMetrics(freeUsers);

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

      <AdminSectionNav />

      {/* ═══════════════ 📊 RESUMEN GENERAL ═══════════════ */}
      <AdminSection id="resumen" icon="📊" title="Resumen General" description="Métricas de ingreso y actividad, de un vistazo.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <OnlineNowCard />
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold text-primary">{totalUsers}</p>
              <p className="text-sm text-muted-foreground mt-1">Usuarios con acceso (total)</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card style={{ borderColor: "color-mix(in srgb, var(--primary) 40%, var(--border))" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                💳 Usuarios pagos
              </CardTitle>
              <CardDescription>Pagaron el challenge (no incluye gratuitos ni cuentas de equipo).</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-2xl font-bold text-primary">{paidMetrics.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Usuarios pagos</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>
                  {paidMetrics.entered}
                  <span className="text-sm font-medium text-muted-foreground"> / {paidMetrics.total}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ingresaron <span className="font-semibold">({paidMetrics.enteredPct}%)</span>
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{paidMetrics.activeToday}</p>
                <p className="text-xs text-muted-foreground mt-1">Activos hoy</p>
              </div>
            </CardContent>
          </Card>

          <Card style={{ borderColor: "color-mix(in srgb, var(--accent) 40%, var(--border))" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                🆓 Usuarios gratuitos
              </CardTitle>
              <CardDescription>Se registraron solos por el link público — no compiten por premios.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-2xl font-bold text-primary">{freeMetrics.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Usuarios gratuitos</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>
                  {freeMetrics.entered}
                  <span className="text-sm font-medium text-muted-foreground"> / {freeMetrics.total}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ingresaron <span className="font-semibold">({freeMetrics.enteredPct}%)</span>
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{freeMetrics.activeToday}</p>
                <p className="text-xs text-muted-foreground mt-1">Activos hoy</p>
              </div>
            </CardContent>
          </Card>
        </div>

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
      </AdminSection>

      {/* ═══════════════ 👥 USUARIOS ═══════════════ */}
      <AdminSection id="usuarios" icon="👥" title="Usuarios" description="Registro, acceso, recordatorios y progreso individual.">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#FFD700]" />
              Registro de usuarios gratuitos
            </CardTitle>
            <CardDescription>
              Compartí este link: la gente se registra sola como usuario gratuito (suma puntos y usa todo el dashboard, pero no compite por los premios) y recibe el email de acceso automático.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegistroLinkPanel />
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#00D4FF]" />
              Recordatorios de Acceso y Día 1
            </CardTitle>
            <CardDescription>
              Emails segmentados: a los que nunca ingresaron les avisa que entren; a los que ingresaron pero no completaron el Día 1 les avisa que lo terminen. Remitente distinto al de arriba para que no se agrupen en el mismo hilo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReminderBlastPanel />
          </CardContent>
        </Card>

        {([
          { key: "paid", title: "Progreso Global — Usuarios Pagos", list: paidUsers },
          { key: "free", title: "Progreso Global — Usuarios Gratuitos", list: freeUsers },
        ] as const).map(({ key, title, list }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {title}
              </CardTitle>
              <CardDescription>
                {list.length} usuario{list.length === 1 ? "" : "s"} registrado{list.length === 1 ? "" : "s"}.
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
                  {list.map((user) => {
                    const userProgress = progressByUser[user.id] ?? [];
                    const sorteo = sorteoMap[user.id];
                    const expired = isExpired(user.access_expires_at);

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{user.full_name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                            <button
                              onClick={() => openAccessLink(user)}
                              title="Generar un link de acceso para enviárselo vos mismo"
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:opacity-80"
                            >
                              🔗 Link de acceso
                            </button>
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
                          <button
                            onClick={() => openBreakdown(user)}
                            title="Ver de dónde salieron los puntos"
                            className="font-medium text-primary underline decoration-dotted underline-offset-2 hover:opacity-80 cursor-pointer"
                          >
                            {user.total_points}
                          </button>
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
                              const overrideKey = `${user.id}-${day}`;
                              return (
                                <Button
                                  key={day}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-7 p-0 text-xs"
                                  disabled={overrideLoading === overrideKey}
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
        ))}
      </AdminSection>

      {/* ═══════════════ 🎯 MISIONES Y CONTENIDO ═══════════════ */}
      <AdminSection id="misiones" icon="🎯" title="Misiones y Contenido" description="Misión diaria, palabras clave, reportes y videos.">
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

          <Link href="/admin/contenido">
            <Card className="hover:border-[var(--secondary)] transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">📺 Contenido</span>
                  <span className="text-sm text-muted-foreground font-normal">Ir →</span>
                </CardTitle>
                <CardDescription>
                  Gestioná el contenido de cada día del challenge desde su sección propia.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#FFD700]" />
              Reportes de Página Web (Día 3)
            </CardTitle>
            <CardDescription>
              Avisos de participantes cuyo sitio del Día 3 no quedó bien (imágenes rotas, etc.). Ya pueden regenerarla libremente por su cuenta — esto es solo para hacer seguimiento y ayudarlos puntualmente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebReportsAdminPanel />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-[#FFD700]" />
              Grabaciones de las Clases
            </CardTitle>
            <CardDescription>
              Pegá el link de YouTube de cada grabación (1 a 4). Aparecen como 4 botones al lado de los puntos en el dashboard; cada uno abre su grabación en una pestaña nueva.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecordingsAdminPanel />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-[#FFD700]" />
              Tutorial de inicio
            </CardTitle>
            <CardDescription>
              Pegá el link de YouTube del tutorial. Aparece en el inicio del dashboard. Si lo dejás vacío, se muestra “Próximamente”.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TutorialAdminPanel />
          </CardContent>
        </Card>
      </AdminSection>

      {/* ═══════════════ 🏆 PUNTUACIÓN Y PREMIOS ═══════════════ */}
      <AdminSection id="puntuacion" icon="🏆" title="Puntuación y Premios" description="Puntos, referidos, próximo paso y sorteo final.">
        <Card style={{ borderColor: "#D7263D55" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#D7263D]" />
              Pausa de Puntos
            </CardTitle>
            <CardDescription>
              Congela TODO el sistema de puntos (heartbeat, misiones, videos, quiz, keywords, referidos, community, story, rafaga, anuncios, racha). Nadie suma ni pierde puntos mientras esté activa — pensado para el sorteo, así el ranking no se mueve. Reversible en cualquier momento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PausePointsPanel />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#00D4FF]" />
              Clicks en &quot;Tu Próximo Paso&quot;
            </CardTitle>
            <CardDescription>
              Quién tocó &quot;Pagar ahora&quot; o &quot;Hablar con el equipo&quot; en la página de después del challenge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProximoPasoClicksPanel />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#25D366]" />
              Propuesta de Mentoría por Email
            </CardTitle>
            <CardDescription>
              Email masivo a todos con la propuesta de &quot;Tu Primer Contrato&quot; en plan de pagos, con botón directo a WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MentoriaBlastPanel />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
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

          <Link href="/admin/sorteo">
            <Card className="hover:border-[var(--secondary)] transition-colors cursor-pointer h-full" style={{ borderColor: "color-mix(in srgb, #FFD700 40%, var(--border))" }}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">🎲 Sorteo Final</span>
                  <span className="text-sm text-muted-foreground font-normal">Ir →</span>
                </CardTitle>
                <CardDescription>
                  Sorteo de premios por rango (Elevate, Prime, Legacy, Expert). Página para usar en vivo el día del evento.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </AdminSection>

      {/* ═══════════════ ⚙️ CONFIGURACIÓN DEL CHALLENGE ═══════════════ */}
      <AdminSection id="configuracion" icon="⚙️" title="Configuración del Challenge" description="Bloqueo en vivo, horarios y desbloqueo manual de días.">
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
      </AdminSection>

      {/* Modal: desglose de puntos de un usuario (de dónde salieron) */}
      {bdUser && (
        <div
          onClick={() => setBdUser(null)}
          style={{ position: "fixed", inset: 0, zIndex: 99990, background: "rgba(6,13,26,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border rounded-2xl"
            style={{ width: "min(440px, 100%)", maxHeight: "85vh", overflowY: "auto", borderColor: "#1E3A5C", padding: "20px" }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="font-bold text-base">{bdUser.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{bdUser.email}</p>
              </div>
              <button onClick={() => setBdUser(null)} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <p className="text-sm font-semibold mt-2 mb-3">
              Total: <span className="text-primary">{(bdData?.total ?? bdUser.total_points).toLocaleString("es")}</span> pts
            </p>
            {bdLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : bdData && breakdownRows(bdData).length > 0 ? (
              <div className="space-y-1.5">
                {breakdownRows(bdData).map(([label, pts]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <span className={`font-mono font-bold ${pts < 0 ? "text-destructive" : "text-green-600"}`}>
                      {pts > 0 ? `+${pts.toLocaleString("es")}` : pts.toLocaleString("es")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Este usuario todavía no sumó puntos rastreados.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal: link de acceso de un usuario (para enviarlo a mano, sin email) */}
      {linkUser && (
        <div
          onClick={() => setLinkUser(null)}
          style={{ position: "fixed", inset: 0, zIndex: 99990, background: "rgba(6,13,26,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border rounded-2xl"
            style={{ width: "min(520px, 100%)", borderColor: "#1E3A5C", padding: "20px" }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="font-bold text-base">{linkUser.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{linkUser.email}</p>
              </div>
              <button onClick={() => setLinkUser(null)} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <p className="text-sm font-semibold mt-2 mb-2">🔗 Link de acceso directo</p>
            {linkLoading ? (
              <p className="text-sm text-muted-foreground">Generando…</p>
            ) : linkUrl ? (
              <>
                <textarea
                  readOnly
                  value={linkUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full text-xs font-mono rounded-lg border p-2 bg-background text-foreground"
                  style={{ borderColor: "#1E3A5C", minHeight: 72, resize: "none" }}
                />
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <Button
                    onClick={async () => { try { await navigator.clipboard.writeText(linkUrl); toast.success("Link copiado"); } catch { toast.error("No se pudo copiar"); } }}
                  >
                    Copiar link
                  </Button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent("Tu acceso al GovBidder Challenge (toca para entrar, sin contraseña): " + linkUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-primary hover:opacity-80"
                  >
                    Enviar por WhatsApp →
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                  Al abrirlo, la persona entra directo al dashboard sin contraseña. Es de un solo uso y válido por un tiempo limitado — si caduca, generá otro.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No se pudo generar el link.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
