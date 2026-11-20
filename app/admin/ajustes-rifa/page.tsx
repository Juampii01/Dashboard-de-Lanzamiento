import { Ban } from "lucide-react";
import { PageHeader, Panel } from "../_components/ui";
import { RifaExcludedPanel } from "./excluded-panel";

// Ajustes internos de la rifa. A propósito no está en el menú ni enlazado
// desde la pantalla de la rifa: esa se comparte en la llamada y no tiene que
// dejar ver quién está excluido. Se entra directo por /admin/ajustes-rifa.
export default function AjustesRifaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Interno"
        title="Ajustes de la rifa"
        description="Página interna: no la compartas en pantalla."
      />
      <div className="space-y-6">
        <Panel
          icon={Ban}
          title="Excluidos de la rifa"
          description="Pueden tocar “¡Quiero participar!”, ven que están participando y figuran en la rifa como cualquiera, pero nunca salen sorteados (0% de chances). “Reiniciar rifa” no borra esta lista."
        >
          <RifaExcludedPanel />
        </Panel>
      </div>
    </>
  );
}
