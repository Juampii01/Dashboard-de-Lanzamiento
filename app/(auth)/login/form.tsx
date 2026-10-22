"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, FormError, Notice, PasswordField, SubmitButton } from "@/components/auth/fields";

export function LoginForm({ linkExpired = false }: { linkExpired?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (err) {
      setLoading(false);
      const msg = err.message.toLowerCase();
      if (msg.includes("invalid login credentials")) {
        setError(
          <>
            El email o la contraseña no son correctos.{" "}
            <span className="block mt-1">
              Si participaste en un challenge anterior y nunca creaste una contraseña,{" "}
              <Link href={`/recuperar?email=${encodeURIComponent(email.trim())}`} className="font-bold underline">
                créala aquí
              </Link>
              .
            </span>
          </>
        );
      } else if (msg.includes("rate") || msg.includes("too many")) {
        setError("Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.");
      } else {
        setError("No pudimos iniciar sesión. Intenta de nuevo en unos segundos.");
      }
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {linkExpired && (
        <Notice tone="gold">
          El enlace que abriste ya venció o ya se usó. Inicia sesión con tu email y contraseña, o{" "}
          <Link href="/recuperar" className="font-bold underline">pide uno nuevo</Link>.
        </Notice>
      )}

      <Field
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <PasswordField
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <div className="flex justify-end -mt-1">
        <Link href="/recuperar" className="text-[13px] font-semibold text-[#152978] hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <FormError>{error}</FormError>
      <SubmitButton loading={loading}>{loading ? "Entrando…" : "Iniciar sesión"}</SubmitButton>
    </form>
  );
}
