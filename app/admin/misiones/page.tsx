import { Camera, Zap, Globe } from "lucide-react";
import { DailyMissionAdmin } from "@/components/daily-mission-admin";
import { RafagaAdminPanel } from "@/components/rafaga-admin-panel";
import { WebReportsAdminPanel } from "@/components/web-reports-admin-panel";
import { PageHeader, Panel } from "../_components/ui";

export default function AdminMisionesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Durante el challenge"
        title="Misiones"
        description="Publica y modera misiones, programa ráfagas y sigue los reportes de la web del Día 3."
      />

      <div className="space-y-6">
        <Panel
          icon={Camera}
          title="Misión diaria"
          description="Los participantes responden con captura, link o texto. Publicar una nueva limpia las respuestas anteriores."
        >
          <DailyMissionAdmin />
        </Panel>

        <Panel
          icon={Zap}
          title="Misiones ráfaga"
          description="Misiones de ventana corta. Aparecen en Misiones Extra recién cuando empieza la ventana."
        >
          <RafagaAdminPanel />
        </Panel>

        <Panel
          icon={Globe}
          tone="danger"
          title="Reportes de la web (Día 3)"
          description="Participantes cuyo sitio no quedó bien. Pueden regenerarla solos; esto es para seguimiento y ayuda puntual."
        >
          <WebReportsAdminPanel />
        </Panel>
      </div>
    </>
  );
}
