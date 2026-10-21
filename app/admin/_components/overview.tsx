"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Pause, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, Stat, StatusPill } from "./ui";
import { useOnlineCount, useSetting } from "./panels";
import type { Segment } from "../_lib/types";

export interface FunnelData {
  registered: number;
  entered: number;
  days: number[]; // completados D1..D4
}

export function OnlineStat() {
  const online = useOnlineCount();
  return <Stat live label="Conectados ahora" value={online === null ? "…" : online} hint="Se actualiza cada 20 s" tone="success" />;
}

/** Tira de estado: bloqueo por llamada, pausa de puntos y cierre del acceso. */
export function LiveStatus() {
  const [locked, setLocked] = useState<boolean | null>(null);
  const paused = useSetting("points_paused");
  const closed = useSetting("access_closed");

  useEffect(() => {
    fetch("/api/admin/dashboard-lock")
      .then((r) => r.json())
      .then((d) => setLocked(!!d?.is_locked))
      .catch(() => setLocked(false));
  }, []);

  const items = [
    {
      href: "/admin/en-vivo",
      icon: Radio,
      label: "Dashboard",
      loading: locked === null,
      alert: !!locked,
      on: "Bloqueado por llamada",
      off: "Abierto",
    },
    {
      href: "/admin/cierre",
      icon: Pause,
      label: "Puntos",
      loading: paused.loading,
      alert: paused.value === "true",
      on: "Pausados",
      off: "Activos",
    },
    {
      href: "/admin/cierre",
      icon: Lock,
      label: "Acceso",
      loading: closed.loading,
      alert: closed.value === "true",
      on: "Cerrado (challenge finalizado)",
      off: "Abierto",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.label}
            href={it.href}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
              it.alert ? "border-primary/40 bg-primary/[0.05] hover:bg-primary/[0.08]" : "border-border bg-card hover:border-secondary/40"
            )}
          >
            <span
              className={cn(
                "grid place-items-center w-8 h-8 rounded-lg shrink-0",
                it.alert ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{it.label}</p>
              <p className={cn("text-sm font-semibold truncate", it.alert ? "text-primary" : "text-foreground")}>
                {it.loading ? "…" : it.alert ? it.on : it.off}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </div>
  );
}

const SEG_TABS: { key: Segment | "all"; label: string }[] = [
  { key: "paid", label: "Pagos" },
  { key: "free", label: "Gratuitos" },
  { key: "all", label: "Todos" },
];

export function FunnelPanel({ funnel }: { funnel: Record<Segment | "all", FunnelData> }) {
  const [seg, setSeg] = useState<Segment | "all">("paid");
  const f = funnel[seg];
  const steps = [
    { label: "Registrados", value: f.registered },
    { label: "Ingresaron", value: f.entered },
    { label: "Completaron Día 1", value: f.days[0] },
    { label: "Completaron Día 2", value: f.days[1] },
    { label: "Completaron Día 3", value: f.days[2] },
    { label: "Completaron Día 4", value: f.days[3] },
  ];
  const max = Math.max(1, f.registered);

  return (
    <Panel
      title="Embudo del challenge"
      description="Cuántos avanzan en cada paso. El porcentaje es sobre los registrados."
      action={
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/60">
          {SEG_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setSeg(t.key)}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-colors",
                seg === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-2.5">
        {steps.map((s, i) => {
          const pct = Math.round((s.value / max) * 100);
          const prev = i > 0 ? steps[i - 1].value : null;
          const drop = prev && prev > 0 ? Math.round(((prev - s.value) / prev) * 100) : null;
          return (
            <div key={s.label} className="grid grid-cols-[130px_1fr_92px] sm:grid-cols-[160px_1fr_120px] items-center gap-3">
              <p className="text-[13px] font-semibold text-foreground truncate">{s.label}</p>
              <div className="h-7 rounded-md bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-md transition-[width] duration-500", i < 2 ? "bg-secondary" : "bg-primary")}
                  style={{ width: `${Math.max(pct, s.value > 0 ? 2 : 0)}%`, opacity: i < 2 ? 1 : 1 - (i - 2) * 0.12 }}
                />
              </div>
              <p className="text-right text-[13px] tabular-nums">
                <span className="font-bold text-foreground">{s.value}</span>
                <span className="text-muted-foreground"> · {pct}%</span>
                {drop !== null && drop > 0 && <span className="block text-[10px] text-muted-foreground">−{drop}% vs. anterior</span>}
              </p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** Contadores chicos para los accesos rápidos (reportes pendientes / leads). */
export function PendingCounts({ kind }: { kind: "reports" | "leads" }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const url = kind === "reports" ? "/api/admin/web-reports" : "/api/admin/proximo-paso-clicks";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!d?.ok) return;
        if (kind === "reports") {
          setN((d.reports ?? []).filter((r: { status: string }) => r.status === "pending").length);
        } else {
          const ids = new Set((d.clicks ?? []).filter((c: { button: string }) => c.button === "pagar_ahora").map((c: { user_id: string }) => c.user_id));
          setN(ids.size);
        }
      })
      .catch(() => {});
  }, [kind]);
  if (n === null || n === 0) return null;
  return (
    <StatusPill tone={kind === "reports" ? "danger" : "gold"}>
      {kind === "reports" ? `${n} reporte${n === 1 ? "" : "s"} pendiente${n === 1 ? "" : "s"}` : `${n} tocaron "Pagar ahora"`}
    </StatusPill>
  );
}
