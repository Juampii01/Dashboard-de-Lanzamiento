import Link from "next/link";

/**
 * Overlay de bloqueo de un día en On Demand. Mismo estilo que LaunchCountdown,
 * pero sin contador: en la versión grabada cada día se abre al completar el
 * anterior (ver app/api/xp/complete-day). Debe ir dentro de un contenedor
 * `position: relative`.
 */
export function OndemandDayLock({ day, title }: { day: number; title: string }) {
  const prev = day - 1;
  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 50,
        pointerEvents: "auto", // bloquea la interacción con el contenido de abajo
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "clamp(20px, 6vh, 64px) 14px",
        background: "color-mix(in srgb, var(--background) 42%, transparent)",
        borderRadius: 16,
      }}
    >
      <div
        style={{
          position: "sticky", top: "clamp(16px, 8vh, 70px)",
          width: "min(640px, 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", gap: 18, padding: "clamp(24px, 4vw, 44px) 24px",
          borderRadius: 20,
          background: "linear-gradient(160deg, rgba(13,26,61,0.94) 0%, rgba(8,15,36,0.94) 100%)",
          border: "1px solid rgba(228,45,44,0.4)",
          boxShadow: "0 24px 70px -18px rgba(0,0,0,0.7), 0 0 36px -12px rgba(228,45,44,0.45)",
        }}
      >
        <div style={{ background: "#fff", borderRadius: 14, padding: "8px 14px", boxShadow: "0 6px 22px rgba(0,0,0,0.3)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tpc-logo.png" alt="" style={{ height: 52, width: "auto", display: "block" }} />
        </div>

        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 800,
          letterSpacing: "0.16em", textTransform: "uppercase", color: "#E42D2C", margin: 0,
        }}>
          Tu Primer Contrato Challenge · On Demand
        </p>

        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: "clamp(20px, 4vw, 32px)", fontWeight: 800,
          color: "#fff", lineHeight: 1.12, margin: 0, maxWidth: "20ch",
        }}>
          {title}
        </h2>

        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.78)", maxWidth: "46ch", margin: 0 }}>
          Este día se desbloquea cuando completes el Día {prev}. Avanza a tu ritmo: cada día se abre al terminar el anterior.
        </p>

        <Link
          href={`/dashboard/dia-${prev}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#E42D2C", color: "#fff", textDecoration: "none",
            fontSize: 15, fontWeight: 800, padding: "12px 26px", borderRadius: 12,
            boxShadow: "0 10px 28px -10px rgba(228,45,44,0.8)",
          }}
        >
          Ir al Día {prev} →
        </Link>
      </div>
    </div>
  );
}
