import { Pause, Lock, Dices, Target } from "lucide-react";
import { PageHeader, Panel, LinkTile } from "../_components/ui";
import { AccessClosedPanel, PausePointsPanel } from "../_components/panels";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CierrePage() {
  // Misiones enviadas sin revisar: sus puntos se suman recién al aprobarlas,
  // así que hay que revisarlas ANTES de pausar los puntos y sortear.
  const db = createServiceClient();
  const [{ count: rafagaPending }, { count: missionPending }] = await Promise.all([
    db.from("rafaga_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("mission_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const pending = (rafagaPending ?? 0) + (missionPending ?? 0);

  return (
    <>
      <PageHeader
        eyebrow="Después del challenge"
        title="Cierre y sorteo"
        description="En orden: pausa los puntos para congelar el ranking, haz el sorteo en vivo y, cuando termine todo, cierra el acceso."
      />

      <div className="space-y-6">
        {pending > 0 && (
          <LinkTile
            href="/admin/misiones"
            icon={Target}
            title={`0 · Antes de pausar: ${pending} misión(es) sin revisar`}
            description="Sus puntos se suman recién al aceptarlas. Revísalas antes de pausar los puntos y sortear; con los puntos pausados no se pueden aceptar."
          />
        )}

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
