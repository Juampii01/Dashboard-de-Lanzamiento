"use client";

import { useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 12, color: "#fff", fontSize: 15, padding: "13px 16px", outline: "none",
};

export function RegistroForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<"form" | "ok" | "already">("form");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim(), phone: phone.trim() || null, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.error === "rate_limited" ? "Demasiados registros seguidos. Probá en unos minutos."
          : data?.error === "invalid_email" ? "Revisá tu nombre y email."
          : "Algo salió mal. Probá de nuevo."
        );
        setLoading(false);
        return;
      }
      setState(data.alreadyRegistered ? "already" : "ok");
    } catch {
      setError("No se pudo enviar. Probá de nuevo.");
    }
    setLoading(false);
  }

  if (state === "ok") {
    return (
      <div style={{
        width: "100%", background: "rgba(22,166,95,0.12)", border: "1px solid rgba(22,166,95,0.4)",
        borderRadius: 12, padding: "18px 16px", color: "#37d98a",
        display: "flex", flexDirection: "column", gap: 8, textAlign: "center",
      }}>
        <span style={{ fontSize: 18, fontWeight: 800 }}>✅ ¡Registrado!</span>
        <span style={{ fontWeight: 600, color: "#9fe9c2", fontSize: 14, lineHeight: 1.5 }}>
          Te enviamos un email para entrar al dashboard (revisá tu bandeja y el spam). Con un clic ya estás adentro, sin contraseña.
        </span>
        <span style={{
          marginTop: 6, fontSize: 12.5, fontWeight: 700, color: "#FFD700",
          background: "rgba(255,215,0,0.10)", border: "1px solid rgba(255,215,0,0.3)",
          borderRadius: 10, padding: "10px 12px", lineHeight: 1.45,
        }}>
          🎁 Estás registrado como <strong>usuario gratuito</strong>: usás todo el dashboard y sumás puntos, pero <strong>no competís por los premios</strong>.
        </span>
      </div>
    );
  }

  if (state === "already") {
    return (
      <div style={{
        width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 12, padding: "18px 16px", color: "#fff",
        display: "flex", flexDirection: "column", gap: 8, textAlign: "center",
      }}>
        <span style={{ fontSize: 17, fontWeight: 800 }}>👋 Ese email ya está registrado</span>
        <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
          Revisá tu bandeja por el email de acceso, o entrá directo al dashboard.
        </span>
        <a href="https://dboard.govbidder.net/login" style={{
          marginTop: 4, padding: "11px 22px", borderRadius: 12, textDecoration: "none",
          fontSize: 15, fontWeight: 800, color: "#fff",
          background: "linear-gradient(135deg, #E42D2C 0%, #A11D2E 100%)",
        }}>
          Ir al dashboard →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
      <input type="text" required placeholder="Tu nombre y apellido" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
      <input type="email" required placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
      <input type="tel" placeholder="Teléfono (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
      {/* Honeypot anti-bot: oculto para humanos, los bots lo rellenan. */}
      <input
        type="text" tabIndex={-1} autoComplete="off" value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        aria-hidden
      />
      <button type="submit" disabled={loading} style={{
        width: "100%", padding: "13px 16px", borderRadius: 12, border: "none",
        cursor: loading ? "wait" : "pointer", fontSize: 16, fontWeight: 800,
        background: "linear-gradient(135deg, #E42D2C 0%, #A11D2E 100%)", color: "#fff",
        boxShadow: "0 8px 24px -6px rgba(228,45,44,0.6)",
      }}>
        {loading ? "Registrando..." : "Registrarme gratis →"}
      </button>
      {error && <p style={{ fontSize: 13, color: "#ff8a8a", margin: 0 }}>{error}</p>}
      <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.45 }}>
        Es gratis. Como usuario gratuito sumás puntos y usás todo el dashboard, pero no competís por los premios.
      </p>
    </form>
  );
}
