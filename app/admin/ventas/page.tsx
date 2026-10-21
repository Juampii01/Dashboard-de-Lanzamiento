import { PageHeader } from "../_components/ui";
import { VentasClient } from "./client";

export default function VentasPage() {
  return (
    <>
      <PageHeader
        eyebrow="Después del challenge"
        title="Ventas"
        description="Quién mostró intención de comprar la mentoría desde la página “Tu Próximo Paso” y el banner del inicio."
      />
      <VentasClient />
    </>
  );
}
