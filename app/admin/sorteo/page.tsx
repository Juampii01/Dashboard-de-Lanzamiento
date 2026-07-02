import Link from "next/link";
import { SorteoClient } from "./client";

// Página oculta a propósito — no está en el menú del panel admin. Se accede
// por URL directa (/admin/sorteo); queda protegida igual por el guard de
// app/admin/layout.tsx (is_admin obligatorio).
export default function SorteoPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        ← Panel Admin
      </Link>
      <SorteoClient />
    </div>
  );
}
