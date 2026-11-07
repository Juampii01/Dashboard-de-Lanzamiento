"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, User } from "lucide-react";
import { Field, FormError, PasswordField, SubmitButton } from "./fields";

/** Registro de una cuenta de solo lectura (viewer) desde una invitación. */
export function ViewerRegisterForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirm) return setError("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-viewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, full_name: fullName.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoading(false);
        if (data.error === "email_exists") {
          return setError(
            <>
              Ya existe una cuenta con este email. <Link href="/login" className="font-bold underline">Inicia sesión</Link>.
            </>
          );
        }
        if (data.error === "already_used") return setError("Esta invitación ya se usó. Inicia sesión con tu email y contraseña.");
        if (data.error === "invalid_invite") return setError("La invitación ya no está activa. Pide una nueva.");
        if (data.error === "weak_password") return setError("La contraseña debe tener entre 8 y 72 caracteres.");
        if (data.error === "invalid_data") return setError("Revisa tu nombre.");
        return setError("No pudimos crear tu cuenta. Intenta de nuevo en unos segundos.");
      }

      const { error: signErr } = await createClient().auth.signInWithPassword({ email, password });
      if (signErr) {
        setLoading(false);
        return setError(
          <>
            Tu cuenta se creó, pero no pudimos iniciar sesión automáticamente.{" "}
            <Link href="/login" className="font-bold underline">Inicia sesión aquí</Link>.
          </>
        );
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setError("No pudimos conectarnos. Revisa tu internet e intenta de nuevo.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nombre y apellido" icon={User} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
      <Field label="Email" icon={Mail} type="email" value={email} readOnly disabled hint="La invitación es para este email." />
      <PasswordField label="Contraseña" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} hint="Mínimo 8 caracteres." />
      <PasswordField label="Repite la contraseña" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
      <FormError>{error}</FormError>
      <SubmitButton loading={loading}>{loading ? "Creando tu cuenta…" : "Crear cuenta"}</SubmitButton>
    </form>
  );
}
