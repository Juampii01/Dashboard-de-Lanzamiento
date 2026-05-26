"use client";

import { useState } from "react";

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
import { CheckCircle2, Trophy, Users } from "lucide-react";
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
      <div>
        <h1 className="text-2xl font-bold text-primary">Panel de Administración</h1>
        <p className="text-muted-foreground mt-1">
          Controlá los días del challenge en vivo y monitoreá el progreso de los alumnos.
        </p>
      </div>

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
