"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Segment = "never_accessed" | "day1_incomplete";

const LABELS: Record<Segment, { title: string; sendLabel: string }> = {
  never_accessed: { title: "Nunca ingresaron al dashboard", sendLabel: "📨 Enviar recordatorio de acceso" },
  day1_incomplete: { title: "No completaron el Día 1", sendLabel: "📨 Enviar recordatorio de Día 1" },
};

// Panel admin: recordatorios segmentados por email (nunca ingresaron / no
// completaron Día 1). Cada botón manda por tandas hasta terminar el segmento.
export function ReminderBlastPanel() {
  const [counts, setCounts] = useState<Record<Segment, number> | null>(null);
  const [busy, setBusy] = useState<null | Segment | `test-${Segment}`>(null);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<Partial<Record<Segment, { sent: number; failed: number; errors: string[] }>>>({});

  useEffect(() => {
    fetch("/api/admin/reminder-blast")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setCounts(d.counts); })
      .catch(() => {});
  }, []);

  async function callBlast(payload: object) {
    const res = await fetch("/api/admin/reminder-blast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json as { sent: number; failed: number; errors: string[]; total: number; nextOffset: number | null };
  }

  async function sendTest(segment: Segment) {
    setBusy(`test-${segment}`);
    try {
      const r = await callBlast({ segment, test: true });
      if (r.sent) toast.success("Enviado a tu email. Revisá la bandeja.");
      else toast.error("No se pudo enviar: " + (r.errors?.[0] ?? "error"));
    } catch (e) { toast.error("Error: " + (e as Error).message); }
    setBusy(null);
  }

  async function sendSegment(segment: Segment) {
    const count = counts?.[segment] ?? 0;
    if (!confirm(`¿Enviar el recordatorio a las ${count} personas de "${LABELS[segment].title}"? Manda emails reales — no se puede deshacer.`)) return;
    setBusy(segment);
    let offset = 0, sent = 0, failed = 0, total = 0;
    const errors: string[] = [];
    try {
      while (true) {
        const r = await callBlast({ segment, offset });
        sent += r.sent; failed += r.failed; total = r.total;
        if (r.errors?.length) errors.push(...r.errors);
        setProgress(`${sent}/${total}…`);
        if (r.nextOffset == null) break;
        offset = r.nextOffset;
      }
      setResults((prev) => ({ ...prev, [segment]: { sent, failed, errors: errors.slice(0, 40) } }));
      toast.success(`Listo. Enviados: ${sent} · Fallidos: ${failed}`);
    } catch (e) { toast.error("Error: " + (e as Error).message); }
    setBusy(null); setProgress("");
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Manda un recordatorio con magic link a cada segmento. Probá primero con &quot;test&quot; (te lo manda a vos), y después enviá al segmento completo.
      </p>
      {(Object.keys(LABELS) as Segment[]).map((segment) => {
        const result = results[segment];
        const count = counts?.[segment];
        return (
          <div key={segment} className="rounded-xl border p-3 space-y-2" style={{ borderColor: "#1E3A5C" }}>
            <p className="text-sm font-semibold">
              {LABELS[segment].title}{" "}
              <span className="text-muted-foreground font-normal">
                {count === undefined ? "· cargando…" : `· ${count} persona${count === 1 ? "" : "s"}`}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => sendTest(segment)} disabled={!!busy}>
                {busy === `test-${segment}` ? "Enviando…" : "Probar (a mí)"}
              </Button>
              <Button size="sm" onClick={() => sendSegment(segment)} disabled={!!busy || !count}>
                {busy === segment ? `Enviando ${progress}` : LABELS[segment].sendLabel}
              </Button>
            </div>
            {result && (
              <div className="text-xs rounded-lg border p-2" style={{ borderColor: "#1E3A5C" }}>
                <p>✅ Enviados: <strong>{result.sent}</strong> &nbsp;·&nbsp; ❌ Fallidos: <strong>{result.failed}</strong></p>
                {result.errors.length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-muted-foreground">Ver errores ({result.errors.length})</summary>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
