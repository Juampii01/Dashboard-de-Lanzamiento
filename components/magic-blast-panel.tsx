"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Panel admin: envío masivo del magic link de acceso (entran directo al
// dashboard, sin contraseña). Probá primero con tu email, después a todos.
// El "Enviar a TODOS" llama al endpoint por tandas hasta terminar.
export function MagicBlastPanel() {
  const [busy, setBusy] = useState<null | "test" | "all">(null);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  async function callBlast(payload: object) {
    const res = await fetch("/api/admin/magic-blast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json as { sent: number; failed: number; errors: string[]; total: number; nextOffset: number | null };
  }

  async function test() {
    setBusy("test"); setResult(null); setProgress("");
    try {
      const r = await callBlast({ test: true });
      setResult({ sent: r.sent, failed: r.failed, errors: r.errors });
      if (r.sent) toast.success("Magic link de prueba enviado a tu email. Revisá la bandeja.");
      else toast.error("No se pudo enviar: " + (r.errors?.[0] ?? "error"));
    } catch (e) { toast.error("Error: " + (e as Error).message); }
    setBusy(null);
  }

  async function sendAll() {
    if (!confirm("¿Enviar el magic link de acceso a TODOS los usuarios (no-admins)? Manda emails reales — no se puede deshacer.")) return;
    setBusy("all"); setResult(null);
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
        Manda el <strong>magic link de acceso</strong>: el usuario hace clic y entra directo al dashboard, sin contraseña.
        Probá primero con tu propio email; cuando confirmes que llega y loguea, enviá a todos. Usa el flujo probado de Resend.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={test} disabled={!!busy}>
          {busy === "test" ? "Enviando…" : "🧪 Probar (a mi email)"}
        </Button>
        <Button onClick={sendAll} disabled={!!busy}>
          {busy === "all" ? `Enviando ${progress}` : "📨 Enviar a TODOS"}
        </Button>
      </div>
      {result && (
        <div className="text-xs rounded-lg border p-3" style={{ borderColor: "#1E3A5C" }}>
          <p>✅ Enviados: <strong>{result.sent}</strong> &nbsp;·&nbsp; ❌ Fallidos: <strong>{result.failed}</strong></p>
          {result.errors.length > 0 && (
            <details className="mt-2">
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
}
