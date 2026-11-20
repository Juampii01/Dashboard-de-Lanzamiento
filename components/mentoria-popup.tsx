"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { MENTORIA_PAYMENT_LINK, MENTORIA_WHATSAPP, type MentoriaButton } from "@/lib/mentoria-popup";

/**
 * Ventana a pantalla completa de la mentoría "Tu Primer Contrato".
 * Aparece una sola vez por persona cuando el equipo la activa en /admin/ventas
 * (se consulta cada 20 s, así aparece sin recargar). Apenas se muestra queda
 * registrada como vista. Tres botones: Pagar ahora, Hablar con el equipo antes
 * y "Ahora no me interesa" (más chico).
 */
export function MentoriaPopup({ initialShow, name, email }: { initialShow: boolean; name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const shownRef = useRef(false);

  const track = useCallback((button: MentoriaButton) => {
    try {
      fetch("/api/proximo-paso/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ button }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* noop */ }
  }, []);

  const show = useCallback(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    setOpen(true);
    track("mentoria_visto"); // una sola vez: queda registrada al aparecer
  }, [track]);

  useEffect(() => {
    if (initialShow) {
      const t = setTimeout(show, 0);
      return () => clearTimeout(t);
    }
    const check = async () => {
      if (shownRef.current || document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/mentoria-popup", { cache: "no-store" });
        const d = (await r.json()) as { show?: boolean };
        if (d.show) show();
      } catch { /* se reintenta */ }
    };
    const id = setInterval(check, 20_000);
    return () => clearInterval(id);
  }, [initialShow, show]);

  if (!open) return null;

  function pay() {
    track("mentoria_pagar");
    setOpen(false);
  }

  function talk() {
    track("mentoria_hablar");
    const msg = `Hola, soy ${name || "participante del challenge"}${email ? ` (${email})` : ""}. Quiero hablar con el equipo sobre la mentoría Tu Primer Contrato.`;
    window.open(`https://wa.me/${MENTORIA_WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  function notNow() {
    track("mentoria_no");
    setOpen(false);
  }

  const point = (n: string, title: string, text: string) => (
    <div style={{ display: "flex", gap: 14, textAlign: "left", alignItems: "flex-start" }}>
      <span style={{ fontWeight: 900, fontSize: 15, color: "#FAD457", minWidth: 26 }}>{n}</span>
      <div>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>{title}</p>
        <p style={{ margin: "2px 0 0", fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.8)" }}>{text}</p>
      </div>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mentoria-popup-title"
      style={{
        position: "fixed", inset: 0, zIndex: 99993,
        background: "linear-gradient(160deg, #101f5a 0%, #152978 55%, #1e3a9a 100%)",
        color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 620, width: "100%", textAlign: "center", margin: "auto" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
          Tu próximo paso
        </p>
        <h2 id="mentoria-popup-title" style={{ margin: "10px 0 12px", fontSize: "clamp(30px, 6vw, 46px)", fontWeight: 900, lineHeight: 1.1 }}>
          Mentoría Tu Primer Contrato
        </h2>
        <p style={{ margin: "0 auto 24px", fontSize: 17, lineHeight: 1.55, color: "rgba(255,255,255,0.85)", maxWidth: 520 }}>
          Preparado no es lo mismo que contratado. Durante 4 meses trabajamos tu caso 1 a 1 hasta que tu empresa esté frente a una oportunidad real.
        </p>

        <div style={{ display: "grid", gap: 14, margin: "0 auto 28px", maxWidth: 520 }}>
          {point("01", "Te sentamos en la mesa de los grandes", "Un teaming agreement con una empresa que ya gana contratos, para que compitas respaldado.")}
          {point("02", "Te ponemos frente a oportunidades activas", "Respondemos un Sources Sought real en tus primeros 30 días.")}
          {point("03", "Te enseñamos a hablar su idioma", "El seguimiento correcto con el Contracting Officer, el funcionario que decide la compra.")}
        </div>

        <p style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700, color: "#FAD457" }}>
          ⏳ Cupos limitados · se asignan por orden de llegada
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <a
            href={MENTORIA_PAYMENT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={pay}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              height: 56, padding: "0 34px", borderRadius: 12, background: "#E42D2C", color: "#FFFFFF",
              fontWeight: 900, fontSize: 18, textDecoration: "none", whiteSpace: "nowrap",
              boxShadow: "0 10px 30px rgba(228,45,44,0.45)",
            }}
          >
            Pagar ahora →
          </a>
          <WhatsAppButton onClick={talk}>Hablar con el equipo antes</WhatsAppButton>
        </div>

        <button
          onClick={notNow}
          style={{
            marginTop: 20, background: "transparent", border: "1px solid rgba(255,255,255,0.45)", color: "rgba(255,255,255,0.85)",
            borderRadius: 999, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          Ahora no me interesa
        </button>
      </div>
    </div>
  );
}
