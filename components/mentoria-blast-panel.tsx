"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Panel admin: manda a TODOS los usuarios (no-admin) el email con la
// propuesta de la mentoría "Tu Primer Contrato" (plan de pagos), con CTA de
// WhatsApp. Mismo patrón de "probar primero" + tandas que los otros blasts.
export function MentoriaBlastPanel() {
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<null | "test" | "send">(null);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/mentoria-blast")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setCount(d.count); })
      .catch(() => {});
  }, []);

  async function callBlast(payload: object) {
    const res = await fetch("/api/admin/mentoria-blast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json as { sent: number; failed: number; errors: string[]; total: number; nextOffset: number | null };
  }

  async function sendTest() {
    setBusy("test");
    try {
      const r = await callBlast({ test: true });
      if (r.sent) toast.success("Enviado a tu email. Revisá la bandeja.");
      else toast.error("No se pudo enviar: " + (r.errors?.[0] ?? "error"));
    } catch (e) { toast.error("Error: " + (e as Error).message); }
    setBusy(null);
  }

  async function sendAll() {
    if (!confirm(`¿Enviar la propuesta de la mentoría a las ${count ?? 0} personas? Manda emails reales — no se puede deshacer.`)) return;
    setBusy("send");
    let offset = 0, sent = 0, failed = 0, total = 0;
    const errors: string[] = [];
    try {
      while (true) {
        const r = await callBlast({ offset });
        sent += r.sent; failed += r.failed; total = r.total;
        if (r.errors?.length) errors.push(...r.errors);
        setProgress(`${sent}/${total}…`);
        if (r.nextOffset == null) break;
        offset = r.nextOffset;
      }
      setResult({ sent, failed, errors: errors.slice(0, 40) });
      toast.success(`Listo. Enviados: ${sent} · Fallidos: ${failed}`);
    } catch (e) { toast.error("Error: " + (e as Error).message); }
    setBusy(null); setProgress("");
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Manda el email de la propuesta de &quot;Tu Primer Contrato&quot; (plan de pagos) con botón de WhatsApp.
        Probá primero (&quot;test&quot;, te lo manda a vos) y después enviá a todos.
      </p>
      <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "#1E3A5C" }}>
        <p className="text-sm font-semibold">
          Todos los usuarios{" "}
          <span className="text-muted-foreground font-normal">
            {count === null ? "· cargando…" : `· ${count} persona${count === 1 ? "" : "s"}`}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={sendTest} disabled={!!busy}>
            {busy === "test" ? "Enviando…" : "Probar (a mí)"}
          </Button>
          <Button size="sm" onClick={sendAll} disabled={!!busy || !count}>
            {busy === "send" ? `Enviando ${progress}` : "📨 Enviar a todos"}
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
    </div>
  );
}
