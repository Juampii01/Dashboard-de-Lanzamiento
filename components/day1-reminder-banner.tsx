"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const SEEN_KEY = "gb_day1_reminder_seen_v1";

/**
 * Recordatorio para quien todavía no completó el Día 1.
 * - Al ingresar al dashboard aparece una ventana (una vez por sesión del
 *   navegador) con el botón "Ir a realizarlo", que lleva directo al Día 1.
 * - Además, una franja fija arriba en todas las páginas hasta que lo completa.
 * No se muestra dentro del propio Día 1.
 */
export function Day1ReminderBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const onDay1 = pathname?.startsWith("/dashboard/dia-1") ?? false;

  useEffect(() => {
    if (onDay1) return;
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch { /* noop */ }
    if (seen) return;
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, [onDay1]);

  function markSeen() {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* noop */ }
  }

  function goToDay1() {
    markSeen();
    setOpen(false);
    router.push("/dashboard/dia-1");
  }

  function close() {
    markSeen();
    setOpen(false);
  }

  if (onDay1) return null;

  const button: React.CSSProperties = {
    background: "#E42D2C",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 999,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <>
      {/* Franja fija */}
      <div
        role="status"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap",
          padding: "10px 20px", background: "#152978", color: "#FFFFFF",
          fontSize: 13.5, fontWeight: 600, textAlign: "center", flexShrink: 0,
        }}
      >
        <span>⚠️ Aún no has completado el <strong>Día 1</strong>. Ve y complétalo.</span>
        <button onClick={goToDay1} style={{ ...button, background: "#FFFFFF", color: "#152978", padding: "6px 16px", fontSize: 13 }}>
          Ir a realizarlo →
        </button>
      </div>

      {/* Ventana al ingresar (una vez por sesión) */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="day1-reminder-title"
          onClick={close}
          style={{
            position: "fixed", inset: 0, zIndex: 99970, background: "rgba(8, 14, 40, 0.65)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "28px 24px", maxWidth: 420, width: "100%", textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ fontSize: 40, lineHeight: 1 }}>📝</div>
            <h2 id="day1-reminder-title" style={{ margin: "12px 0 8px", fontSize: 21, fontWeight: 800 }}>
              Aún no has completado el Día 1
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 14.5, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              Ve y complétalo: ahí armas el perfil de tu empresa y la plataforma te sugiere tus códigos NAICS. Los necesitas para los días siguientes. Te toma unos 10 minutos.
            </p>
            <button onClick={goToDay1} style={{ ...button, padding: "12px 28px", fontSize: 15, width: "100%" }}>
              Ir a realizarlo →
            </button>
            <button
              onClick={close}
              style={{ marginTop: 10, background: "none", border: "none", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer" }}
            >
              Más tarde
            </button>
          </div>
        </div>
      )}
    </>
  );
}
