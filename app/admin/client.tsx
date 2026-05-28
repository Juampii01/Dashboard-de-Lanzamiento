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
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle2, Trophy, Users, UserPlus, Radio, Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { isExpired } from "@/lib/utils";

interface AdminToggle {
  day_number: number;
  is_globally_unlocked: boolean;
  unlocked_at: string | null;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  total_points: number;
  access_expires_at: string | null;
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

  async function toggleDay(dayNumber: number, value: boolean) {
    setUpdatingDay(dayNumber);
    const supabase = createClient();
    const { error } = await supabase
      .from("admin_toggles")
      .update({
        is_globally_unlocked: value,
        unlocked_at: value ? new Date().toISOString() : null,
      })
      .eq("day_number", dayNumber);

    if (error) {
      toast.error("Error al actualizar. Recargá la página.");
    } else {
      setToggles((prev) =>
        prev.map((t) =>
          t.day_number === dayNumber
            ? { ...t, is_globally_unlocked: value, unlocked_at: value ? new Date().toISOString() : null }
            : t
        )
      );
      toast.success(value ? `Día ${dayNumber} desbloqueado para todos.` : `Día ${dayNumber} bloqueado.`);
    }
    setUpdatingDay(null);
  }

  async function overrideUserDay(userId: string, dayNumber: number, unlock: boolean) {
    const key = `${userId}-${dayNumber}`;
    setOverrideLoading(key);
    const supabase = createClient();
    const { error } = await supabase
      .from("day_progress")
      .update({ is_unlocked: unlock })
      .eq("user_id", userId)
      .eq("day_number", dayNumber);

    if (error) {
      toast.error("Error al aplicar override.");
    } else {
      toast.success(`Día ${dayNumber} ${unlock ? "desbloqueado" : "bloqueado"} para el usuario.`);
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

      {/* Toggles globales */}
      <Card>
        <CardHeader>
          <CardTitle>Toggles Globales por Día</CardTitle>
          <CardDescription>
            Activar un día lo desbloquea para TODOS los usuarios que completaron el día anterior.
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
