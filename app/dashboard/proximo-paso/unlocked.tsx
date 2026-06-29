"use client";

import Link from "next/link";
import { WhatsAppButton } from "@/components/whatsapp-button";

// Número de WhatsApp de la mentoría "Tu Primer Contrato" (solo dígitos, con
// código de país, sin "+"). Configurable por env NEXT_PUBLIC_MENTORIA_WHATSAPP.
const MENTORIA_WHATSAPP = (process.env.NEXT_PUBLIC_MENTORIA_WHATSAPP ?? "17329373088").replace(/\D/g, "");

export function ProximoPasoUnlocked({ fullName }: { fullName: string }) {
  function handleWhatsApp() {
    const name = (fullName || "").trim();
    const msg = `Hola, soy ${name}. Acabo de terminar el GovBidder Challenge y quiero saber más sobre el programa “Tu Primer Contrato” para conseguir mi primer contrato con el gobierno. ¿Cómo sigo?`;
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
          color: "#fff", lineHeight: 1.12, margin: 0, maxWidth: "22ch",
        }}>
          🚀 Ya tienes las herramientas. Ahora vas por el contrato.
        </h2>

        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.84)", maxWidth: "54ch", margin: 0, lineHeight: 1.55 }}>
          Completaste el challenge: tienes tu perfil, tus códigos, tu web y tu Capability Statement.
          Pero las herramientas no ganan contratos solas — <strong style={{ color: "#fff" }}>el que no actúa en los
          próximos 30 días, deja su registro frío</strong> y vuelve a empezar de cero.
        </p>

        <div
          style={{
            width: "min(560px, 100%)", textAlign: "left",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10,
          }}
        >
          <p style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", margin: 0 }}>
            En <span style={{ color: "#E42D2C" }}>Tu Primer Contrato</span> trabajamos tu caso 1:1 hasta que ganes terreno real:
          </p>
          {[
            "Un teaming agreement con un prime que ya tiene past performance federal.",
            "Responder un Sources Sought activo en los próximos 30 días.",
            "El follow-up correcto con un Contracting Officer, sin parecer amateur.",
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: "#E42D2C", fontWeight: 900, flexShrink: 0 }}>{i + 1}.</span>
              <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>

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
          <WhatsAppButton onClick={handleWhatsApp}>Quiero mi primer contrato</WhatsAppButton>
        </div>

        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>
          Te escribes con el equipo por WhatsApp y te contamos cómo seguir, sin compromiso.
        </p>
      </div>
    </div>
  );
}
