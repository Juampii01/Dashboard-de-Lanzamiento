"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [showAuthError, setShowAuthError] = useState(false);

  // Show support banner when redirected here after an expired / already-used link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth") {
      setShowAuthError(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Use /auth/confirm (client-side) instead of /auth/callback (server-side).
        // This prevents Gmail / email clients from pre-fetching and consuming the
        // one-time OTP before the user actually clicks the link.
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        // M4: Prevent new account creation through the login form.
        // Users must be pre-registered by the Hotmart webhook. Anyone
        // who didn't purchase will get a "user not found" response here.
        shouldCreateUser: false,
      },
    });

    setLoading(false);

    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("rate limit") || msg.includes("too many") || (error as { status?: number }).status === 429) {
        toast.error("Demasiados intentos. Esperá unos minutos y pedí otro link.", { duration: 8000 });
      } else if (msg.includes("not found") || msg.includes("user not found")) {
        toast.error("Este email no tiene acceso al dashboard. Verificá el email con el que compraste.", { duration: 8000 });
      } else {
        toast.error("Hubo un problema enviando el link. Intentá de nuevo en unos segundos.", { duration: 6000 });
      }
      return;
    }

    setSent(true);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #0A2540 0%, #143A6B 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(600px circle at 50% 30%, rgba(215,38,61,0.07), transparent 60%)",
        }}
      />

      <div
        className="relative w-full max-w-md rounded-xl overflow-hidden"
        style={{
          background: "#143A6B",
          border: "1px solid #1E3A5C",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: "#D7263D" }} />

        <div className="p-8">
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-8">
            <div
              style={{
                background: "#fff",
                borderRadius: "20px",
                padding: "16px 24px",
                display: "inline-block",
                boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
              }}
            >
              <img
                src="/halcon.png"
                alt="GovBidder Challenge"
                style={{
                  height: "140px",
                  width: "auto",
                  display: "block",
                }}
              />
            </div>
          </div>

          {/* Auth error banner — shown when redirected from /auth/confirm with ?error=auth */}
          {showAuthError && (
            <div
              className="rounded-lg p-4 mb-6"
              style={{
                background: "rgba(215,38,61,0.12)",
                border: "1px solid rgba(215,38,61,0.35)",
              }}
            >
              <p className="font-semibold text-white text-sm mb-2">
                No pudimos verificar tu acceso
              </p>
              <p className="text-sm mb-3" style={{ color: "#C9D6EC" }}>
                Tu link de acceso expiró o no es válido. Por seguridad, no podemos
                darte acceso automáticamente sin verificar tu cuenta.
              </p>
              <p className="text-sm" style={{ color: "#C9D6EC" }}>
                Si tenés problemas para ingresar, contactanos en{" "}
                <a
                  href="https://govbidder.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "#00D67A" }}
                >
                  GovBidder.net
                </a>
              </p>
            </div>
          )}

          {sent ? (
            <div className="text-center space-y-4 py-2">
              <div className="text-5xl mb-2">📬</div>
              <p
                className="font-bold text-xl text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ¡Revisá tu email!
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#C9D6EC" }}>
                Te enviamos un link de acceso a{" "}
                <span className="text-white font-semibold">{email}</span>.
                Hacé clic en el link para entrar al dashboard.
              </p>
              <p className="text-xs" style={{ color: "#8DA2C4" }}>
                Si no lo ves, revisá la carpeta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs uppercase tracking-[0.12em] font-medium"
                  style={{ color: "#C9D6EC", fontFamily: "var(--font-sans)" }}
                >
                  Email con el que compraste el acceso
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-lg text-white placeholder:text-[#8DA2C4] outline-none transition-all"
                  style={{
                    background: "#0A2540",
                    border: "1.5px solid #1E3A5C",
                    fontFamily: "var(--font-sans)",
                    fontSize: "15px",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#00D67A";
                    e.target.style.boxShadow = "0 0 0 3px rgba(0,214,122,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#1E3A5C";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-lg text-white font-bold text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: loading ? "#A11D2E" : "#D7263D",
                  fontFamily: "var(--font-sans)",
                  boxShadow: "0 4px 20px rgba(215,38,61,0.4)",
                  transform: "translateY(0)",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.target as HTMLButtonElement).style.background = "#A11D2E";
                    (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = "#D7263D";
                  (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                }}
              >
                {loading ? "Enviando..." : "Entrar con Magic Link →"}
              </button>

              <p className="text-center text-xs" style={{ color: "#8DA2C4" }}>
                Te enviamos un link seguro. No necesitás contraseña.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
