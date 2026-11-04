"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Gift, Target, Webhook, Inbox, Loader2, Plus, Pencil, Trash2, Check, X, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Panel, Stat, StatusPill, inputClass } from "../_components/ui";
import { relativeTime } from "../_lib/types";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Proof = "image" | "link" | "text" | "none";
const PROOF_LABEL: Record<Proof, string> = { image: "Captura", link: "Link", text: "Texto", none: "Sin prueba" };

interface Mission {
  id: string;
  day_number: number | null;
  title: string;
  description: string | null;
  action_url: string | null;
  proof: Proof;
  points_reward: number;
  sort_order: number;
  is_active: boolean;
}
interface Submission {
  id: string;
  mission_id: string;
  content_type: Proof;
  content_text: string | null;
  image_url: string | null;
  status: "approved" | "rejected";
  points_awarded: number;
  created_at: string;
  user: { email: string; full_name: string | null } | null;
}
interface Tier {
  id: string;
  points: number;
  title: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}
interface Claim {
  id: string;
  tier_id: string;
  points_at_request: number;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
  user: { email: string; full_name: string | null; total_points: number } | null;
}
interface WebhookLog {
  id: string;
  product: string | null;
  email?: string | null;
  processed: boolean;
  error: string | null;
  purchase_id?: string | null;
  body: unknown;
  raw_body: string | null;
  received_at: string;
}

type Tab = "claims" | "tiers" | "missions" | "webhooks";

async function post(url: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(
        d.error === "has_claims" ? "Ese nivel ya tiene solicitudes: desactívalo en lugar de borrarlo."
        : d.error === "has_submissions" ? "Esa misión ya tiene respuestas: desactívala en lugar de borrarla."
        : d.error === "invalid_payload" ? `Revisa los datos${d.detail ? `: ${d.detail}` : "."}`
        : "No se pudo completar la acción."
      );
      return null;
    }
    return d;
  } catch {
    toast.error("Error de conexión.");
    return null;
  }
}

// ─── Página ──────────────────────────────────────────────────────────────────

export function OndemandAdminClient() {
  const [tab, setTab] = useState<Tab>("claims");
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);

  const load = useCallback(async () => {
    try {
      const [m, r, w] = await Promise.all([
        fetch("/api/admin/ondemand/missions", { cache: "no-store" }),
        fetch("/api/admin/ondemand/rewards", { cache: "no-store" }),
        fetch("/api/admin/ondemand/webhooks", { cache: "no-store" }),
      ]);
      if (m.status === 501 || r.status === 501) { setMissing(true); return; }
      const [md, rd, wd] = await Promise.all([m.json(), r.json(), w.json().catch(() => ({}))]);
      setMissions(md.missions ?? []);
      setSubs(md.submissions ?? []);
      setTiers(rd.tiers ?? []);
      setClaims(rd.claims ?? []);
      setLogs(wd.logs ?? []);
    } catch {
      toast.error("No se pudieron cargar los datos de On Demand.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingClaims = claims.filter((c) => c.status === "pending").length;
  const failedLogs = logs.filter((l) => !l.processed).length;

  if (loading) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</p>;
  }
  if (missing) {
    return (
      <Panel icon={Gift} tone="danger" title="Falta correr la migración" description="Las tablas de misiones y premios de On Demand todavía no existen.">
        <p className="text-sm">
          Aplica <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">supabase/migrations/20261104000001_ondemand_fase2.sql</code> en Supabase y recarga esta página.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Premios por revisar" value={pendingClaims} tone={pendingClaims ? "danger" : "default"} />
        <Stat label="Niveles activos" value={tiers.filter((t) => t.is_active).length} />
        <Stat label="Misiones activas" value={missions.filter((m) => m.is_active).length} />
        <Stat label="Webhooks con error" value={failedLogs} tone={failedLogs ? "danger" : "default"} hint={`${logs.length} recibidos (últimos 100)`} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {([
          ["claims", "Solicitudes de premios", pendingClaims],
          ["tiers", "Niveles de premios", tiers.length],
          ["missions", "Misiones fijas", missions.length],
          ["webhooks", "Webhooks de GHL", logs.length],
        ] as [Tab, string, number][]).map(([k, label, n]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              tab === k ? "border-secondary bg-secondary text-white" : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            <span className={cn("text-[11px] tabular-nums", tab === k ? "text-white/70" : "text-muted-foreground/70")}>{n}</span>
          </button>
        ))}
      </div>

      {tab === "claims" && <ClaimsList claims={claims} tiers={tiers} onChange={load} />}
      {tab === "tiers" && <TiersEditor tiers={tiers} onChange={load} />}
      {tab === "missions" && <MissionsEditor missions={missions} subs={subs} onChange={load} />}
      {tab === "webhooks" && <WebhookLogs logs={logs} />}
    </div>
  );
}

// ─── Solicitudes de premios ──────────────────────────────────────────────────

function ClaimsList({ claims, tiers, onChange }: { claims: Claim[]; tiers: Tier[]; onChange: () => void }) {
  const tierById = useMemo(() => Object.fromEntries(tiers.map((t) => [t.id, t])), [tiers]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function review(c: Claim, status: Claim["status"]) {
    setBusy(c.id);
    const ok = await post("/api/admin/ondemand/rewards", { action: "review", claim_id: c.id, status, note: notes[c.id] ?? c.note ?? null });
    setBusy(null);
    if (ok) { toast.success(status === "approved" ? "Premio aprobado." : status === "rejected" ? "Solicitud rechazada." : "Volvió a pendiente."); onChange(); }
  }

  if (!claims.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
        Nadie pidió un premio todavía. Cuando alguien llegue a los puntos de un nivel y lo pida, aparece aquí.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {claims.map((c) => {
        const t = tierById[c.tier_id];
        return (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{c.user?.full_name || c.user?.email || "—"}</p>
                  <StatusPill tone={c.status === "approved" ? "success" : c.status === "rejected" ? "muted" : "gold"}>
                    {c.status === "approved" ? "Aprobado" : c.status === "rejected" ? "Rechazado" : "Pendiente"}
                  </StatusPill>
                </div>
                <p className="text-sm text-muted-foreground break-all">{c.user?.email}</p>
                <p className="text-sm mt-1">
                  <strong>{t?.title ?? "Nivel borrado"}</strong> · {t?.points?.toLocaleString("es-US") ?? "?"} pts
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tenía {c.points_at_request.toLocaleString("es-US")} pts al pedirlo · hoy {c.user?.total_points?.toLocaleString("es-US") ?? "?"} · {relativeTime(c.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.status !== "approved" && (
                  <Button size="sm" disabled={busy === c.id} onClick={() => review(c, "approved")} className="gap-1.5"><Check className="w-3.5 h-3.5" /> Aprobar</Button>
                )}
                {c.status !== "rejected" && (
                  <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => review(c, "rejected")} className="gap-1.5"><X className="w-3.5 h-3.5" /> Rechazar</Button>
                )}
                {c.status !== "pending" && (
                  <Button size="sm" variant="ghost" disabled={busy === c.id} onClick={() => review(c, "pending")} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Pendiente</Button>
                )}
              </div>
            </div>
            <input
              className={cn(inputClass, "mt-3")}
              placeholder="Nota para el equipo o para la persona (ej. código entregado, fecha de alta en Connect)…"
              value={notes[c.id] ?? c.note ?? ""}
              onChange={(e) => setNotes((p) => ({ ...p, [c.id]: e.target.value }))}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Niveles de premios ──────────────────────────────────────────────────────

const EMPTY_TIER = { id: undefined as string | undefined, points: 5000, title: "", description: "", sort_order: 0, is_active: true };

function TiersEditor({ tiers, onChange }: { tiers: Tier[]; onChange: () => void }) {
  const [form, setForm] = useState<typeof EMPTY_TIER | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form) return;
    setBusy(true);
    const ok = await post("/api/admin/ondemand/rewards", { action: "save_tier", ...form, description: form.description || null });
    setBusy(false);
    if (ok) { toast.success("Nivel guardado."); setForm(null); onChange(); }
  }
  async function remove(id: string) {
    const ok = await post("/api/admin/ondemand/rewards", { action: "delete_tier", id });
    if (ok) { toast.success("Nivel borrado."); onChange(); }
  }

  return (
    <Panel
      icon={Gift}
      title="Niveles de premios"
      description="Sin sorteo: cada persona que llega a los puntos de un nivel puede pedir ese premio una vez. Los puntos no se descuentan."
      action={<Button size="sm" onClick={() => setForm({ ...EMPTY_TIER })} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Nuevo nivel</Button>}
    >
      {form && (
        <div className="mb-4 rounded-xl border border-secondary/40 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <label className="text-xs font-semibold text-muted-foreground">Puntos
              <input type="number" min={1} className={cn(inputClass, "mt-1")} value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">Premio
              <input className={cn(inputClass, "mt-1")} placeholder="Ej. 1 mes gratis de GovBidder Connect" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
          </div>
          <label className="block text-xs font-semibold text-muted-foreground">Descripción (opcional)
            <textarea rows={2} className={cn(inputClass, "mt-1")} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Activo</label>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
            <Button size="sm" disabled={busy || form.title.trim().length < 2 || form.points < 1} onClick={save}>{busy ? "…" : "Guardar"}</Button>
          </div>
        </div>
      )}
      {!tiers.length && !form && <p className="text-sm text-muted-foreground">Todavía no hay niveles. Crea el primero con los puntos y el premio que definió Santo.</p>}
      <div className="divide-y divide-border rounded-xl border border-border">
        {tiers.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3">
            <span className="w-24 shrink-0 font-mono text-sm font-bold tabular-nums">{t.points.toLocaleString("es-US")}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{t.title}</p>
              {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
            </div>
            {!t.is_active && <StatusPill tone="muted">Inactivo</StatusPill>}
            <Button size="sm" variant="ghost" onClick={() => setForm({ id: t.id, points: t.points, title: t.title, description: t.description ?? "", sort_order: t.sort_order, is_active: t.is_active })}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => remove(t.id)} className="text-primary"><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── Misiones fijas ──────────────────────────────────────────────────────────

const EMPTY_MISSION = {
  id: undefined as string | undefined,
  day_number: null as number | null,
  title: "",
  description: "",
  action_url: "",
  proof: "image" as Proof,
  points_reward: 100,
  sort_order: 0,
  is_active: true,
};

function MissionsEditor({ missions, subs, onChange }: { missions: Mission[]; subs: Submission[]; onChange: () => void }) {
  const [form, setForm] = useState<typeof EMPTY_MISSION | null>(null);
  const [busy, setBusy] = useState(false);
  const titleById = useMemo(() => Object.fromEntries(missions.map((m) => [m.id, m.title])), [missions]);

  async function save() {
    if (!form) return;
    setBusy(true);
    const ok = await post("/api/admin/ondemand/missions", {
      action: "save",
      ...form,
      description: form.description || null,
      action_url: form.action_url || null,
    });
    setBusy(false);
    if (ok) { toast.success("Misión guardada."); setForm(null); onChange(); }
  }
  async function remove(id: string) {
    const ok = await post("/api/admin/ondemand/missions", { action: "delete", id });
    if (ok) { toast.success("Misión borrada."); onChange(); }
  }
  async function reject(id: string) {
    const ok = await post("/api/admin/ondemand/missions", { action: "reject", submission_id: id });
    if (ok) { toast.success("Respuesta rechazada y puntos descontados."); onChange(); }
  }

  return (
    <div className="space-y-6">
      <Panel
        icon={Target}
        title="Misiones fijas"
        description="Las ven todas las personas de On Demand, siempre. No hace falta programarlas: suman puntos una vez por persona."
        action={<Button size="sm" onClick={() => setForm({ ...EMPTY_MISSION })} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Nueva misión</Button>}
      >
        {form && (
          <div className="mb-4 rounded-xl border border-secondary/40 p-4 space-y-3">
            <label className="block text-xs font-semibold text-muted-foreground">Título
              <input className={cn(inputClass, "mt-1")} placeholder="Ej. Comenta en el último video de @govbidder" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-muted-foreground">Instrucciones (opcional)
              <textarea rows={2} className={cn(inputClass, "mt-1")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-muted-foreground">Link de la acción (opcional)
              <input className={cn(inputClass, "mt-1")} placeholder="https://instagram.com/…" value={form.action_url} onChange={(e) => setForm({ ...form, action_url: e.target.value })} />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-muted-foreground">Día
                <select className={cn(inputClass, "mt-1")} value={form.day_number ?? ""} onChange={(e) => setForm({ ...form, day_number: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">General</option>
                  {[1, 2, 3, 4].map((d) => <option key={d} value={d}>Día {d}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-muted-foreground">Prueba
                <select className={cn(inputClass, "mt-1")} value={form.proof} onChange={(e) => setForm({ ...form, proof: e.target.value as Proof })}>
                  {(Object.keys(PROOF_LABEL) as Proof[]).map((p) => <option key={p} value={p}>{PROOF_LABEL[p]}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-muted-foreground">Puntos
                <input type="number" min={0} className={cn(inputClass, "mt-1")} value={form.points_reward} onChange={(e) => setForm({ ...form, points_reward: Number(e.target.value) })} />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Activa</label>
              <label className="flex items-center gap-2 text-sm">Orden
                <input type="number" min={0} className={cn(inputClass, "w-20")} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </label>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
              <Button size="sm" disabled={busy || form.title.trim().length < 2} onClick={save}>{busy ? "…" : "Guardar"}</Button>
            </div>
          </div>
        )}
        {!missions.length && !form && <p className="text-sm text-muted-foreground">Todavía no hay misiones.</p>}
        <div className="divide-y divide-border rounded-xl border border-border">
          {missions.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3">
              <span className="w-16 shrink-0 text-xs font-bold text-muted-foreground">{m.day_number ? `Día ${m.day_number}` : "General"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{m.title}</p>
                <p className="text-xs text-muted-foreground">{PROOF_LABEL[m.proof]} · {m.points_reward} pts</p>
              </div>
              {!m.is_active && <StatusPill tone="muted">Inactiva</StatusPill>}
              <Button size="sm" variant="ghost" onClick={() => setForm({
                id: m.id, day_number: m.day_number, title: m.title, description: m.description ?? "", action_url: m.action_url ?? "",
                proof: m.proof, points_reward: m.points_reward, sort_order: m.sort_order, is_active: m.is_active,
              })}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(m.id)} className="text-primary"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={Inbox} title="Respuestas recientes" description="Se aprueban solas al enviarse. Si alguna no corresponde, recházala y se descuentan los puntos.">
        {!subs.length && <p className="text-sm text-muted-foreground">Sin respuestas todavía.</p>}
        <div className="space-y-2">
          {subs.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{s.user?.full_name || s.user?.email} · <span className="font-normal text-muted-foreground">{titleById[s.mission_id] ?? "Misión borrada"}</span></p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.content_type === "image" && s.image_url ? <a href={s.image_url} target="_blank" rel="noreferrer" className="underline">Ver captura</a> : s.content_text || "—"} · {relativeTime(s.created_at)}
                </p>
              </div>
              <StatusPill tone={s.status === "approved" ? "success" : "muted"}>{s.status === "approved" ? `+${s.points_awarded}` : "Rechazada"}</StatusPill>
              {s.status === "approved" && <Button size="sm" variant="ghost" onClick={() => reject(s.id)} className="text-primary">Rechazar</Button>}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ─── Webhooks de GHL ─────────────────────────────────────────────────────────

function WebhookLogs({ logs }: { logs: WebhookLog[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Panel
      icon={Webhook}
      title="Webhooks de GoHighLevel"
      description="Cada compra que manda el workflow de Santo. Si una no se pudo leer, cárgala a mano en Compras y accesos → On Demand."
    >
      {!logs.length && <p className="text-sm text-muted-foreground">Todavía no llegó ningún webhook.</p>}
      <div className="space-y-2">
        {logs.map((l) => (
          <div key={l.id} className="rounded-lg border border-border">
            <button type="button" onClick={() => setOpen(open === l.id ? null : l.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left">
              <StatusPill tone={l.processed && !l.error ? "success" : l.processed ? "gold" : "danger"}>
                {l.processed && !l.error ? "Procesado" : l.processed ? "Con aviso" : "Error"}
              </StatusPill>
              <span className="text-sm font-semibold truncate flex-1">{l.email || "(sin email)"}</span>
              <span className="text-xs text-muted-foreground">{l.product ?? "?"} · {relativeTime(l.received_at)}</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {open === l.id && (
              <div className="border-t border-border px-3 py-2 space-y-2">
                {l.error && <p className="text-xs text-primary">{l.error}</p>}
                <pre className="max-h-72 overflow-auto rounded bg-muted p-2 text-[11px] leading-snug">
                  {l.body ? JSON.stringify(l.body, null, 2) : l.raw_body ?? "(vacío)"}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
