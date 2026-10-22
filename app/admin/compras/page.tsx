import { PageHeader } from "../_components/ui";
import { ComprasClient } from "./client";

export default function ComprasPage() {
  return (
    <>
      <PageHeader
        eyebrow="General"
        title="Compras y accesos"
        description="Carga la lista de compradores y verifica a quienes se registraron con un email distinto al de la compra. Cada compra da acceso a una sola cuenta."
      />
      <ComprasClient />
    </>
  );
}
