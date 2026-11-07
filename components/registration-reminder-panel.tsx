"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Product = "live" | "ondemand";

const LABELS: Record<Product, string> = {
  live: "En vivo · noviembre",
  ondemand: "On Demand (grabado)",
};

// Recordatorio de registro a quienes pagaron y todavía no crearon su cuenta.
// Además del envío manual, sale uno automático por día (máx. 3 por persona,
// cada 48 h como mínimo) desde /api/cron/registration-reminder.
export function RegistrationReminderPanel() {
  const [counts, setCounts] = useState<Partial<Record<Product, { total: number; neverReminded: number }>>>({});
  const [busy, setBusy] = useState<null | Product | `test-${Product}`>(null);
  const [progress, setProgress] = useState("");

  function load() {
    (["live", "ondemand"] as Product[]).forEach((product) => {
      fetch(`/api/admin/registration-reminder?product=${product}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) setCounts((prev) => ({ ...prev, [product]: { total: d.total, neverReminded: d.neverReminded } }));
        })
        .catch(() => {});
    });
  }
  useEffect(load, []);

  async function call(payload: object) {
    const res = await fetch("/api/admin/registration-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json as { sent: number; failed: number; errors: string[]; total: number; nextOffset: number | null };
  }

  async function sendTest(product: Product) {
    setBusy(`test-${product}`);
    try {
      const r = await call({ product, test: true });
      if (r.sent) toast.success("Enviado a tu email. Revisa la bandeja.");
      else toast.error("No se pudo enviar: " + (r.errors?.[0] ?? "error"));
    } catch (e) {
      toast.error("Error: " + (e as Error).message);
    }
    setBusy(null);
  }

  async function sendAll(product: Product) {
    const n = counts[product]?.total ?? 0;
    if (!confirm(`¿Enviar el recordatorio de registro a las ${n} personas que pagaron "${LABELS[product]}" y no tienen cuenta? Manda emails reales.`)) return;
    setBusy(product);
    let offset = 0, sent = 0, failed = 0;
    try {
      while (true) {
        const r = await call({ product, offset });
        sent += r.sent;
        failed += r.failed;
        setProgress(`${sent}/${r.total}…`);
        if (r.nextOffset == null) break;
        offset = r.nextOffset;
      }
      toast.success(`Listo. Enviados: ${sent} · Fallidos: ${failed}`);
    } catch (e) {
      toast.error("Error: " + (e as Error).message);
    }
    setBusy(null);
    setProgress("");
    load();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Les llega un email con el link de registro y el aviso de usar el mismo email del pago. Además, todos los días a las 10:00 AM
        (Miami) sale solo a quien compró hace más de 20 h, como máximo 3 veces por persona y con 48 h entre envíos. El automático del
        en vivo corre hasta el 20/11.
      </p>
      {(["live", "ondemand"] as Product[]).map((product) => {
        const c = counts[product];
        return (
          <div key={product} className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-semibold">
              {LABELS[product]}{" "}
              <span className="text-muted-foreground font-normal">
                {c === undefined
                  ? "· cargando…"
                  : `· ${c.total} sin cuenta${c.total ? ` (${c.neverReminded} todavía sin recordatorio)` : ""}`}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => sendTest(product)} disabled={!!busy}>
                {busy === `test-${product}` ? "Enviando…" : "Probar (a mí)"}
              </Button>
              <Button size="sm" onClick={() => sendAll(product)} disabled={!!busy || !c?.total}>
                {busy === product ? `Enviando ${progress}` : "📨 Enviar recordatorio de registro"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
