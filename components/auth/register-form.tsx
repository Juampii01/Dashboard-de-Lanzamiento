"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, User, Phone } from "lucide-react";
import { Field, FormError, PasswordField, SubmitButton } from "./fields";

/**
 * Registro con email y contraseña.
 *   mode="buyer" → si el email coincide con una compra, entra directo; si no,
 *                  la cuenta queda en verificación.
 *   mode="free"  → usuario gratuito (usa todo, no compite por premios).
 */
export function RegisterForm({ mode = "buyer" }: { mode?: "buyer" | "free" }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirm) return setError("Las contraseñas no coinciden.");

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), email: cleanEmail, phone: phone.trim() || null, password, mode, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoading(false);
        if (data.error === "email_exists") {
          return setError(
            <>
              Ya existe una cuenta con este email.{" "}
              <Link href="/login" className="font-bold underline">Inicia sesión</Link>
              {" "}o, si nunca creaste una contraseña,{" "}
              <Link href={`/recuperar?email=${encodeURIComponent(cleanEmail)}`} className="font-bold underline">créala aquí</Link>.
            </>
          );
        }
        if (data.error === "weak_password") return setError("La contraseña debe tener entre 8 y 72 caracteres.");
        if (data.error === "rate_limited") return setError("Demasiados registros seguidos desde tu conexión. Espera unos minutos.");
        if (data.error === "invalid_data") return setError("Revisa tu nombre y tu email.");
        return setError("No pudimos crear tu cuenta. Intenta de nuevo en unos segundos.");
      }

      // Cuenta creada: iniciamos sesión con la contraseña recién elegida.
      const { error: signErr } = await createClient().auth.signInWithPassword({ email: cleanEmail, password });
      if (signErr) {
        setLoading(false);
        return setError(
          <>
            Tu cuenta se creó, pero no pudimos iniciar sesión automáticamente.{" "}
            <Link href="/login" className="font-bold underline">Inicia sesión aquí</Link>.
          </>
        );
      }
      router.replace(data.status === "pending" ? "/en-verificacion" : "/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setError("No pudimos conectarnos. Revisa tu internet e intenta de nuevo.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nombre y apellido" icon={User} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
      <Field
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        hint={mode === "buyer" ? "Usa el mismo email con el que hiciste la compra." : undefined}
      />
      <Field label="WhatsApp (opcional)" icon={Phone} type="tel" autoComplete="tel" placeholder="+1 305 555 0123" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <PasswordField label="Contraseña" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} hint="Mínimo 8 caracteres." />
      <PasswordField label="Repite la contraseña" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />

      {/* Honeypot: invisible para personas */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <FormError>{error}</FormError>
      <SubmitButton loading={loading}>{loading ? "Creando tu cuenta…" : "Crear cuenta"}</SubmitButton>
    </form>
  );
}
