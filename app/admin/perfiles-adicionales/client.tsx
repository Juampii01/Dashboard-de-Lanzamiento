"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { inputClass, StatusPill } from "../_components/ui";

type Status = "requested" | "approved" | "rejected" | "paid";
type Row = {
  id: string;
  partner_name: string;
  partner_email: string;
  company_name: string | null;
  message: string | null;
  status: Status;
  price_label: string | null;
  payment_url: string | null;
  admin_note: string | null;
  created_at: string;
  paid_at: string | null;
  host: { full_name: string | null; email: string; phone: string | null } | null;
};

const STATUS: Record<Status, { label: string; tone: "gold" | "success" | "danger" | "muted" | "default" }> = {
  requested: { label: "Esperando cotización", tone: "gold" },
  approved: { label: "Aprobada · falta pagar", tone: "default" },
  paid: { label: "Pagada", tone: "success" },
  rejected: { label: "Rechazada", tone: "danger" },
};

const fmt = (iso: string) => new Date(iso).toLocaleString("es", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function RowCard({ r, defaultUrl, onDone }: { r: Row; defaultUrl: string | null; onDone: () => void }) {
  const [price, setPrice] = useState(r.price_label ?? "");
  const [url, setUrl] = useState(r.payment_url ?? defaultUrl ?? "");
  const [note, setNote] = useState(r.admin_note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/seats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id: r.id, ...extra }),
    }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) {
      setErr(d.error === "invalid_data" ? "Revisa el precio y que el link empiece con https://" : "No se pudo guardar. Intenta de nuevo.");
      return;
    }
    onDone();
  }

  const editable = r.status === "requested" || r.status === "approved";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-foreground">
            {r.partner_name}
            {r.company_name ? <span className="text-muted-foreground font-semibold"> · {r.company_name}</span> : null}
          </p>
          <p className="text-sm text-muted-foreground break-all">{r.partner_email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Lo pidió <strong className="text-foreground">{r.host?.full_name ?? r.host?.email ?? "—"}</strong>
            {r.host?.email ? ` (${r.host.email}${r.host.phone ? ` · ${r.host.phone}` : ""})` : ""} · {fmt(r.created_at)}
          </p>
        </div>
        <StatusPill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</StatusPill>
      </div>

      {r.message && <p className="text-sm text-foreground bg-muted rounded-lg px-3 py-2 whitespace-pre-wrap">“{r.message}”</p>}

      {editable && (
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Precio que verá</label>
            <input className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="USD 150" maxLength={60} />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Link de pago</label>
            <input className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://buy.stripe.com/…" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-muted-foreground mb-1">Nota para el participante (opcional)</label>
            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Ej.: incluye acceso completo hasta el 20/12" />
          </div>
        </div>
      )}

      {r.status === "paid" && (
        <p className="text-sm text-muted-foreground">
          {r.price_label ? `${r.price_label} · ` : ""}Pagada {r.paid_at ? fmt(r.paid_at) : ""}. Se le envió el link de registro a {r.partner_email}.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {editable && (
          <button
            disabled={busy || !price.trim() || !url.trim()}
            onClick={() => act("approve", { price_label: price.trim(), payment_url: url.trim(), admin_note: note.trim() })}
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {r.status === "approved" ? "Actualizar cotización" : "Aprobar y enviar cotización"}
          </button>
        )}
        {r.status === "approved" && (
          <button
            disabled={busy}
            onClick={() => confirm(`¿Confirmas que ${r.host?.full_name ?? "el participante"} ya pagó? Se crea el acceso para ${r.partner_email} y se le envía el registro.`) && act("mark_paid")}
            className="rounded-lg border border-[var(--success)] px-4 py-2 text-sm font-bold text-[var(--success)] disabled:opacity-50"
          >
            Marcar pagado
          </button>
        )}
        {editable && (
          <button
            disabled={busy}
            onClick={() => confirm("¿Rechazar esta solicitud?") && act("reject", { admin_note: note.trim() })}
            className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-primary disabled:opacity-50"
          >
            Rechazar
          </button>
        )}
        {r.status === "rejected" && (
          <button disabled={busy} onClick={() => act("reopen")} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50">
            Volver a abrir
          </button>
        )}
      </div>
      {err && <p className="text-sm font-semibold text-primary">{err}</p>}
    </div>
  );
}

export function PerfilesAdicionalesClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [defaultUrl, setDefaultUrl] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(() => {
    fetch("/api/admin/seats")
      .then((r) => r.json())
      .then((d) => {
        setRows(d.ok ? d.requests : []);
        setDefaultUrl(d.defaultPaymentUrl ?? null);
      })
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  if (!rows) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">Todavía nadie pidió una cotización. Cuando alguien la pida, aparece aquí y en el menú.</p>;

  const order: Status[] = ["requested", "approved", "paid", "rejected"];
  const sorted = [...rows].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return (
    <div className="space-y-4">
      {sorted.map((r) => (
        <RowCard key={`${r.id}-${r.status}`} r={r} defaultUrl={defaultUrl} onDone={() => { load(); router.refresh(); }} />
      ))}
    </div>
  );
}
