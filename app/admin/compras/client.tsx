"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  UserCheck,
  CalendarClock,
  ShoppingBag,
  Search,
  Link2,
  ShieldCheck,
  XCircle,
  RotateCcw,
  Unlink,
  Trash2,
  Loader2,
  Mail,
  Phone,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Panel, Stat, StatusPill, inputClass } from "../_components/ui";
import { relativeTime } from "../_lib/types";
import { parsePurchasesCsv, type ParsedRow } from "./csv";

type Source = "hotmart" | "sem" | "stripe" | "ghl" | "manual";
const SOURCE_LABEL: Record<Source, string> = { hotmart: "Hotmart", sem: "SEM", stripe: "Stripe", ghl: "GHL", manual: "Manual" };

interface Purchase {
  id: string;
  email: string;
  full_name: string | null;
  source: Source;
  external_ref: string | null;
  notes: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  owner: { email: string; full_name: string | null } | null;
}

interface Account {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  access_status: "pending" | "rejected";
  purchase_email_claim: string | null;
  verification_note: string | null;
  verification_requested_at: string | null;
  created_at: string;
}

type Tab = "pending" | "purchases" | "rejected";

export function ComprasClient() {
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expiry, setExpiry] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");

  const load = useCallback(() => {
    return fetch("/api/admin/purchases", { cache: "no-store" })
      .then(async (res) => {
        const d = await res.json();
        if (res.status === 501) { setMissing(true); return; }
        if (!res.ok) throw new Error();
        setPurchases(d.purchases ?? []);
        setAccounts(d.accounts ?? []);
        setExpiry(d.access_expires_at ?? null);
      })
      .catch(() => toast.error("No se pudieron cargar las compras."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = accounts.filter((a) => a.access_status === "pending");
  const rejected = accounts.filter((a) => a.access_status === "rejected");
  const claimed = purchases.filter((p) => p.claimed_by).length;

  if (loading) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</p>;
  }

  if (missing) {
    return (
      <Panel icon={ShoppingBag} tone="danger" title="Falta correr la migración" description="La tabla de compras todavía no existe en la base de datos.">
        <p className="text-sm">
          Ejecuta <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">supabase/migrations/20261022000001_purchases_and_registration.sql</code> en el SQL Editor de Supabase y recarga esta página.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Compras cargadas" value={purchases.length} />
        <Stat label="Con cuenta" value={claimed} tone="success" hint={purchases.length ? `${Math.round((claimed / purchases.length) * 100)}% ya se registró` : undefined} />
        <Stat label="Sin registrarse" value={purchases.length - claimed} hint="Compraron y aún no crearon cuenta" />
        <Stat label="Por verificar" value={pending.length} tone={pending.length ? "danger" : "default"} hint="Cuentas sin compra que coincida" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <ImportPanel onDone={load} />
        <ExpiryPanel value={expiry} onSaved={setExpiry} />
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {([
            ["pending", "Por verificar", pending.length],
            ["purchases", "Compras", purchases.length],
            ["rejected", "Rechazadas", rejected.length],
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

        {tab === "pending" && <AccountsList accounts={pending} purchases={purchases} onChange={load} />}
        {tab === "rejected" && <AccountsList accounts={rejected} purchases={purchases} onChange={load} rejected />}
        {tab === "purchases" && <PurchasesList purchases={purchases} onChange={load} />}
      </div>
    </div>
  );
}

// ─── Acciones ───────────────────────────────────────────────────────────────

async function act(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch("/api/admin/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(
        d.error === "purchase_taken_or_user_has_one"
          ? "Esa compra ya está asociada a otra cuenta (o la cuenta ya tiene una compra)."
          : d.error === "claimed"
            ? "No se puede borrar: la compra ya tiene una cuenta asociada. Desvincúlala primero."
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

// ─── Importar ───────────────────────────────────────────────────────────────

function ImportPanel({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState<Source>("stripe");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => (text.trim() ? parsePurchasesCsv(text) : { rows: [] as ParsedRow[], skipped: 0 }), [text]);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setText(await f.text());
  }

  async function submit() {
    if (!parsed.rows.length) return;
    setBusy(true);
    const d = await act({ action: "import", source, rows: parsed.rows });
    setBusy(false);
    if (!d) return;
    const linked = (d.linked as string[]) ?? [];
    toast.success(
      `${d.inserted} compra(s) nuevas · ${d.already} ya estaban cargadas` +
        (linked.length ? ` · ${linked.length} cuenta(s) en verificación recibieron acceso` : "")
    );
    setText("");
    onDone();
  }

  return (
    <Panel
      icon={Upload}
      title="Cargar compradores"
      description="Pega o sube el CSV exportado de la plataforma de pago. Se lee la columna de email (y nombre y transacción si existen). Las compras repetidas se ignoran."
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={source} onChange={(e) => setSource(e.target.value as Source)} className={cn(inputClass, "w-auto")}>
            {(Object.keys(SOURCE_LABEL) as Source[]).map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Subir archivo .csv
          </Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={"email,nombre,transaccion\nmaria@gmail.com,María López,HP123456\n…\n\nTambién sirve una lista de emails, uno por línea."}
          className={cn(inputClass, "font-mono text-xs resize-y")}
        />
        {text.trim() && (
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">{parsed.rows.length}</strong> compradores detectados
            {parsed.skipped > 0 && <> · {parsed.skipped} fila(s) sin email válido se van a ignorar</>}
            {parsed.rows[0] && (
              <> · ej.: <span className="font-mono">{parsed.rows[0].email}</span>{parsed.rows[0].full_name ? ` (${parsed.rows[0].full_name})` : ""}</>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={submit} disabled={busy || !parsed.rows.length} className="gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Cargar {parsed.rows.length || ""} compra{parsed.rows.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

// ─── Fin del acceso ─────────────────────────────────────────────────────────

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ExpiryPanel({ value, onSaved }: { value: string | null; onSaved: (v: string | null) => void }) {
  const [input, setInput] = useState(toLocalInput(value));
  const [busy, setBusy] = useState(false);
  const dirty = input !== toLocalInput(value);

  async function save() {
    setBusy(true);
    const d = await act({ action: "set_expiry", value: input ? new Date(input).toISOString() : null });
    setBusy(false);
    if (d) {
      onSaved((d.value as string) ?? null);
      toast.success(d.value ? "Fecha de fin guardada." : "Sin fecha de fin: el acceso no vence.");
    }
  }

  return (
    <Panel icon={CalendarClock} title="Fin del acceso" description="Se aplica a cada cuenta cuando queda vinculada a una compra (y a los registros gratuitos). No cambia cuentas ya activas.">
      <div className="space-y-2">
        <input type="datetime-local" value={input} onChange={(e) => setInput(e.target.value)} className={inputClass} />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {value ? `Actual: ${new Date(value).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}` : "Actual: sin vencimiento"}
          </p>
          <Button size="sm" onClick={save} disabled={busy || !dirty}>{busy ? "…" : "Guardar"}</Button>
        </div>
      </div>
    </Panel>
  );
}

// ─── Cuentas por verificar ──────────────────────────────────────────────────

function AccountsList({ accounts, purchases, onChange, rejected }: { accounts: Account[]; purchases: Purchase[]; onChange: () => void; rejected?: boolean }) {
  if (!accounts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
        {rejected ? "No hay cuentas rechazadas." : "No hay cuentas esperando verificación. 🎉"}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {accounts.map((a) => <AccountCard key={a.id} account={a} purchases={purchases} onChange={onChange} rejected={rejected} />)}
    </div>
  );
}

function AccountCard({ account: a, purchases, onChange, rejected }: { account: Account; purchases: Purchase[]; onChange: () => void; rejected?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const free = purchases.filter((p) => !p.claimed_by);
  // Sugerencia: compra libre con el email que declaró, o que se parezca al de la cuenta.
  const suggested = useMemo(() => {
    const claim = a.purchase_email_claim?.toLowerCase();
    const local = a.email.split("@")[0].toLowerCase();
    const nameTokens = (a.full_name ?? "").toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    return free
      .map((p) => {
        let score = 0;
        if (claim && p.email === claim) score += 100;
        if (p.email.split("@")[0] === local) score += 40;
        const pn = (p.full_name ?? "").toLowerCase();
        score += nameTokens.filter((t) => pn.includes(t)).length * 15;
        return { p, score };
      })
      .filter((x) => x.score >= 15)
      .sort((x, y) => y.score - x.score)
      .slice(0, 3)
      .map((x) => x.p);
  }, [a, free]);

  const takenByOther = a.purchase_email_claim ? purchases.find((p) => p.email === a.purchase_email_claim && p.claimed_by) : undefined;

  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 3) return [];
    return free.filter((p) => `${p.email} ${p.full_name ?? ""} ${p.external_ref ?? ""}`.toLowerCase().includes(n)).slice(0, 6);
  }, [q, free]);

  async function run(key: string, body: Record<string, unknown>, okMsg: string) {
    setBusy(key);
    const d = await act(body);
    setBusy(null);
    if (d) { toast.success(okMsg); onChange(); }
  }

  const PurchaseRow = ({ p, highlight }: { p: Purchase; highlight?: boolean }) => (
    <div className={cn("flex items-center justify-between gap-3 rounded-lg border px-3 py-2", highlight ? "border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_5%,transparent)]" : "border-border")}>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{p.email}</p>
        <p className="text-xs text-muted-foreground truncate">
          {p.full_name || "Sin nombre"} · {SOURCE_LABEL[p.source]}{p.external_ref ? ` · ${p.external_ref}` : ""}
        </p>
      </div>
      <Button size="sm" disabled={!!busy} onClick={() => run(`link-${p.id}`, { action: "link", user_id: a.id, purchase_id: p.id }, "Cuenta vinculada. Le avisamos por email.")} className="gap-1.5 shrink-0">
        {busy === `link-${p.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />} Vincular
      </Button>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Quién es */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-foreground">{a.full_name || "—"}</p>
            <StatusPill tone={rejected ? "muted" : "gold"}>{rejected ? "Rechazada" : "Por verificar"}</StatusPill>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" /> <span className="text-foreground break-all">{a.email}</span> <span className="text-xs">(cuenta)</span></p>
            {a.phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <a href={`https://wa.me/${a.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" className="text-foreground hover:underline">{a.phone}</a>
              </p>
            )}
            {a.purchase_email_claim && (
              <p className="flex items-center gap-2 text-muted-foreground"><ShoppingBag className="w-3.5 h-3.5" /> Dice que compró con <span className="font-semibold text-foreground break-all">{a.purchase_email_claim}</span></p>
            )}
            {a.verification_note && (
              <p className="flex items-start gap-2 text-muted-foreground"><MessageSquare className="w-3.5 h-3.5 mt-0.5" /> <span className="text-foreground italic">“{a.verification_note}”</span></p>
            )}
            <p className="text-xs text-muted-foreground pt-1">Registrada {relativeTime(a.created_at)}</p>
          </div>
          {takenByOther && (
            <p className="mt-3 rounded-lg border border-primary/30 bg-primary/[0.05] px-3 py-2 text-xs text-primary">
              La compra de <strong>{takenByOther.email}</strong> ya está asociada a la cuenta {takenByOther.owner?.email ?? "de otra persona"}. Una compra da acceso a una sola cuenta.
            </p>
          )}
        </div>

        {/* Qué hacer */}
        <div className="min-w-0 space-y-3">
          {suggested.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Posibles compras</p>
              {suggested.map((p) => <PurchaseRow key={p.id} p={p} highlight={p.email === a.purchase_email_claim} />)}
            </div>
          )}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Buscar compra libre</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email, nombre o transacción…" className={cn(inputClass, "pl-9")} />
            </div>
            {results.map((p) => <PurchaseRow key={p.id} p={p} />)}
            {q.trim().length >= 3 && !results.length && <p className="text-xs text-muted-foreground px-1">Ninguna compra libre coincide.</p>}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("grant", { action: "grant_manual", user_id: a.id }, "Acceso dado a mano. Le avisamos por email.")} className="gap-1.5">
              {busy === "grant" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Dar acceso sin compra en la lista
            </Button>
            {rejected ? (
              <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run("reopen", { action: "reopen", user_id: a.id }, "Volvió a verificación.")} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Volver a verificación
              </Button>
            ) : (
              <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run("reject", { action: "reject", user_id: a.id }, "Cuenta marcada como sin compra.")} className="gap-1.5 text-primary">
                <XCircle className="w-3.5 h-3.5" /> No compró
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Lista de compras ───────────────────────────────────────────────────────

function PurchasesList({ purchases, onChange }: { purchases: Purchase[]; onChange: () => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "claimed" | "free">("all");
  const [confirm, setConfirm] = useState<{ id: string; kind: "unlink" | "delete" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(50);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return purchases.filter((p) => {
      if (filter === "claimed" && !p.claimed_by) return false;
      if (filter === "free" && p.claimed_by) return false;
      return !n || `${p.email} ${p.full_name ?? ""} ${p.external_ref ?? ""} ${p.owner?.email ?? ""}`.toLowerCase().includes(n);
    });
  }, [purchases, q, filter]);

  async function doConfirm() {
    if (!confirm) return;
    setBusy(true);
    const d = await act({ action: confirm.kind, purchase_id: confirm.id });
    setBusy(false);
    setConfirm(null);
    if (d) { toast.success(confirm.kind === "unlink" ? "Compra liberada. La cuenta volvió a verificación." : "Compra borrada."); onChange(); }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por email, nombre o transacción…" className={cn(inputClass, "pl-9")} />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className={cn(inputClass, "sm:w-52")}>
          <option value="all">Todas</option>
          <option value="claimed">Con cuenta</option>
          <option value="free">Sin registrarse</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Comprador</th>
              <th className="px-4 py-3">Plataforma</th>
              <th className="px-4 py-3">Cuenta</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">{purchases.length ? "Ninguna compra coincide." : "Todavía no cargaste compras."}</td></tr>
            )}
            {list.slice(0, limit).map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{p.email}</p>
                  <p className="text-xs text-muted-foreground">{p.full_name || "Sin nombre"}{p.external_ref ? ` · ${p.external_ref}` : ""}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{SOURCE_LABEL[p.source]}</td>
                <td className="px-4 py-3">
                  {p.claimed_by ? (
                    <div>
                      <StatusPill tone="success"><UserCheck className="w-3 h-3" /> Con cuenta</StatusPill>
                      {p.owner && p.owner.email !== p.email && (
                        <p className="text-xs text-muted-foreground mt-1">Cuenta: <span className="text-foreground">{p.owner.email}</span></p>
                      )}
                    </div>
                  ) : (
                    <StatusPill tone="muted">Sin registrarse</StatusPill>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {confirm?.id === p.id ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{confirm.kind === "unlink" ? "¿Quitarle el acceso a la cuenta?" : "¿Borrar la compra?"}</span>
                      <Button size="sm" variant="outline" onClick={() => setConfirm(null)}>No</Button>
                      <Button size="sm" disabled={busy} onClick={doConfirm}>Sí</Button>
                    </span>
                  ) : p.claimed_by ? (
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ id: p.id, kind: "unlink" })} className="gap-1.5 text-muted-foreground">
                      <Unlink className="w-3.5 h-3.5" /> Desvincular
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ id: p.id, kind: "delete" })} className="gap-1.5 text-muted-foreground" aria-label="Borrar compra">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length > limit && (
        <div className="border-t border-border p-3 text-center">
          <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + 100)}>Ver más ({list.length - limit} restantes)</Button>
        </div>
      )}
    </div>
  );
}
