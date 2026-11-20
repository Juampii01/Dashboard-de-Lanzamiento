"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, Stat, StatusPill, ToggleRow } from "../_components/ui";

type Answer = "mentoria_pagar" | "mentoria_hablar" | "mentoria_no" | null;
interface Person {
  user_id: string; full_name: string | null; email: string; phone: string | null; points: number;
  seen_at: string | null; answer: Answer; answered_at: string | null;
}
interface Data {
  enabled: boolean;
  totals: { seen: number; pagar: number; hablar: number; no: number; sin_respuesta: number };
  people: Person[];
}

const FILTERS: { key: "hablar" | "pagar" | "no" | "sin"; label: string; answer: Answer }[] = [
  { key: "hablar", label: "Hablar con el equipo", answer: "mentoria_hablar" },
  { key: "pagar", label: "Pagar ahora", answer: "mentoria_pagar" },
  { key: "no", label: "Ahora no me interesa", answer: "mentoria_no" },
  { key: "sin", label: "Sin respuesta", answer: null },
];

function waLink(phone: string | null) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length === 10) return `https://wa.me/1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `https://wa.me/${d}`;
  return null;
}

/** Ventana de la mentoría: activar/desactivar y ver quién respondió qué. */
export function MentoriaPopupPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("hablar");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/mentoria-popup", { cache: "no-store" });
      if (r.ok) setData((await r.json()) as Data);
    } catch { /* reintenta en el próximo ciclo */ }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, 15000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [load]);

  async function toggle() {
    if (!data) return;
    setSaving(true);
    const r = await fetch("/api/admin/mentoria-popup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !data.enabled }),
    });
    if (r.ok) toast.success(!data.enabled ? "Ventana activada: aparece en menos de 20 segundos" : "Ventana desactivada");
    else toast.error("No se pudo cambiar");
    setSaving(false);
    load();
  }

  const current = FILTERS.find((f) => f.key === filter)!;
  const list = (data?.people ?? []).filter((p) => p.answer === current.answer);

  return (
    <Panel
      icon={GraduationCap}
      tone="gold"
      title="Ventana de la mentoría (pantalla completa)"
      description="Aparece una sola vez por persona, a todos los participantes menos admins (hayan hecho el Día 4 o no). Botones: Pagar ahora, Hablar con el equipo antes y Ahora no me interesa."
    >
      {!data ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</p>
      ) : (
        <div className="space-y-5">
          <ToggleRow
            title={data.enabled ? "Ventana activa" : "Ventana apagada"}
            description="Al activarla les aparece en menos de 20 segundos, sin recargar."
            on={data.enabled}
            onTone="success"
            pill={<StatusPill tone={data.enabled ? "success" : "muted"}>{data.enabled ? "ON" : "OFF"}</StatusPill>}
          >
            <Button size="sm" variant={data.enabled ? "outline" : "default"} onClick={toggle} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : data.enabled ? "Desactivar" : "Activar"}
            </Button>
          </ToggleRow>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Stat label="La vieron" value={data.totals.seen} />
            <Stat label="Hablar con el equipo" value={data.totals.hablar} tone="success" />
            <Stat label="Pagar ahora" value={data.totals.pagar} tone="danger" />
            <Stat label="Ahora no me interesa" value={data.totals.no} />
            <Stat label="Sin respuesta" value={data.totals.sin_respuesta} hint="La vieron y no tocaron nada" />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
                {f.label}
              </Button>
            ))}
          </div>

          <div className="max-h-[420px] overflow-y-auto text-sm divide-y divide-border">
            {list.length === 0 && <p className="text-muted-foreground py-2">Nadie todavía.</p>}
            {list.map((p) => {
              const wa = waLink(p.phone);
              const when = new Date(p.answered_at ?? p.seen_at ?? "").toLocaleString("es", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
              return (
                <div key={p.user_id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}{p.phone ? ` · ${p.phone}` : ""} · {when}</p>
                  </div>
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary shrink-0">WhatsApp</a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}
