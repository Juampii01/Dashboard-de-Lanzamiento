"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreditCard, MessageCircle, Home, Copy, Loader2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Panel, Stat, StatusPill } from "../_components/ui";
import { relativeTime } from "../_lib/types";

interface Click {
  id: string;
  user_id: string;
  button: string;
  clicked_at: string;
  full_name: string | null;
  email: string;
}

type ButtonKey = "pagar_ahora" | "whatsapp" | "banner_inicio";

const BUTTONS: Record<ButtonKey, { label: string; short: string; icon: typeof CreditCard; weight: number }> = {
  pagar_ahora: { label: "Pagar ahora", short: "Pagar", icon: CreditCard, weight: 3 },
  whatsapp: { label: "Hablar con el equipo", short: "WhatsApp", icon: MessageCircle, weight: 2 },
  banner_inicio: { label: "Banner de mentoría", short: "Banner", icon: Home, weight: 1 },
};

interface Lead {
  user_id: string;
  name: string;
  email: string;
  counts: Record<ButtonKey, number>;
  last: string;
  intent: number; // botón de mayor intención que tocó (3 = pagar)
  total: number;
}

type Filter = "all" | ButtonKey;

const INTENT_LABEL: Record<number, { text: string; tone: "danger" | "gold" | "muted" }> = {
  3: { text: "Alta", tone: "danger" },
  2: { text: "Media", tone: "gold" },
  1: { text: "Baja", tone: "muted" },
};

export function VentasClient() {
  const [clicks, setClicks] = useState<Click[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/admin/proximo-paso-clicks")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setClicks(d.clicks ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Un lead por persona, con cuántas veces tocó cada botón.
  const leads = useMemo(() => {
    const map = new Map<string, Lead>();
    for (const c of clicks) {
      const key = c.button as ButtonKey;
      if (!BUTTONS[key]) continue;
      let l = map.get(c.user_id);
      if (!l) {
        l = {
          user_id: c.user_id,
          name: c.full_name || c.email || "—",
          email: c.email,
          counts: { pagar_ahora: 0, whatsapp: 0, banner_inicio: 0 },
          last: c.clicked_at,
          intent: 0,
          total: 0,
        };
        map.set(c.user_id, l);
      }
      l.counts[key]++;
      l.total++;
      l.intent = Math.max(l.intent, BUTTONS[key].weight);
      if (c.clicked_at > l.last) l.last = c.clicked_at;
    }
    return [...map.values()].sort((a, b) => b.intent - a.intent || b.total - a.total || b.last.localeCompare(a.last));
  }, [clicks]);

  const visible = filter === "all" ? leads : leads.filter((l) => l.counts[filter] > 0);
  const totals = {
    pagar_ahora: leads.filter((l) => l.counts.pagar_ahora > 0).length,
    whatsapp: leads.filter((l) => l.counts.whatsapp > 0).length,
    banner_inicio: leads.filter((l) => l.counts.banner_inicio > 0).length,
  };

  async function copyEmails() {
    const emails = visible.map((l) => l.email).filter(Boolean).join(", ");
    try {
      await navigator.clipboard.writeText(emails);
      toast.success(`${visible.length} emails copiados`);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando clicks…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Personas interesadas" value={leads.length} hint={`${clicks.length} clicks en total`} />
        <Stat label="Tocaron Pagar" value={totals.pagar_ahora} tone="danger" hint="Mayor intención" />
        <Stat label="Pidieron WhatsApp" value={totals.whatsapp} />
        <Stat label="Solo el banner" value={leads.filter((l) => l.intent === 1).length} />
      </div>

      <Panel
        icon={Flame}
        tone="gold"
        title="Leads de “Tu Próximo Paso”"
        description="Una fila por persona, ordenadas por intención: primero quien tocó Pagar, después WhatsApp, después el banner. Es la lista para llamar."
        action={
          <Button size="sm" variant="outline" onClick={copyEmails} disabled={visible.length === 0} className="gap-1.5">
            <Copy className="w-3.5 h-3.5" /> Copiar emails
          </Button>
        }
      >
        <div className="flex flex-wrap gap-1.5 mb-4">
          {([["all", "Todos", leads.length], ...(Object.keys(BUTTONS) as ButtonKey[]).map((k) => [k, BUTTONS[k].short, totals[k]])] as [Filter, string, number][]).map(
            ([key, label, n]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  filter === key ? "border-secondary bg-secondary text-white" : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {label} <span className={filter === key ? "text-white/70" : "text-muted-foreground/70"}>{n}</span>
              </button>
            )
          )}
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Todavía nadie tocó estos botones.</p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5">Persona</th>
                  <th className="px-3 py-2.5">Intención</th>
                  <th className="px-3 py-2.5">Botones tocados</th>
                  <th className="px-5 py-2.5 text-right">Último click</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((l) => (
                  <tr key={l.user_id}>
                    <td className="px-5 py-3">
                      <p className="font-semibold">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill tone={INTENT_LABEL[l.intent].tone}>{INTENT_LABEL[l.intent].text}</StatusPill>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(BUTTONS) as ButtonKey[])
                          .filter((k) => l.counts[k] > 0)
                          .map((k) => {
                            const Icon = BUTTONS[k].icon;
                            return (
                              <span key={k} title={BUTTONS[k].label} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs">
                                <Icon className="w-3 h-3 text-muted-foreground" />
                                {BUTTONS[k].short}
                                {l.counts[k] > 1 && <span className="text-muted-foreground">×{l.counts[k]}</span>}
                              </span>
                            );
                          })}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">{relativeTime(l.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-3">Se consideran los últimos 200 clicks.</p>
      </Panel>
    </div>
  );
}
