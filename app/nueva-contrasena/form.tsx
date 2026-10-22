"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormError, PasswordField, SubmitButton } from "@/components/auth/fields";

export function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirm) return setError("Las contraseñas no coinciden.");
    setLoading(true);
    const { error: err } = await createClient().auth.updateUser({ password });
    if (err) {
      setLoading(false);
      const msg = err.message.toLowerCase();
      return setError(
        msg.includes("same") || msg.includes("different")
          ? "La contraseña nueva debe ser distinta de la anterior."
          : "No pudimos guardar la contraseña. Pide un enlace nuevo e intenta otra vez."
      );
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PasswordField label="Contraseña nueva" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} hint="Mínimo 8 caracteres." />
      <PasswordField label="Repite la contraseña" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
      <FormError>{error}</FormError>
      <SubmitButton loading={loading}>{loading ? "Guardando…" : "Guardar y entrar"}</SubmitButton>
    </form>
  );
}
