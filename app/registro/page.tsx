import { RegistroForm } from "@/components/registro-form";

export const metadata = { title: "Registrate gratis — GovBidder Challenge" };

export default function RegistroPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
        background: "radial-gradient(800px circle at 50% 0%, rgba(228,45,44,0.14), transparent 55%), linear-gradient(160deg, #0d1a3d 0%, #080f24 100%)",
      }}
    >
      <div
        style={{
          width: "min(460px, 100%)",
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", gap: 16,
          background: "linear-gradient(160deg, rgba(13,26,61,0.6) 0%, rgba(8,15,36,0.6) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 22, padding: "clamp(28px, 6vw, 44px) clamp(20px, 5vw, 36px)",
          boxShadow: "0 30px 80px -24px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ background: "#fff", borderRadius: 16, padding: "10px 16px", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/halcon.png" alt="GovBidder Challenge" style={{ height: 54, width: "auto", display: "block" }} />
        </div>

        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#FFD700" }}>
          GovBidder Challenge
        </p>

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 6vw, 32px)", fontWeight: 800, color: "#fff", lineHeight: 1.12, margin: 0 }}>
          Registrate gratis al challenge
        </h1>

        <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.55, margin: 0 }}>
          Completá tus datos y te llega un email para entrar al dashboard al instante, sin contraseña.
        </p>

        {/* Aviso usuario gratuito */}
        <p style={{
          fontSize: 12.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, margin: 0,
          background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.28)",
          borderRadius: 12, padding: "11px 14px",
        }}>
          🎁 Es <strong style={{ color: "#FFD700" }}>acceso gratuito</strong>: usás todo el dashboard y sumás puntos, pero <strong style={{ color: "#FFD700" }}>no competís por los premios</strong> (esos son para quienes pagaron el acceso al challenge).
        </p>

        <RegistroForm />
      </div>
    </div>
  );
}
