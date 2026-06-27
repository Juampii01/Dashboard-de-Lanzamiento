"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Panel admin: envío masivo del magic link de acceso (entran directo al
// dashboard, sin contraseña). Probá primero con tu email, después a todos.
// El "Enviar a TODOS" llama al endpoint por tandas hasta terminar.
export function MagicBlastPanel() {
  const [busy, setBusy] = useState<null | "email" | "all">(null);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const [email, setEmail] = useState("");

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

  async function sendToEmail() {
    const e = email.trim();
    if (!e) { toast.error("Escribí un email."); return; }
    setBusy("email"); setResult(null); setProgress("");
    try {
      const r = await callBlast({ email: e });
      setResult({ sent: r.sent, failed: r.failed, errors: r.errors });
      if (r.sent) toast.success(`Magic link enviado a ${e}. Revisá la bandeja.`);
      else toast.error("No se pudo enviar: " + (r.errors?.[0] ?? "error"));
    } catch (err) { toast.error("Error: " + (err as Error).message); }
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
        Probá primero poniendo un email (el tuyo o uno de prueba); cuando confirmes que llega y loguea, enviá a todos. Usa el flujo probado de Resend.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="email"
          placeholder="email@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !busy && email.trim()) sendToEmail(); }}
          disabled={!!busy}
          className="px-3 py-2 rounded-lg border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          style={{ borderColor: "#1E3A5C", minWidth: 240 }}
        />
        <Button variant="outline" onClick={sendToEmail} disabled={!!busy || !email.trim()}>
          {busy === "email" ? "Enviando…" : "Enviar a este email"}
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
