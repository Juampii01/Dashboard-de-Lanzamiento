"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error("Hubo un problema. Verificá tu email e intentá de nuevo.");
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
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
