"use client";

/**
 * /auth/confirm — intermediate client-side page for magic link exchange.
 *
 * WHY THIS EXISTS:
 * Gmail (and other email clients) pre-fetch magic link URLs server-side to
 * scan for spam/phishing. That pre-fetch consumes the one-time OTP, so when
 * the user actually clicks the link it's already expired.
 *
 * By using this client page instead of the server-side /auth/callback route,
 * the pre-fetch only downloads static HTML — no JavaScript runs, the OTP is
 * NOT consumed. When the real user's browser loads the page, client-side JS
 * calls exchangeCodeForSession() with the PKCE verifier from localStorage,
 * and the exchange succeeds.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    // M1: Validate `next` to prevent open-redirect attacks.
    // Accept only relative paths that start with "/" but NOT "//" (protocol-relative redirect).
    const rawNext = params.get("next") ?? "/dashboard";
    const next = /^\/[^/]/.test(rawNext) || rawNext === "/" ? rawNext : "/dashboard";

    // Error forwarded by Supabase (e.g. link already used before JS ran)
    const urlError = params.get("error");
    if (urlError || !code) {
      router.replace("/login?error=auth");
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error("[auth/confirm] exchangeCodeForSession:", error.message);
        setStatus("error");
        setTimeout(() => router.replace("/login?error=auth"), 1500);
      } else {
        router.replace(next);
      }
    });
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: "linear-gradient(135deg, #0A2540 0%, #143A6B 100%)" }}
    >
      {/* Logo */}
      <img
        src="/halcon.png"
        alt="Govbidder Challenge"
        style={{
          height: "120px",
          width: "auto",
          borderRadius: "10px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          display: "block",
        }}
      />

      {status === "loading" ? (
        <>
          {/* Spinner */}
          <div
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(0,212,255,0.3)", borderTopColor: "#00D4FF" }}
          />
          <p
            className="text-sm"
            style={{ color: "#A8B5CC", fontFamily: "var(--font-mono)" }}
          >
            Verificando acceso…
          </p>
        </>
      ) : (
        <>
          <p
            className="text-sm font-bold"
            style={{ color: "#D7263D", fontFamily: "var(--font-mono)" }}
          >
            ✕ Link expirado
          </p>
          <p className="text-xs" style={{ color: "#5A6B85" }}>
            Redirigiendo al login…
          </p>
        </>
      )}
    </div>
  );
}
