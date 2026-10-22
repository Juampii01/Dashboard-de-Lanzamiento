"use client";

import { useState } from "react";
import { MailCheck, Mail } from "lucide-react";
import { Field, FormError, SubmitButton } from "@/components/auth/fields";

export function RecoverForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "rate_limited"
            ? "Ya pediste varios enlaces seguidos. Espera unos minutos y revisa tu bandeja (y el spam)."
            : "Revisa que el email esté bien escrito."
        );
      } else {
        setSent(true);
      }
    } catch {
      setError("No pudimos conectarnos. Revisa tu internet e intenta de nuevo.");
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center space-y-3 py-2">
        <span className="mx-auto grid place-items-center w-12 h-12 rounded-full bg-[#16A65F]/10 text-[#16A65F]">
          <MailCheck className="w-6 h-6" />
        </span>
        <p className="font-bold text-[#0d1a3d]">Revisa tu email</p>
        <p className="text-sm text-[#5A6B85] leading-relaxed">
          Si <strong className="text-[#0d1a3d]">{email.trim()}</strong> tiene una cuenta, te llegará un enlace para crear tu
          contraseña en los próximos minutos. Revisa también la carpeta de spam o promociones.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email" icon={Mail} type="email" autoComplete="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <FormError>{error}</FormError>
      <SubmitButton loading={loading}>{loading ? "Enviando…" : "Enviarme el enlace"}</SubmitButton>
    </form>
  );
}
