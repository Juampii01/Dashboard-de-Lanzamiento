import { PageHeader } from "../_components/ui";
import { PerfilesAdicionalesClient } from "./client";

export default function PerfilesAdicionalesPage() {
  return (
    <>
      <PageHeader
        eyebrow="General"
        title="Perfiles adicionales"
        description="Participantes que pidieron cotización para sumar otra empresa o persona. Al aprobar, cargas el precio y el link de pago: solo esa persona lo ve en su pestaña “Perfil adicional” y le llega un email."
      />
      <PerfilesAdicionalesClient />
    </>
  );
}
