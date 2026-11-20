"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";

/**
 * Banner a pantalla completa "¡Quiero participar!" de la rifa en vivo.
 * Aparece cuando el equipo lo activa en /admin/sorteo (se consulta cada 20 s,
 * así aparece sin recargar la página). Si la persona lo cierra sin participar,
 * queda un botón flotante para volver a abrirlo mientras la rifa siga abierta.
 */
export function RifaPopup({ initialEnabled, initialJoined }: { initialEnabled: boolean; initialJoined: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [joined, setJoined] = useState(initialJoined);
  const [dismissed, setDismissed] = useState(false);
  const [justJoined, setJustJoined] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/rifa", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { enabled?: boolean; joined?: boolean };
      setEnabled(!!d.enabled);
      setJoined(!!d.joined);
    } catch { /* sin red: se reintenta en el próximo ciclo */ }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 20_000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [refresh]);

  async function join() {
    setSending(true);
    setError("");
    try {
      const r = await fetch("/api/rifa", { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (r.ok && d.ok) {
        setJoined(true);
        setJustJoined(true);
      } else {
        setError(d.message ?? "No pudimos anotarte. Intenta de nuevo.");
        if (r.status === 409) setEnabled(false);
      }
    } catch {
      setError("No pudimos anotarte. Revisa tu conexión e intenta de nuevo.");
    }
    setSending(false);
  }

  const showModal = (enabled && !joined && !dismissed) || justJoined;
  const showPill = enabled && !joined && dismissed;

  if (showPill) {
    return (
      <button
        onClick={() => setDismissed(false)}
        style={{
          position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 99994,
          background: "#E42D2C", color: "#FFFFFF", border: "none", borderRadius: 999,
          padding: "14px 28px", fontSize: 16, fontWeight: 900, cursor: "pointer",
          boxShadow: "0 10px 30px rgba(228,45,44,0.45)",
        }}
      >
        🎟️ ¡Quiero participar en la rifa!
      </button>
    );
  }

  if (!showModal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rifa-popup-title"
      style={{
        position: "fixed", inset: 0, zIndex: 99995,
        background: "linear-gradient(160deg, #101f5a 0%, #152978 55%, #1e3a9a 100%)",
        color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, overflowY: "auto",
      }}
    >
      <button
        onClick={() => { setDismissed(true); setJustJoined(false); }}
        aria-label="Cerrar"
        style={{
          position: "absolute", top: 18, right: 18, width: 44, height: 44, borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)",
          color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        <X size={22} />
      </button>

      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        {justJoined ? (
          <>
            <div style={{ fontSize: 64, lineHeight: 1 }}>✅</div>
            <h2 id="rifa-popup-title" style={{ margin: "18px 0 12px", fontSize: "clamp(30px, 6vw, 44px)", fontWeight: 900, lineHeight: 1.1 }}>
              ¡Ya estás participando!
            </h2>
            <p style={{ margin: "0 auto 28px", fontSize: 17, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
              Quédate en la llamada: los ganadores se anuncian en vivo y solo pueden ganar quienes estén presentes.
            </p>
            <button
              onClick={() => setJustJoined(false)}
              style={{
                background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.75)", color: "#FFFFFF",
                borderRadius: 999, padding: "12px 32px", fontSize: 16, fontWeight: 800, cursor: "pointer",
              }}
            >
              Volver a la plataforma
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 64, lineHeight: 1 }}>🎟️</div>
            <h2 id="rifa-popup-title" style={{ margin: "18px 0 12px", fontSize: "clamp(30px, 6vw, 46px)", fontWeight: 900, lineHeight: 1.1 }}>
              ¡La rifa está abierta!
            </h2>
            <p style={{ margin: "0 auto 28px", fontSize: 17, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
              Toca el botón para participar por los premios de tu rango. Solo participan quienes están en la llamada en vivo.
            </p>
            <button
              onClick={join}
              disabled={sending}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10, background: "#E42D2C", color: "#FFFFFF",
                border: "none", borderRadius: 999, padding: "18px 40px", fontSize: 20, fontWeight: 900,
                cursor: sending ? "wait" : "pointer", boxShadow: "0 10px 30px rgba(228,45,44,0.45)",
              }}
            >
              {sending && <Loader2 size={20} className="animate-spin" />}
              ¡Quiero participar!
            </button>
            {error && <p style={{ marginTop: 16, fontSize: 15, color: "#FFD60A" }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
