import Link from "next/link";

export default function ProximoPasoPage() {
  return (
    <div className="space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm transition-colors"
        style={{ color: "#C9D6EC", fontFamily: "var(--font-sans)" }}
      >
        ← Dashboard
      </Link>

      <div
        style={{
          position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", gap: 18, padding: "clamp(32px, 7vw, 64px) 24px",
          borderRadius: 20, minHeight: "min(60vh, 520px)",
          background: "radial-gradient(700px circle at 50% 0%, rgba(228,45,44,0.12), transparent 60%), linear-gradient(160deg, #0d1a3d 0%, #080f24 100%)",
          border: "1px solid rgba(228,45,44,0.25)",
        }}
      >
        <div style={{ background: "#fff", borderRadius: 16, padding: "10px 16px", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/halcon.png" alt="Govbidder Challenge" style={{ height: 60, width: "auto", display: "block" }} />
        </div>

        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800,
          letterSpacing: "0.16em", textTransform: "uppercase", color: "#E42D2C",
        }}>
          Govbidder Challenge
        </p>

        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: "clamp(24px, 4.5vw, 38px)", fontWeight: 800,
          color: "#fff", lineHeight: 1.12, margin: 0,
        }}>
          🚀 Tu próximo paso
        </h2>

        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.82)", maxWidth: "50ch", margin: 0, lineHeight: 1.55 }}>
          Acá te vamos a mostrar cómo seguir <strong style={{ color: "#fff" }}>después del challenge</strong>: el
          camino para conseguir tu primer contrato con el Gobierno de USA.
        </p>

        <span style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800,
          letterSpacing: "0.1em", textTransform: "uppercase", color: "#E42D2C",
          background: "rgba(228,45,44,0.12)", border: "1px solid rgba(228,45,44,0.4)",
          borderRadius: 999, padding: "8px 18px", marginTop: 4,
        }}>
          🔒 Se desbloquea al completar el challenge de los 4 días
        </span>
      </div>
    </div>
  );
}
