"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [sent, setSent] = useState(false);

  // Show a helpful message when redirected here after an expired / already-used link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth") {
      toast.error("Tu link de acceso expiró o ya fue usado. Ingresá tu email para recibir uno nuevo.", {
        duration: 6000,
      });
    }
  }, []);

  async function handleGoogle() {
    setLoadingGoogle(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // browser redirects — no need to setLoadingGoogle(false)
  }

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
            <div className="w-20 h-20 relative mb-5">
              <Image
                src="/govbidder-logo.png"
                alt="Govbidder"
                fill
                className="object-contain"
                priority
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                style={{
                  background: "#D7263D",
                  boxShadow: "0 0 32px rgba(215,38,61,0.4)",
                  fontFamily: "var(--font-display)",
                }}
              >
                G
              </div>
            </div>
            <h1
              className="text-3xl font-bold text-white mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Govbidder
            </h1>
            <p
              className="text-sm uppercase tracking-[0.15em]"
              style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}
            >
              Code Challenge
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4 py-2">
              <div className="text-5xl mb-2">📬</div>
              <p
                className="font-bold text-xl text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ¡Revisá tu email!
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#A8B5CC" }}>
                Te enviamos un link de acceso a{" "}
                <span className="text-white font-semibold">{email}</span>.
                Hacé clic en el link para entrar al dashboard.
              </p>
              <p className="text-xs" style={{ color: "#5A6B85" }}>
                Si no lo ves, revisá la carpeta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs uppercase tracking-[0.12em] font-medium"
                  style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}
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
                  className="w-full px-4 py-3 rounded-lg text-white placeholder:text-[#5A6B85] outline-none transition-all"
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

              <p className="text-center text-xs" style={{ color: "#5A6B85" }}>
                Te enviamos un link seguro. No necesitás contraseña.
              </p>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: "#1E3A5C" }} />
                <span className="text-xs" style={{ color: "#3A5070" }}>o</span>
                <div className="flex-1 h-px" style={{ background: "#1E3A5C" }} />
              </div>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loadingGoogle}
                className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-3 transition-all disabled:opacity-60"
                style={{
                  background: "#fff",
                  color: "#1a1a1a",
                  fontFamily: "var(--font-sans)",
                  border: "1.5px solid #e2e8f0",
                }}
              >
                {loadingGoogle ? (
                  <span>Conectando...</span>
                ) : (
                  <>
                    {/* Google "G" SVG */}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    Entrar con Google
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
