"use client";

import { useState } from "react";

export function ReferidoForm({ refCode }: { refCode: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [alreadyUser, setAlreadyUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/referrals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), ref: refCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error === "invalid_email" ? "Ingresa un email válido." : "Algo salió mal. Prueba de nuevo.");
        setLoading(false);
        return;
      }
      if (data.alreadyUser) {
        // El email ya tiene cuenta → no lo mandamos a pagar de nuevo.
        setAlreadyUser(true);
        setLoading(false);
        return;
      }
      if (data.redirectUrl) {
        // Mostramos el mensaje de transición y recién ahí redirigimos a pagar.
        setRedirecting(true);
        setTimeout(() => { window.location.href = data.redirectUrl; }, 2200);
        return;
      }
      // Todavía sin URL de pago configurada → mostramos confirmación.
      setDone(true);
    } catch {
      setError("No se pudo enviar. Prueba de nuevo.");
    }
    setLoading(false);
  }

  if (alreadyUser) {
    return (
      <div style={{
        width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 12, padding: "18px 16px", color: "#fff", fontSize: 15, fontWeight: 700,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center",
      }}>
        <span style={{ fontSize: 18 }}>👋 Este email ya tiene acceso</span>
        <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
          Ya estás registrado en el challenge. Ingresa directo al dashboard.
        </span>
        <a
          href="https://dboard.govbidder.net/login"
          style={{
            marginTop: 4, padding: "11px 22px", borderRadius: 12, textDecoration: "none",
            fontSize: 15, fontWeight: 800, color: "#fff",
            background: "linear-gradient(135deg, #E42D2C 0%, #A11D2E 100%)",
            boxShadow: "0 8px 24px -6px rgba(228,45,44,0.6)",
          }}
        >
          Ir al dashboard →
        </a>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div style={{
        width: "100%", background: "rgba(22,166,95,0.12)", border: "1px solid rgba(22,166,95,0.4)",
        borderRadius: 12, padding: "18px 16px", color: "#37d98a", fontSize: 15, fontWeight: 700,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center",
      }}>
        <span style={{ fontSize: 18 }}>✅ ¡Excelente!</span>
        <span style={{ fontWeight: 600, color: "#9fe9c2" }}>
          Te redirigiremos para que ingreses al dashboard…
        </span>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{
        width: "100%", background: "rgba(22,166,95,0.12)", border: "1px solid rgba(22,166,95,0.4)",
        borderRadius: 12, padding: "16px", color: "#37d98a", fontSize: 14, fontWeight: 600,
      }}>
        ✅ ¡Listo! Tu lugar quedó registrado. Pronto vas a poder acceder al lanzamiento.
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        style={{
          width: "100%", boxSizing: "border-box",
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 12, color: "#fff", fontSize: 15, padding: "13px 16px", outline: "none",
        }}
      />
      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%", padding: "13px 16px", borderRadius: 12, border: "none",
          cursor: loading ? "wait" : "pointer", fontSize: 16, fontWeight: 800,
          background: "linear-gradient(135deg, #E42D2C 0%, #A11D2E 100%)", color: "#fff",
          boxShadow: "0 8px 24px -6px rgba(228,45,44,0.6)",
        }}
      >
        {loading ? "Enviando..." : "Quiero mi lugar →"}
      </button>
      {error && <p style={{ fontSize: 13, color: "#ff8a8a", margin: 0 }}>{error}</p>}
      <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", margin: 0 }}>
        Tus datos solo se usan para darte acceso al challenge.
      </p>
    </form>
  );
}
