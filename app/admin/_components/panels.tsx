"use client";

/* ─────────────────────────────────────────────────────────────────────────────
   Paneles de control del admin (lógica idéntica a la versión anterior de
   app/admin/client.tsx; solo se movieron aquí y se unificó el estilo).
   ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Radio, Trash2, Unlock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CLASS_LINKS } from "@/lib/class-links";
import { cn } from "@/lib/utils";
import { inputClass, StatusPill, ToggleRow } from "./ui";
import { DAY_LABELS, type AdminToggle } from "../_lib/types";

// ─── Conectados ahora ───────────────────────────────────────────────────────

export function useOnlineCount() {
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
  return online;
}

// ─── Bloqueo por llamada en vivo ────────────────────────────────────────────

interface LockState {
  is_locked: boolean;
  call_url: string | null;
  message: string | null;
  locked_at: string | null;
}

const DEFAULT_MESSAGE = "La llamada en vivo está en curso. Vuelve cuando termine.";

export function DashboardLockControl() {
  const [lock, setLock] = useState<LockState>({ is_locked: false, call_url: null, message: null, locked_at: null });
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
      <p className="flex items-center gap-2 text-muted-foreground text-sm">
        <Radio className="w-4 h-4 animate-pulse" /> Cargando estado…
      </p>
    );
  }

  const displayMessage = messageInput.trim() || DEFAULT_MESSAGE;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        {/* Estado */}
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5",
            lock.is_locked
              ? "border-primary/40 bg-primary/[0.06]"
              : "border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_5%,transparent)]"
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid place-items-center w-9 h-9 rounded-full",
                lock.is_locked ? "bg-primary/15 text-primary" : "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)]"
              )}
            >
              {lock.is_locked ? <Radio className="w-4 h-4 animate-pulse" /> : <Unlock className="w-4 h-4" />}
            </span>
            <div>
              <p className={cn("font-bold text-sm", lock.is_locked ? "text-primary" : "text-[var(--success)]")}>
                {lock.is_locked ? "Dashboard bloqueado" : "Dashboard abierto"}
              </p>
              <p className="text-xs text-muted-foreground">
                {lock.is_locked ? (
                  <>
                    Los usuarios ven el overlay de llamada en vivo
                    {lock.locked_at && (
                      <> · desde las {new Date(lock.locked_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</>
                    )}
                  </>
                ) : (
                  "Los usuarios navegan normalmente"
                )}
              </p>
            </div>
          </div>
          <StatusPill tone={lock.is_locked ? "danger" : "success"}>{lock.is_locked ? "● EN VIVO" : "LIBRE"}</StatusPill>
        </div>

        {/* Configuración */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">URL de la llamada</label>
            <input
              type="url"
              placeholder="https://zoom.us/j/..."
              value={callUrlInput}
              onChange={(e) => setCallUrlInput(e.target.value)}
              disabled={loading}
              className={inputClass}
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-0.5">Atajos:</span>
              {[1, 2, 3, 4].map((d) => {
                const active = callUrlInput.trim() === CLASS_LINKS[d];
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCallUrlInput(CLASS_LINKS[d])}
                    disabled={loading}
                    title={CLASS_LINKS[d]}
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50",
                      active ? "border-secondary bg-secondary text-white" : "border-border text-muted-foreground hover:border-secondary/50 hover:text-foreground"
                    )}
                  >
                    Día {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mensaje para los usuarios</label>
            <input
              type="text"
              placeholder={DEFAULT_MESSAGE}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={loading}
              className={inputClass}
            />
            <p className="text-[11px] text-muted-foreground">Vacío = mensaje por defecto.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lock.is_locked ? (
            <Button size="lg" variant="outline" onClick={() => toggle(false)} disabled={loading} className="gap-2 font-bold">
              <Unlock className="w-4 h-4" />
              {loading ? "Desbloqueando…" : "Desbloquear — terminar llamada"}
            </Button>
          ) : (
            <Button size="lg" onClick={() => toggle(true)} disabled={loading} className="gap-2 font-bold">
              <Lock className="w-4 h-4" />
              {loading ? "Bloqueando…" : "Bloquear — iniciar llamada"}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Los usuarios ven el cambio en hasta 20 segundos.</p>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl overflow-hidden border border-border self-start">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted border-b border-border">
          Lo que ven los usuarios
        </p>
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-3 bg-[linear-gradient(160deg,#080f24_0%,#0d1a3d_100%)]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/40">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-bold text-white tracking-widest">TRANSMISIÓN EN VIVO</span>
          </span>
          <p className="text-2xl text-white tracking-wide" style={{ fontFamily: "var(--font-arcade)" }}>
            LLAMADA EN VIVO
          </p>
          <p className="text-[11px] max-w-[220px] text-white/60">{displayMessage}</p>
          {callUrlInput && (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold text-white bg-primary">
              Ir a la llamada ↗
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hora del contador ──────────────────────────────────────────────────────

/** ISO (UTC) → valor para <input type="datetime-local"> en hora LOCAL del admin. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LaunchScheduleControl({ initialToggles }: { initialToggles: AdminToggle[] }) {
  const days = [0, 1, 2, 3, 4];
  const byDay = Object.fromEntries(initialToggles.map((t) => [t.day_number, t]));

  const [inputs, setInputs] = useState<Record<number, string>>(() =>
    Object.fromEntries(days.map((d) => [d, isoToLocalInput(byDay[d]?.scheduled_unlock_at ?? null)]))
  );
  const [savedIso, setSavedIso] = useState<Record<number, string | null>>(() =>
    Object.fromEntries(days.map((d) => [d, byDay[d]?.scheduled_unlock_at ?? null]))
  );
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [now] = useState(() => Date.now());
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
        unlock_at ? `${lbl}: el contador marca el ${new Date(unlock_at).toLocaleString()}` : `${lbl}: sin fecha (usa el valor por defecto).`
      );
    } catch {
      toast.error("No se pudo guardar la fecha. Reintenta.");
    }
    setSavingDay(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Escribe en tu hora local{tz ? ` (${tz})` : ""}; cada usuario ve el contador en la suya. Vaciar el campo vuelve a la hora por defecto.
      </p>
      <div className="divide-y divide-border rounded-xl border border-border">
        {days.map((day) => {
          const iso = savedIso[day];
          const isPast = iso ? Date.parse(iso) <= now : false;
          const dirty = isoToLocalInput(iso ?? null) !== (inputs[day] ?? "");
          return (
            <div key={day} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
              <div className="sm:w-56 shrink-0">
                <p className="font-semibold text-sm">{DAY_LABELS[day]}</p>
                <p className="text-[11px] text-muted-foreground">
                  {iso ? new Date(iso).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" }) : "Hora por defecto"}
                </p>
              </div>
              <input
                type="datetime-local"
                value={inputs[day] ?? ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [day]: e.target.value }))}
                disabled={savingDay === day}
                className={cn(inputClass, "sm:max-w-[240px]")}
              />
              <div className="flex items-center gap-2 sm:ml-auto">
                {iso && <StatusPill tone={isPast ? "success" : "gold"}>{isPast ? "Pasado" : "Programado"}</StatusPill>}
                <Button size="sm" onClick={() => save(day)} disabled={savingDay === day || !dirty}>
                  {savingDay === day ? "…" : "Guardar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Desbloqueo manual de días ──────────────────────────────────────────────

export function DayUnlockControl({ initialToggles }: { initialToggles: AdminToggle[] }) {
  const [toggles, setToggles] = useState(initialToggles);
  const [updatingDay, setUpdatingDay] = useState<number | null>(null);

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
      toast.error("Error al actualizar. Recarga la página.");
    }
    setUpdatingDay(null);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {toggles.map((t) => (
        <ToggleRow
          key={t.day_number}
          title={DAY_LABELS[t.day_number]}
          description={
            t.unlocked_at && t.is_globally_unlocked
              ? `Abierto el ${new Date(t.unlocked_at).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}`
              : "Cerrado para los participantes"
          }
          on={t.is_globally_unlocked}
          onTone="success"
          pill={<StatusPill tone={t.is_globally_unlocked ? "success" : "muted"}>{t.is_globally_unlocked ? "Abierto" : "Cerrado"}</StatusPill>}
        >
          <Switch
            checked={t.is_globally_unlocked}
            onCheckedChange={(val) => toggleDay(t.day_number, val)}
            disabled={updatingDay === t.day_number}
          />
        </ToggleRow>
      ))}
    </div>
  );
}

// ─── Keywords de las llamadas ───────────────────────────────────────────────

interface KeywordRow { day_number: number; keyword?: string; updated_at?: string; }

export function KeywordsAdminPanel() {
  const [rows, setRows] = useState<KeywordRow[]>([]);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/keywords")
      .then((r) => r.json())
      .then((raw: unknown) => {
        // Si la API devuelve un error ({ error }) no rompemos el panel.
        const data: KeywordRow[] = Array.isArray(raw) ? raw : [];
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
        if (existing) return prev.map((r) => (r.day_number === day ? { ...r, keyword } : r));
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
    <div className="divide-y divide-border rounded-xl border border-border">
      {[1, 2, 3, 4].map((day) => (
        <div key={day} className="flex items-center gap-3 p-3">
          <span className="text-xs font-bold text-muted-foreground w-12 shrink-0">Día {day}</span>
          <input
            type="text"
            placeholder={existing[day] ? `Actual: ${existing[day]}` : "Keyword secreta…"}
            value={inputs[day] ?? ""}
            onChange={(e) => setInputs((prev) => ({ ...prev, [day]: e.target.value }))}
            disabled={saving === day}
            className={inputClass}
          />
          {existing[day] && <Check className="w-4 h-4 text-[var(--success)] shrink-0" aria-label="Configurada" />}
          <Button size="sm" onClick={() => save(day)} disabled={saving === day || !(inputs[day] ?? "").trim()}>
            {saving === day ? "…" : existing[day] ? "Actualizar" : "Guardar"}
          </Button>
          {existing[day] && (
            <button
              onClick={() => remove(day)}
              disabled={saving === day}
              title={`Eliminar keyword del Día ${day}`}
              aria-label={`Eliminar keyword del Día ${day}`}
              className="shrink-0 p-2 rounded-lg text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Link de registro gratuito ──────────────────────────────────────────────

export function RegistroLinkPanel() {
  const url = "https://dboard.govbidder.net/registro/gratis";
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className={cn(inputClass, "flex-1 font-mono")} style={{ minWidth: 240 }} />
      <Button size="sm" onClick={copy}>{copied ? "✓ Copiado" : "Copiar link"}</Button>
      <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-secondary dark:text-white px-2">Abrir ↗</a>
    </div>
  );
}

// ─── Tutorial de inicio ─────────────────────────────────────────────────────

export function TutorialAdminPanel() {
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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Link de YouTube (o el ID)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={saving}
          className={inputClass}
        />
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "…" : "Guardar"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {current ? (
          <>Video actual: <span className="font-mono">{current}</span> · <a href={`https://youtu.be/${current}`} target="_blank" rel="noreferrer" className="font-semibold text-secondary dark:text-white">ver ↗</a></>
        ) : (
          "Sin video → el tutorial muestra “Próximamente”."
        )}
      </p>
    </div>
  );
}

// ─── Número de soporte ──────────────────────────────────────────────────────

/** WhatsApp de soporte que se muestra en el asistente "Ayuda" del dashboard. */
export function SupportWhatsappPanel() {
  const [value, setValue] = useState("");
  const [current, setCurrent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.support_whatsapp === "string") { setCurrent(d.support_whatsapp); setValue(d.support_whatsapp); }
      })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "support_whatsapp", value }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error();
      setCurrent(d.value ?? "");
      setValue(d.value ?? "");
      toast.success(d.value ? "Número de soporte guardado." : "Soporte por WhatsApp desactivado.");
    } catch { toast.error("Error al guardar el número."); }
    setSaving(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="tel"
          placeholder="Ej: 13055551234 (con código de país, sin +)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={saving}
          className={inputClass}
        />
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "…" : "Guardar"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {current ? (
          <>Número actual: <span className="font-mono">+{current}</span> · <a href={`https://wa.me/${current}`} target="_blank" rel="noreferrer" className="font-semibold text-secondary dark:text-white">probar ↗</a></>
        ) : (
          "Sin número → el asistente no muestra el acceso a soporte."
        )}
      </p>
    </div>
  );
}

// ─── Pausa de puntos ────────────────────────────────────────────────────────

export function useSetting(key: string) {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setValue(typeof d?.[key] === "string" ? d[key] : null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [key]);
  return { value, setValue, loading };
}

async function saveSetting(key: string, value: string) {
  const res = await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) throw new Error();
}

export function PausePointsPanel() {
  const { value, setValue, loading } = useSetting("points_paused");
  const [saving, setSaving] = useState(false);
  const paused = value === "true";

  async function toggle(val: boolean) {
    setSaving(true);
    try {
      await saveSetting("points_paused", val ? "true" : "false");
      setValue(val ? "true" : "false");
      toast.success(val ? "⏸ Puntos pausados — nadie suma ni pierde puntos." : "▶ Puntos reanudados.");
    } catch {
      toast.error("No se pudo cambiar la pausa.");
    }
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <ToggleRow
      title={paused ? "Puntos pausados" : "Puntos activos"}
      description={paused ? "Nadie está sumando puntos ahora mismo." : "El sistema de puntos funciona con normalidad."}
      on={paused}
      pill={<StatusPill tone={paused ? "danger" : "success"}>{paused ? "Pausado" : "Activo"}</StatusPill>}
    >
      <Switch checked={paused} onCheckedChange={toggle} disabled={saving} />
    </ToggleRow>
  );
}

// ─── Banner de la mentoría en el inicio ─────────────────────────────────────

export function MentoriaBannerPanel() {
  const { value, setValue, loading } = useSetting("mentoria_banner_enabled");
  const [saving, setSaving] = useState(false);
  const on = value === "true";

  async function toggle(val: boolean) {
    setSaving(true);
    try {
      await saveSetting("mentoria_banner_enabled", val ? "true" : "false");
      setValue(val ? "true" : "false");
      toast.success(val ? "Banner de la mentoría visible en el inicio." : "Banner de la mentoría oculto.");
    } catch {
      toast.error("No se pudo cambiar el banner.");
    }
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <ToggleRow
      title={on ? "Banner visible" : "Banner oculto"}
      description="Ventana “¿Todavía estás pensando en unirte a Tu Primer Contrato?” al entrar al inicio. Pensada para el último día del lanzamiento."
      on={on}
      onTone="success"
      pill={<StatusPill tone={on ? "success" : "muted"}>{on ? "Visible" : "Oculto"}</StatusPill>}
    >
      <Switch checked={on} onCheckedChange={toggle} disabled={saving} />
    </ToggleRow>
  );
}

// ─── Historia diaria en Instagram ───────────────────────────────────────────

/** Cuentas a etiquetar y texto de referencia para el texto que genera la guía. */
export function StoryCopySettingsPanel() {
  const handles = useSetting("instagram_handles");
  const example = useSetting("story_copy_example");
  const [h, setH] = useState<string | null>(null);
  const [ex, setEx] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hVal = h ?? handles.value ?? "";
  const exVal = ex ?? example.value ?? "";

  async function save() {
    setSaving(true);
    try {
      await saveSetting("instagram_handles", hVal);
      await saveSetting("story_copy_example", exVal);
      toast.success("Guardado.");
    } catch {
      toast.error("No se pudo guardar.");
    }
    setSaving(false);
  }

  if (handles.loading || example.loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-muted-foreground">Cuentas a etiquetar (separadas por espacio)</span>
        <input className={inputClass} placeholder="@govbidder" value={hVal} onChange={(e) => setH(e.target.value)} disabled={saving} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-muted-foreground">Texto de referencia (estilo que debe imitar la guía)</span>
        <textarea
          className={inputClass}
          rows={4}
          placeholder="Ej.: Día 2 del Tu Primer Contrato Challenge ✅ Hoy encontré los códigos de mi empresa para venderle al gobierno…"
          value={exVal}
          onChange={(e) => setEx(e.target.value)}
          disabled={saving}
        />
      </label>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "…" : "Guardar"}</Button>
        <p className="text-xs text-muted-foreground">Sin cuentas cargadas se etiqueta a @govbidder.</p>
      </div>
    </div>
  );
}

// ─── Cierre total del acceso ────────────────────────────────────────────────

export function AccessClosedPanel() {
  const { value, setValue, loading } = useSetting("access_closed");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const closed = value === "true";

  async function apply(val: boolean) {
    setSaving(true);
    setConfirming(false);
    try {
      await saveSetting("access_closed", val ? "true" : "false");
      setValue(val ? "true" : "false");
      toast.success(val ? "🔒 Acceso cerrado — nadie (menos admins) puede entrar al dashboard." : "🔓 Acceso reabierto.");
    } catch {
      toast.error("No se pudo cambiar el acceso.");
    }
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-3">
      <ToggleRow
        title={closed ? "Acceso cerrado" : "Acceso abierto"}
        description={closed ? "Los usuarios ven “el challenge finalizó”. Los admins entran normal." : "Todos pueden entrar al dashboard."}
        on={closed}
        pill={<StatusPill tone={closed ? "danger" : "success"}>{closed ? "Cerrado" : "Abierto"}</StatusPill>}
      >
        {/* Cerrar pide confirmación inline (sin confirm() nativo); reabrir es directo. */}
        <Switch checked={closed || confirming} onCheckedChange={(v) => (v ? setConfirming(true) : apply(false))} disabled={saving} />
      </ToggleRow>
      {confirming && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/[0.05] p-3">
          <p className="text-sm">
            ¿Cerrar el dashboard para <strong>todos</strong> los usuarios (menos admins)? Puedes reabrirlo cuando quieras.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => apply(true)}>Sí, cerrar acceso</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Grabaciones de las clases ──────────────────────────────────────────────

interface RecordingRow { recording_number: number; youtube_url?: string | null; title?: string | null; }

export function RecordingsAdminPanel() {
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/recordings")
      .then((r) => r.json())
      .then((raw: unknown) => {
        const data: RecordingRow[] = Array.isArray(raw) ? raw : [];
        const init: Record<number, string> = {};
        const tit: Record<number, string> = {};
        const done: Record<number, boolean> = {};
        data.forEach((r) => {
          if (r.youtube_url) { init[r.recording_number] = r.youtube_url; done[r.recording_number] = true; }
          if (r.title) tit[r.recording_number] = r.title;
        });
        setInputs(init);
        setTitles(tit);
        setSaved(done);
      })
      .catch(() => {});
  }, []);

  async function save(num: number) {
    const youtube_url = (inputs[num] ?? "").trim();
    const title = (titles[num] ?? "").trim();
    setSaving(num);
    try {
      const res = await fetch("/api/admin/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_number: num, youtube_url, title }),
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
    <div className="space-y-2">
      <div className="divide-y divide-border rounded-xl border border-border">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className="flex items-center gap-3 p-3">
            <span className="text-xs font-bold text-muted-foreground w-12 shrink-0">Día {num}</span>
            <div className="flex flex-1 min-w-0 flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Nombre de la clase"
                value={titles[num] ?? ""}
                onChange={(e) => setTitles((prev) => ({ ...prev, [num]: e.target.value }))}
                disabled={saving === num}
                className={inputClass}
              />
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={inputs[num] ?? ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [num]: e.target.value }))}
                disabled={saving === num}
                className={inputClass}
              />
            </div>
            {saved[num] && <Check className="w-4 h-4 text-[var(--success)] shrink-0" aria-label="Guardada" />}
            <Button size="sm" onClick={() => save(num)} disabled={saving === num}>
              {saving === num ? "…" : "Guardar"}
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Link vacío + Guardar deja esa grabación como “próximamente”. El nombre de la clase se muestra debajo de “Día N” en el inicio.</p>
    </div>
  );
}
