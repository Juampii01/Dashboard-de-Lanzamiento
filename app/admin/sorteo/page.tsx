import { RifaClient } from "./rifa-client";

// Rifa en vivo de la clase final (reemplaza al sorteo anterior). Se llega
// desde Cierre y rifa (/admin/cierre). Protegida por el guard de
// app/admin/layout.tsx (is_admin obligatorio).
export default function SorteoPage() {
  return (
    <div className="space-y-6">
      <RifaClient />
    </div>
  );
}
