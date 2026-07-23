/**
 * /acceso-cerrado — se muestra a usuarios no-admin cuando el admin cierra el
 * acceso al dashboard (app_settings.access_closed = "true"). Vive FUERA del
 * layout de /dashboard a propósito, para no volver a disparar este mismo
 * chequeo (mismo patrón que /sin-acceso).
 */

export const metadata = { title: "Challenge finalizado — GovBidder" };

export default function AccesoCerradoPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #0A2540 0%, #143A6B 100%)",
      }}
    >
      <div
        className="relative w-full max-w-md rounded-xl overflow-hidden text-center"
        style={{
          background: "#143A6B",
          border: "1px solid #1E3A5C",
        }}
      >
        <div style={{ height: 4, background: "#E42D2C" }} />
        <div style={{ padding: "40px 32px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "10px 16px", display: "inline-block", marginBottom: 22 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/halcon.png" alt="GovBidder Challenge" style={{ height: 44, width: "auto", display: "block" }} />
          </div>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.16em", textTransform: "uppercase", color: "#E42D2C", margin: "0 0 10px",
          }}>
            GovBidder Challenge
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>
            El challenge ya finalizó
          </h1>
          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: 0 }}>
            El acceso al dashboard está cerrado. Gracias por haber participado — lo que aprendiste durante
            el challenge es tuyo para siempre.
          </p>
        </div>
      </div>
    </div>
  );
}
