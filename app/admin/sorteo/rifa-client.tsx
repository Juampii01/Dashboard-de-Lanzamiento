"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dices, Loader2, RotateCcw, Ticket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatusPill, ToggleRow } from "../_components/ui";
import { formatPoints } from "@/lib/points";
import { ordinalWinner } from "@/lib/rifa";
import { RifaStage, type StageWinner } from "./rifa-stage";

interface RankState {
  key: string;
  name: string;
  emoji: string;
  color: string;
  prize: string;
  target: number;
  pool: number;
  realPool?: number;
  openPool?: number;
  winners: { position: number; full_name: string | null; email: string; points: number; drawn_at: string; claimed?: boolean }[];
}
interface Participant {
  id: string; full_name: string | null; email: string; points: number; rank: string;
  joined_at: string; eligible: boolean; excluded?: boolean; won: boolean;
}

/**
 * Rifa en vivo (reemplaza al sorteo anterior). Flujo en la llamada:
 *   1. Activar el banner → a los participantes les aparece "¡Quiero participar!".
 *   2. Los que están en la llamada lo tocan (el contador sube en vivo).
 *   3. Sortear premio por premio, un ganador por vez.
 * "Reiniciar rifa" borra participantes y ganadores (para el simulacro).
 */
export function RifaClient() {
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [ranks, setRanks] = useState<RankState[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showList, setShowList] = useState(false);
  const [stageRank, setStageRank] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/rifa", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { enabled: boolean; ranks: RankState[]; participants: Participant[] };
      setEnabled(d.enabled);
      setRanks(d.ranks);
      setParticipants(d.participants);
    } catch {
      toast.error("No se pudo cargar la rifa");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, 5000); // contador de participantes en vivo
    return () => { clearTimeout(first); clearInterval(id); };
  }, [load]);

  async function post(body: Record<string, unknown>) {
    const r = await fetch("/api/admin/rifa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, d: d as { message?: string; position?: number; winner?: { full_name: string | null; points: number }; full_name?: string | null; has_account?: boolean } };
  }

  async function toggle() {
    setBusy("toggle");
    const { ok } = await post({ action: "toggle", enabled: !enabled });
    if (ok) {
      setEnabled(!enabled);
      toast.success(!enabled ? "Banner activado: les aparece en menos de 20 segundos" : "Banner desactivado: ya no se puede anotar nadie más");
    } else toast.error("No se pudo cambiar el banner");
    setBusy(null);
    load();
  }

  async function draw(rankKey: string): Promise<StageWinner | null> {
    setBusy(rankKey);
    const { ok, d } = await post({ action: "draw", rankKey });
    let result: StageWinner | null = null;
    if (ok && d.winner) {
      setLastWinner(`${rankKey}-${d.position}`);
      result = { position: d.position ?? 1, full_name: d.winner.full_name, points: d.winner.points };
    } else toast.error(d.message ?? "No se pudo sortear");
    setBusy(null);
    load();
    return result;
  }

  async function decide(rankKey: string, position: number, claimed: boolean): Promise<boolean> {
    const { ok, d } = await post({ action: claimed ? "claim" : "forfeit", rankKey, position });
    if (ok) toast.success(claimed ? "Premio reclamado. Ya puedes sortear el siguiente." : "No reclamó: se vuelve a sortear ese lugar.");
    else toast.error(d.message ?? "No se pudo guardar");
    await load();
    return ok;
  }

  async function reset() {
    setBusy("reset");
    const { ok } = await post({ action: "reset" });
    if (ok) toast.success("Rifa reiniciada: sin participantes ni ganadores, banner apagado");
    else toast.error("No se pudo reiniciar");
    setConfirmReset(false);
    setLastWinner(null);
    setBusy(null);
    load();
  }

  if (!loaded) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Cargando rifa…</p>;
  }

  const eligibleCount = participants.length;

  return (
    <>
      <PageHeader
        eyebrow="Clase final"
        title="Rifa en vivo"
        description="Solo participan quienes tocan “¡Quiero participar!” mientras el banner está activo, es decir, quienes están en la llamada. Cada premio se rifa entre los participantes de ese rango, un ganador por vez."
      />

      <div className="space-y-6">
        <Panel icon={Ticket} tone="gold" title="1 · Banner “¡Quiero participar!”" description="Lo ven los participantes del en vivo (no admins). Aparece solo, sin recargar, en menos de 20 segundos.">
          <ToggleRow
            title={enabled ? "Banner activo: se están anotando" : "Banner apagado"}
            description={`${eligibleCount} ${eligibleCount === 1 ? "persona participa" : "personas participan"} de la rifa.`}
            on={enabled}
            onTone="success"
            pill={<StatusPill tone={enabled ? "success" : "muted"}>{enabled ? "ON" : "OFF"}</StatusPill>}
          >
            <Button size="sm" variant={enabled ? "outline" : "default"} onClick={toggle} disabled={busy !== null}>
              {busy === "toggle" ? <Loader2 className="w-4 h-4 animate-spin" /> : enabled ? "Desactivar" : "Activar"}
            </Button>
          </ToggleRow>
        </Panel>

        <Panel icon={Dices} title="2 · Rifar los premios" description="Elevate y Prime: más puntos, más chances. Legacy y Expert: todos con la misma chance. Quien gana un premio no vuelve a entrar en otra rifa.">
          <div className="grid gap-4 md:grid-cols-2">
            {[...ranks].reverse().map((r) => {
              const done = r.winners.length >= r.target;
              const next = r.winners.length + 1;
              return (
                <div key={r.key} className="rounded-2xl border border-border p-5 space-y-4" style={{ borderTop: `4px solid ${r.color}` }}>
                  <div>
                    <p className="text-lg font-extrabold">{r.emoji} {r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.prize}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.target} {r.target === 1 ? "ganador" : "ganadores"} · <strong>{r.pool}</strong> en la rifa
                    </p>
                  </div>

                  {r.winners.length > 0 && (
                    <ol className="space-y-2">
                      {r.winners.map((w) => {
                        const fresh = lastWinner === `${r.key}-${w.position}`;
                        return (
                          <li
                            key={w.position}
                            className="rounded-xl px-4 py-3 transition-all"
                            style={{
                              background: fresh ? `color-mix(in srgb, ${r.color} 22%, transparent)` : "var(--muted)",
                              border: fresh ? `2px solid ${r.color}` : "2px solid transparent",
                            }}
                          >
                            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{ordinalWinner(w.position)}</p>
                            <p className={fresh ? "text-xl font-extrabold" : "text-base font-bold"}>🎉 {w.full_name ?? "Participante"}</p>
                            <p className="text-xs font-semibold">{w.claimed ? "✅ Reclamado" : "⏳ Falta confirmar si reclamó"}</p>
                            <p className="text-xs text-muted-foreground">{formatPoints(w.points)} pts</p>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {done && r.winners.every((w) => w.claimed) && <StatusPill tone="success">✅ Ganadores completos</StatusPill>}
                  <Button
                    className="w-full h-12 text-base font-bold gap-2"
                    variant={done ? "outline" : "default"}
                    onClick={() => setStageRank(r.key)}
                    disabled={busy !== null || (!done && r.winners.length === 0 && r.pool === 0)}
                  >
                    <Dices className="w-5 h-5" />
                    {done
                      ? "Ver ganadores"
                      : r.winners.length === 0
                        ? (r.pool === 0 ? "Nadie en la rifa de este rango" : "Iniciar rifa")
                        : `Continuar rifa (${ordinalWinner(next).toLowerCase()})`}
                  </Button>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel
          icon={Users}
          title={`Participantes (${participants.length})`}
          description="Quienes tocaron “¡Quiero participar!”, ordenados por puntos. El rango se calcula con los puntos de ahora."
          action={<Button size="sm" variant="outline" onClick={() => setShowList((v) => !v)}>{showList ? "Ocultar" : "Ver lista"}</Button>}
        >
          {showList && (
            <div className="max-h-[420px] overflow-y-auto text-sm divide-y divide-border">
              {participants.length === 0 && <p className="text-muted-foreground py-2">Todavía no se anotó nadie.</p>}
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.full_name ?? "—"} {p.won && "🏆"}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold capitalize">{p.rank}</p>
                    <p className="text-xs text-muted-foreground">{formatPoints(p.points)} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel icon={RotateCcw} tone="danger" title="Reiniciar rifa" description="Para el simulacro: borra participantes y ganadores y apaga el banner. No toca puntos ni nada más.">
          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">¿Seguro? Se borran todos los participantes y ganadores.</span>
              <Button size="sm" variant="destructive" onClick={reset} disabled={busy !== null}>
                {busy === "reset" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, reiniciar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmReset(false)}>Cancelar</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setConfirmReset(true)} disabled={busy !== null}>Reiniciar rifa</Button>
          )}
        </Panel>
      </div>
      {stageRank && (() => {
        const r = ranks.find((x) => x.key === stageRank);
        if (!r) return null;
        const names = participants
          .filter((p) => p.rank === r.key && !p.won)
          .map((p) => p.full_name ?? "Participante");
        return (
          <RifaStage
            name={r.name}
            emoji={r.emoji}
            color={r.color}
            prize={r.prize}
            target={r.target}
            winners={r.winners.map((w) => ({ position: w.position, full_name: w.full_name, points: w.points, claimed: w.claimed }))}
            candidateNames={names}
            onDraw={() => draw(r.key)}
            onClaim={(pos) => decide(r.key, pos, true)}
            onForfeit={(pos) => decide(r.key, pos, false)}
            onClose={() => setStageRank(null)}
          />
        );
      })()}
    </>
  );
}
