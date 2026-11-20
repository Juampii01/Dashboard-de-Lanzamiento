"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Excluded { email: string; reason: string | null; full_name: string | null; created_at: string }

/**
 * Excluidos de la rifa. Vive acá (y no en la pantalla de la rifa) para que no
 * se vea al compartir pantalla: en la rifa figuran como cualquier
 * participante, pero nunca salen sorteados.
 */
export function RifaExcludedPanel() {
  const [list, setList] = useState<Excluded[]>([]);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/rifa", { cache: "no-store" });
      const d = (await r.json()) as { excluded?: Excluded[] };
      setList(d.excluded ?? []);
    } catch { /* se reintenta al volver a entrar */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function post(body: Record<string, unknown>) {
    const r = await fetch("/api/admin/rifa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: r.ok, d: (await r.json().catch(() => ({}))) as { message?: string; full_name?: string | null; has_account?: boolean } };
  }

  async function add() {
    const e = email.trim();
    if (!e) return;
    setBusy("add");
    const { ok, d } = await post({ action: "exclude", email: e, reason });
    if (ok) {
      toast.success(d.has_account ? `Excluido: ${d.full_name ?? e}` : `Excluido ${e} (todavía no hay cuenta con ese email)`);
      setEmail("");
      setReason("");
    } else toast.error(d.message ?? "No se pudo excluir");
    setBusy(null);
    load();
  }

  async function remove(e: string) {
    setBusy(e);
    const { ok } = await post({ action: "unexclude", email: e });
    if (ok) toast.success("Vuelve a participar normalmente");
    else toast.error("No se pudo quitar");
    setBusy(null);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="Email de la cuenta"
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
        />
        <input
          className="flex-1 min-w-[160px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="Motivo (opcional, solo interno)"
          value={reason}
          maxLength={200}
          onChange={(ev) => setReason(ev.target.value)}
        />
        <Button size="sm" onClick={add} disabled={busy !== null || !email.trim()}>
          {busy === "add" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
        </Button>
      </div>
      <div className="divide-y divide-border text-sm">
        {list.length === 0 && <p className="text-muted-foreground py-2">No hay nadie excluido.</p>}
        {list.map((x) => (
          <div key={x.email} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{x.full_name ?? "Sin cuenta con ese email"}</p>
              <p className="text-xs text-muted-foreground truncate">{x.email}{x.reason ? ` · ${x.reason}` : ""}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => remove(x.email)} disabled={busy !== null}>
              {busy === x.email ? <Loader2 className="w-4 h-4 animate-spin" /> : "Quitar"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
