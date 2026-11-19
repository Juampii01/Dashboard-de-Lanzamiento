"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Franja fija arriba del dashboard para quien todavía no completó el Día 1.
 * Se muestra en todas las páginas del dashboard hasta que lo completa (no se
 * puede cerrar a propósito: sin el perfil del Día 1 no sirven los días
 * siguientes). No se muestra dentro del propio Día 1.
 */
export function Day1ReminderBanner() {
  const pathname = usePathname();
  if (pathname?.startsWith("/dashboard/dia-1")) return null;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        flexWrap: "wrap",
        padding: "10px 20px",
        background: "#152978", // navy de marca: contraste AA con blanco en los dos temas
        color: "#FFFFFF",
        fontSize: 13.5,
        fontWeight: 600,
        textAlign: "center",
        flexShrink: 0,
      }}
    >
      <span>
        ⚠️ Todavía no completas el <strong>Día 1</strong>. Complétalo para armar el perfil de tu empresa y avanzar con el challenge.
      </span>
      <Link
        href="/dashboard/dia-1"
        style={{
          background: "#FFFFFF",
          color: "#152978",
          borderRadius: 999,
          padding: "6px 16px",
          fontWeight: 800,
          fontSize: 13,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Ir aquí →
      </Link>
    </div>
  );
}
