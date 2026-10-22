import { Pause, Lock, Dices } from "lucide-react";
import { PageHeader, Panel, LinkTile } from "../_components/ui";
import { AccessClosedPanel, PausePointsPanel } from "../_components/panels";

export default function CierrePage() {
  return (
    <>
      <PageHeader
        eyebrow="Después del challenge"
        title="Cierre y sorteo"
        description="En orden: pausa los puntos para congelar el ranking, haz el sorteo en vivo y, cuando termine todo, cierra el acceso."
      />

      <div className="space-y-6">
        <Panel
          icon={Pause}
          tone="danger"
          title="1 · Pausa de puntos"
          description="Congela todo el sistema de puntos (tiempo, misiones, videos, quiz, keywords, referidos, comunidad, ráfagas, racha). El ranking no se mueve. Reversible."
        >
          <PausePointsPanel />
        </Panel>

        <LinkTile
          href="/admin/sorteo"
          icon={Dices}
          title="2 · Sorteo final"
          description="Sorteo de premios por rango (Elevate, Prime, Legacy, Expert). Pensado para compartir pantalla en el evento."
        />

        <Panel
          icon={Lock}
          tone="danger"
          title="3 · Cierre total del acceso"
          description="Los participantes ven “el challenge finalizó” en lugar del dashboard. Los admins siguen entrando. Reversible."
        >
          <AccessClosedPanel />
        </Panel>
      </div>
    </>
  );
}
