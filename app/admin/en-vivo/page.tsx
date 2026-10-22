import { Radio, CalendarClock, KeyRound, DoorOpen } from "lucide-react";
import { PageHeader, Panel } from "../_components/ui";
import { DashboardLockControl, DayUnlockControl, KeywordsAdminPanel, LaunchScheduleControl } from "../_components/panels";
import { getToggles } from "../_lib/data";

export const dynamic = "force-dynamic";

export default async function EnVivoPage() {
  const toggles = await getToggles();

  return (
    <>
      <PageHeader
        eyebrow="Durante el challenge"
        title="En vivo"
        description="Todo lo que se toca el día de cada clase: bloquear durante la llamada, abrir el día y cargar la keyword."
      />

      <div className="space-y-6">
        <Panel
          icon={Radio}
          tone="danger"
          title="Bloqueo por llamada en vivo"
          description="Mientras está bloqueado, los participantes ven un overlay a pantalla completa con el botón a la llamada."
        >
          <DashboardLockControl />
        </Panel>

        <Panel
          icon={DoorOpen}
          tone="success"
          title="Apertura de días"
          description="Abre el Inicio o un día para todos al instante. Después de cada clase, abre el día aquí. A los admins nunca se les bloquea."
        >
          <DayUnlockControl initialToggles={toggles} />
        </Panel>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            icon={KeyRound}
            title="Keywords de las llamadas"
            description="La palabra secreta de cada clase. Los participantes la ingresan en Misiones Extra y suman +1.000 pts."
          >
            <KeywordsAdminPanel />
          </Panel>

          <Panel
            icon={CalendarClock}
            title="Hora del contador"
            description="Solo visual: el día no se abre solo al llegar a cero, se abre arriba, en Apertura de días."
          >
            <LaunchScheduleControl initialToggles={toggles} />
          </Panel>
        </div>
      </div>
    </>
  );
}
