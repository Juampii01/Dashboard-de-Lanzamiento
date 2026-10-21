import { SorteoClient } from "./client";

// Se llega desde Cierre y sorteo (/admin/cierre). Protegida por el guard de
// app/admin/layout.tsx (is_admin obligatorio).
export default function SorteoPage() {
  return (
    <div className="space-y-6">
      <SorteoClient />
    </div>
  );
}
