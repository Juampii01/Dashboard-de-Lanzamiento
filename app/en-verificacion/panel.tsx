"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, RefreshCw, Mail } from "lucide-react";
import { Field, FormError, Notice, SubmitButton } from "@/components/auth/fields";

export function VerificationPanel({
  rejected,
  initialPurchaseEmail,
  initialNote,
  alreadySent,
}: {
  rejected: boolean;
  initialPurchaseEmail: string;
  initialNote: string;
  alreadySent: boolean;
}) {
  const router = useRouter();
  const [purchaseEmail, setPurchaseEmail] = useState(initialPurchaseEmail);
  const [note, setNote] = useState(initialNote);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(alreadySent);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchase_email: purchaseEmail.trim(), note: note.trim() }),
      });
      if (!res.ok) setError("No pudimos enviar los datos. Intenta de nuevo.");
      else setSent(true);
    } catch {
      setError("No pudimos conectarnos. Revisa tu internet e intenta de nuevo.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      {!rejected && (
        <div className="flex items-start gap-3 rounded-xl border border-[#152978]/15 bg-[#152978]/[0.04] p-4">
          <Clock className="w-5 h-5 text-[#152978] shrink-0 mt-0.5" />
          <div className="text-[13px] leading-relaxed text-[#0d1a3d]">
            <p className="font-bold">Tu cuenta pasó a verificación.</p>
            <p className="mt-1 text-[#5A6B85]">
              El equipo está revisando si hiciste la compra para darte acceso. Cuando lo confirme, vas a poder entrar con
              tu email y tu contraseña. No necesitas crear otra cuenta.
            </p>
          </div>
        </div>
      )}

      <Notice tone="gold">
        Recuerda: es mucho más fácil registrarte con el <strong>email con el que hiciste la compra</strong>. Cada compra da
        acceso a <strong>una sola cuenta</strong>; no se puede asociar a más de un email.
      </Notice>

      {sent ? (
        <div className="flex items-start gap-3 rounded-xl border border-[#16A65F]/30 bg-[#16A65F]/[0.06] p-4 text-[13px] text-[#0f6b3e]">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Recibimos tus datos.</p>
            <p className="mt-0.5">
              {purchaseEmail ? <>Vamos a buscar tu compra con <strong>{purchaseEmail}</strong>. </> : null}
              Te avisamos cuando tu acceso esté activo.
            </p>
            <button type="button" onClick={() => setSent(false)} className="mt-2 font-bold underline">
              Corregir los datos
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm font-bold text-[#0d1a3d]">Ayúdanos a encontrar tu compra</p>
          <Field
            label="Email con el que hiciste la compra"
            icon={Mail}
            type="email"
            placeholder="email@ejemplo.com"
            value={purchaseEmail}
            onChange={(e) => setPurchaseEmail(e.target.value)}
            hint="Si compraste con este mismo email, déjalo en blanco."
          />
          <div className="space-y-1.5">
            <label htmlFor="nota" className="block text-[13px] font-semibold text-[#0d1a3d]">Comentario (opcional)</label>
            <textarea
              id="nota"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej.: pagué con la tarjeta de mi esposa, el 12 de octubre."
              className="w-full rounded-xl border border-[rgba(13,26,61,0.16)] bg-white px-3.5 py-3 text-[15px] text-[#0d1a3d] placeholder:text-[#94a3b8] outline-none focus:border-[#152978] focus:ring-4 focus:ring-[#152978]/10 resize-none"
            />
          </div>
          <FormError>{error}</FormError>
          <SubmitButton loading={loading}>{loading ? "Enviando…" : "Enviar al equipo"}</SubmitButton>
        </form>
      )}

      <div className="flex flex-col gap-2 border-t border-[rgba(13,26,61,0.08)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#152978] hover:underline"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Ya me confirmaron, volver a revisar
        </button>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="text-[13px] font-semibold text-[#5A6B85] hover:text-[#0d1a3d]">
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
