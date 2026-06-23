"use client";

import { useState } from "react";

export function ReferidoForm({ refCode }: { refCode: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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
        setError(data?.error === "invalid_email" ? "Ingresá un email válido." : "Algo salió mal. Probá de nuevo.");
        setLoading(false);
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      // Todavía sin URL de pago configurada → mostramos confirmación.
      setDone(true);
    } catch {
      setError("No se pudo enviar. Probá de nuevo.");
    }
    setLoading(false);
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
