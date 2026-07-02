"use client";

import Link from "next/link";
import { WhatsAppButton } from "@/components/whatsapp-button";

// Número de WhatsApp de la mentoría "Tu Primer Contrato" (solo dígitos, con
// código de país, sin "+"). Configurable por env NEXT_PUBLIC_MENTORIA_WHATSAPP.
const MENTORIA_WHATSAPP = (process.env.NEXT_PUBLIC_MENTORIA_WHATSAPP ?? "17329373088").replace(/\D/g, "");

export function ProximoPasoUnlocked({ fullName }: { fullName: string }) {
  function handleWhatsApp() {
    const name = (fullName || "").trim();
    const msg = `Hola, soy ${name}. Acabo de terminar el GovBidder Challenge y quiero saber más sobre la mentoría “Tu Primer Contrato”. ¿Cómo sigo?`;
    const base = MENTORIA_WHATSAPP ? `https://wa.me/${MENTORIA_WHATSAPP}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm transition-colors"
        style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}
      >
        ← Dashboard
      </Link>

      <div
        style={{
          position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", gap: 18, padding: "clamp(32px, 6vw, 56px) 24px",
          borderRadius: 20,
          background: "radial-gradient(700px circle at 50% 0%, rgba(228,45,44,0.14), transparent 60%), linear-gradient(160deg, #0d1a3d 0%, #080f24 100%)",
          border: "1px solid rgba(228,45,44,0.28)",
        }}
      >
        <div style={{ background: "#fff", borderRadius: 16, padding: "10px 16px", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/halcon.png" alt="GovBidder Challenge" style={{ height: 54, width: "auto", display: "block" }} />
        </div>

        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800,
          letterSpacing: "0.16em", textTransform: "uppercase", color: "#E42D2C",
        }}>
          Programa · Tu Primer Contrato
        </p>

        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: "clamp(24px, 4.5vw, 38px)", fontWeight: 800,
          color: "#fff", lineHeight: 1.15, margin: 0, maxWidth: "26ch",
        }}>
          ¡Lo hiciste! Pero preparado no es lo mismo que contratado.
        </h2>

        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.84)", maxWidth: "58ch", margin: 0, lineHeight: 1.6 }}>
          Durante 4 días preparaste tu empresa como el empresario que siempre quisiste ser.
          Hoy tienes en la mano lo que la mayoría nunca llega a armar.
        </p>

        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.84)", maxWidth: "58ch", margin: 0, lineHeight: 1.6 }}>
          Pero prepararse no es la meta. <strong style={{ color: "#fff" }}>La meta es el contrato.</strong> Y
          no llega por tenerlo todo listo: llega por moverte rápido y con la estrategia correcta.{" "}
          <strong style={{ color: "#fff" }}>Y justo eso es lo que te muestro ahora.</strong>
        </p>

        <div
          style={{
            width: "min(580px, 100%)", textAlign: "left",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14,
          }}
        >
          <div>
            <p style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", margin: 0 }}>
              En <span style={{ color: "#E42D2C" }}>Tu Primer Contrato</span> dejamos de prepararte y empezamos a competir contigo.
            </p>
            <p style={{ fontSize: 12.5, fontStyle: "italic", color: "rgba(255,255,255,0.6)", margin: "6px 0 0" }}>
              Trabajamos tu caso 1 a 1, hasta que tu empresa esté frente a una oportunidad real:
            </p>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)" }} />
          {[
            {
              title: "Te sentamos en la mesa de los grandes",
              desc: "Un teaming agreement (una alianza) con una empresa que ya tiene historial ganando contratos, para que compitas respaldado y no solo.",
            },
            {
              title: "Te ponemos frente a oportunidades activas",
              desc: "Identificamos y respondemos un Sources Sought (una oportunidad real y abierta) en tus primeros 30 días. Nada de teoría: acción sobre algo que existe hoy.",
            },
            {
              title: "Te enseñamos a hablar su idioma",
              desc: "El seguimiento correcto con un Contracting Officer (el funcionario que decide la compra), con la seriedad de quien sabe lo que hace y no de un principiante.",
            },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", margin: 0 }}>
                <span style={{ color: "#E42D2C" }}>{String(i + 1).padStart(2, "0")}</span> · {item.title}
              </p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.55, margin: 0 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 15.5, fontWeight: 700, color: "#3DDC84", margin: "6px 0 0" }}>
          12 meses caminando a tu lado, hasta tu primer contrato.
        </p>

        <span style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 800,
          letterSpacing: "0.08em", textTransform: "uppercase", color: "#E42D2C",
          background: "rgba(228,45,44,0.12)", border: "1px solid rgba(228,45,44,0.4)",
          borderRadius: 999, padding: "7px 16px",
        }}>
          ⏳ Cupos limitados · se asignan por orden de llegada
        </span>

        <div style={{ marginTop: 2 }}>
          <WhatsAppButton onClick={handleWhatsApp}>QUIERO MI PRIMER CONTRATO</WhatsAppButton>
        </div>

        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>
          Escríbenos por WhatsApp y te contamos cómo dar el siguiente paso.
        </p>
      </div>
    </div>
  );
}
