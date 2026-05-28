"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle, RotateCcw, Copy, Check, TriangleAlert } from "lucide-react";

function defaultExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD for <input type="date">
}

type Status = "idle" | "loading" | "success" | "error";

export function SingleUserForm() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt());
  const [isAdmin, setIsAdmin] = useState(false);
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState<Status>("idle");
  const [resultEmail, setResultEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [emailSent, setEmailSent] = useState(true);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          expires_at: expiresAt
            ? new Date(`${expiresAt}T23:59:59Z`).toISOString()
            : null,
          is_admin: isAdmin,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.errors > 0) {
        const errDetail =
          data.results?.[0]?.error ?? data.error ?? "Error desconocido";
        setErrorMsg(errDetail);
        setStatus("error");
        return;
      }

      const firstResult = data.results?.[0];
      setResultEmail(email.trim().toLowerCase());
      setEmailSent(firstResult?.email_sent !== false);
      setMagicLink(firstResult?.magic_link ?? null);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error de red");
      setStatus("error");
    }
  }

  function reset() {
    setEmail("");
    setFullName("");
    setPhone("");
    setExpiresAt(defaultExpiresAt());
    setIsAdmin(false);
    setNotes("");
    setStatus("idle");
    setErrorMsg("");
    setResultEmail("");
    setEmailSent(true);
    setMagicLink(null);
    setCopied(false);
  }

  async function copyLink() {
    if (!magicLink) return;
    await navigator.clipboard.writeText(magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "success") {
    return (
      <div className="space-y-4">
        {/* Main success card */}
        <div className={`border rounded-xl p-6 flex flex-col items-center text-center gap-3 ${emailSent ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-300"}`}>
          {emailSent ? (
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          ) : (
            <TriangleAlert className="w-10 h-10 text-yellow-500" />
          )}
          <div>
            <p className={`font-bold text-lg ${emailSent ? "text-green-900" : "text-yellow-900"}`}>
              ¡Usuario creado!
            </p>
            {emailSent ? (
              <>
                <p className="text-green-800 text-sm mt-1">
                  Magic link enviado a{" "}
                  <span className="font-mono font-semibold">{resultEmail}</span>.
                </p>
                <p className="text-green-700 text-xs mt-2">
                  El usuario recibirá un email con su link de acceso al challenge.
                </p>
              </>
            ) : (
              <>
                <p className="text-yellow-800 text-sm mt-1">
                  El email <span className="font-mono font-semibold">{resultEmail}</span> fue creado
                  pero <strong>el email no se envió</strong> (rate limit o SMTP sin configurar).
                </p>
                <p className="text-yellow-700 text-xs mt-2">
                  Copiá el link de abajo y enviáselo manualmente por WhatsApp o email.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Magic link fallback — always show so admin can resend manually */}
        {magicLink && (
          <div className="border rounded-xl p-4 bg-card space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Link de acceso del usuario
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={magicLink}
                className="flex-1 px-3 py-2 text-xs font-mono border rounded-lg bg-muted text-muted-foreground truncate"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={copyLink}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  copied
                    ? "bg-green-100 text-green-700"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5" /> Copiado</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copiar</>
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ Este link es de un solo uso y expira. Enviáselo al usuario sin compartirlo con nadie más.
            </p>
          </div>
        )}

        <button
          onClick={reset}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Crear otro usuario
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-xl p-6 space-y-5 bg-card">
      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@ejemplo.com"
          className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Full name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Nombre completo</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Juan Pérez"
          maxLength={200}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          Teléfono{" "}
          <span className="text-muted-foreground text-xs font-normal">
            (opcional — metadata interna)
          </span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+54 9 11 1234-5678"
          className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Expires at */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Vencimiento de acceso</label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          Default: 30 días desde hoy
        </p>
      </div>

      {/* Admin toggle */}
      <div className="flex items-center gap-3 py-1">
        <input
          type="checkbox"
          id="is-admin"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
          className="w-4 h-4 rounded accent-primary cursor-pointer"
        />
        <label htmlFor="is-admin" className="text-sm font-medium cursor-pointer select-none">
          Es administrador
        </label>
        <span className="text-xs text-muted-foreground">(acceso al panel /admin)</span>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          Notas internas{" "}
          <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Comprado por WhatsApp el 31/05"
          maxLength={500}
          rows={2}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Error message */}
      {status === "error" && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{errorMsg}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creando usuario...
          </>
        ) : (
          "Crear usuario y enviar acceso →"
        )}
      </button>
    </form>
  );
}
