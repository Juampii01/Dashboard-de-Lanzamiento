"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RANKS } from "@/lib/ranks";
import { Loader2, Trophy } from "lucide-react";

interface EligibleUser {
  id: string;
  full_name: string | null;
  email: string;
  total_points: number;
}

interface Winner {
  id: string;
  full_name: string | null;
  email: string;
  drawn_at: string;
}

const TARGET_COUNT: Record<string, number> = {
  elevate: 10,
  prime: 1,
  legacy: 1,
  expert: 1,
};

const WEIGHTED_RANKS = new Set(["elevate", "prime"]);
const GATED_RANKS = new Set(["legacy", "expert"]);

export function SorteoClient() {
  const [loading, setLoading] = useState(true);
  const [pools, setPools] = useState<Record<string, EligibleUser[]>>({});
  const [winners, setWinners] = useState<Record<string, Winner[]>>({});
  const [excluded, setExcluded] = useState<Record<string, Set<string>>>({});
  const [drawing, setDrawing] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sorteo");
      const json = await res.json();
      if (res.status === 501) {
        toast.error("Falta correr la migración de sorteo (sorteo_winners o sorteo_confirmed_payers).");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "error");
      setPools(json.pools ?? {});
      setWinners(json.winners ?? {});
    } catch {
      toast.error("No se pudo cargar el sorteo.");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleExclude(rankKey: string, userId: string) {
    setExcluded((prev) => {
      const set = new Set(prev[rankKey] ?? []);
      if (set.has(userId)) set.delete(userId); else set.add(userId);
      return { ...prev, [rankKey]: set };
    });
  }

  async function draw(rankKey: string) {
    const pool = pools[rankKey] ?? [];
    const exSet = excluded[rankKey] ?? new Set<string>();
    const allowedIds = pool.filter((u) => !exSet.has(u.id)).map((u) => u.id);
    const target = TARGET_COUNT[rankKey] ?? 1;

    if (allowedIds.length < target) {
      toast.error(`Necesitás al menos ${target} candidatos seleccionados (hay ${allowedIds.length}).`);
      return;
    }
    if (!confirm(`¿Sortear ${target} ganador${target > 1 ? "es" : ""} de "${RANKS.find((r) => r.key === rankKey)?.name}" entre ${allowedIds.length} candidatos? Esto queda guardado.`)) return;

    setDrawing(rankKey);
    try {
      const res = await fetch("/api/admin/sorteo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankKey, count: target, allowedIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "error");
      setWinners((prev) => ({ ...prev, [rankKey]: json.winners.map((w: { id: string; full_name: string | null; email: string }) => ({ ...w, drawn_at: new Date().toISOString() })) }));
      toast.success(`¡Sorteados ${json.winners.length} ganador${json.winners.length > 1 ? "es" : ""}!`);
    } catch (e) {
      toast.error("Error al sortear: " + (e as Error).message);
    }
    setDrawing(null);
  }

  async function resetRank(rankKey: string) {
    if (!confirm(`¿Borrar los ganadores de "${RANKS.find((r) => r.key === rankKey)?.name}" para volver a sortear?`)) return;
    setResetting(rankKey);
    try {
      const res = await fetch("/api/admin/sorteo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankKey }),
      });
      if (!res.ok) throw new Error();
      await load();
      toast.success("Reiniciado. Ya podés volver a sortear.");
    } catch {
      toast.error("Error al reiniciar.");
    }
    setResetting(null);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Cargando elegibles…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[#FFD700]" /> Sorteo de premios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Elegibles en los 4 rangos: pago 100% confirmado (Hotmart + SEM + Stripe) y haber ingresado al menos una vez al dashboard — quien pagó pero nunca entró no participa. <strong>Elevate y Prime</strong> sortean ponderado por puntos (más puntos = más probabilidad). <strong>Legacy y Expert</strong> sortean con igual chance para todos. Se excluyen siempre cuentas de equipo/admin y de alumnos; podés destildar a mano cualquier otra cuenta antes de sortear.
        </p>
      </div>

      {RANKS.map((rank) => {
        const pool = pools[rank.key] ?? [];
        const rankWinners = winners[rank.key] ?? [];
        const target = TARGET_COUNT[rank.key] ?? 1;
        const exSet = excluded[rank.key] ?? new Set<string>();
        const selectedCount = pool.filter((u) => !exSet.has(u.id)).length;

        return (
          <Card key={rank.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <span>{rank.emoji}</span> {rank.name}
                <span className="text-xs font-normal text-muted-foreground">
                  · {target} ganador{target > 1 ? "es" : ""} · premio: {rank.prize}
                </span>
                {GATED_RANKS.has(rank.key) && (
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)" }}>
                    Igual chance
                  </span>
                )}
                {WEIGHTED_RANKS.has(rank.key) && (
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, #FFD700 20%, transparent)", color: "#B8860B" }}>
                    Ponderado por puntos
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {rankWinners.length > 0
                  ? `Ya sorteado el ${new Date(rankWinners[0].drawn_at).toLocaleString("es-US", { dateStyle: "short", timeStyle: "short" })}.`
                  : `${pool.length} elegibles en este rango.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rankWinners.length > 0 ? (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    {rankWinners.map((w) => (
                      <div key={w.id} className="flex items-center gap-2 p-2 rounded-lg border" style={{ borderColor: "#FFD70055", background: "color-mix(in srgb, #FFD700 8%, transparent)" }}>
                        <Trophy className="w-4 h-4 text-[#FFD700] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{w.full_name || w.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{w.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" disabled={resetting === rank.key} onClick={() => resetRank(rank.key)}>
                    {resetting === rank.key ? "..." : "Volver a sortear"}
                  </Button>
                </div>
              ) : pool.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay elegibles en este rango todavía.</p>
              ) : (
                <div className="space-y-3">
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {pool.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={!exSet.has(u.id)}
                          onChange={() => toggleExclude(rank.key, u.id)}
                        />
                        <span className="font-medium truncate">{u.full_name || "—"}</span>
                        <span className="text-muted-foreground truncate">{u.email}</span>
                        <span className="text-muted-foreground ml-auto shrink-0">{u.total_points.toLocaleString()} pts</span>
                      </label>
                    ))}
                  </div>
                  <Button
                    disabled={drawing === rank.key || selectedCount < target}
                    onClick={() => draw(rank.key)}
                  >
                    {drawing === rank.key ? "Sorteando…" : `🎲 Sortear ${target} de ${selectedCount} seleccionados`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
