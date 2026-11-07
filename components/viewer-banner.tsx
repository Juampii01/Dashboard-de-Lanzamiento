import { Eye } from "lucide-react";

// Cartel fijo para las cuentas de solo lectura (viewers).
export function ViewerBanner({ hostName }: { hostName: string | null }) {
  return (
    <div
      role="status"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "8px 20px", flexShrink: 0, fontSize: 13, fontWeight: 600, textAlign: "center",
        background: "color-mix(in srgb, var(--cert-gold) 16%, var(--card))",
        borderBottom: "1px solid color-mix(in srgb, var(--cert-gold) 40%, transparent)",
        color: "var(--foreground)",
      }}
    >
      <Eye size={15} style={{ flexShrink: 0, color: "var(--cert-gold)" }} />
      <span>
        Modo visualización: estás viendo la cuenta de <strong>{hostName || "quien te invitó"}</strong>. Puedes recorrer todo, pero no hacer cambios.
      </span>
    </div>
  );
}
