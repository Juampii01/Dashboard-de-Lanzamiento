import Link from "next/link";
import { UserPlus, Radio, Mail, PlaySquare, TrendingUp, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Stat, LinkTile } from "./_components/ui";
import { getUsersAndProgress } from "./_lib/data";
import { segmentOf, type Segment } from "./_lib/types";
import { FunnelPanel, LiveStatus, OnlineStat, PendingCounts, type FunnelData } from "./_components/overview";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { users, allProgress } = await getUsersAndProgress();

  const segOf = new Map(users.map((u) => [u.id, segmentOf(u)]));
  const participants = users.filter((u) => !u.is_admin);

  // Embudo por segmento: registrados → ingresaron → completaron D1..D4.
  const funnel = {} as Record<Segment | "all", FunnelData>;
  for (const key of ["paid", "free", "all"] as const) {
    const list = key === "all" ? participants : participants.filter((u) => segmentOf(u) === key);
    const ids = new Set(list.map((u) => u.id));
    const days = [1, 2, 3, 4].map(
      (d) => allProgress.filter((p) => p.day_number === d && p.is_completed && ids.has(p.user_id)).length
    );
    funnel[key] = { registered: list.length, entered: list.filter((u) => !!u.last_seen_at).length, days };
  }
  funnel.team = { registered: 0, entered: 0, days: [0, 0, 0, 0] };

  const paidCount = participants.filter((u) => segOf.get(u.id) === "paid").length;
  const freeCount = participants.length - paidCount;
  const finished = funnel.all.days[3];

  return (
    <>
      <PageHeader
        eyebrow="GovBidder Challenge"
        title="Inicio"
        description="Estado del challenge y números clave de un vistazo."
        actions={
          <Button asChild>
            <Link href="/admin/usuarios/nuevo" className="gap-2">
              <UserPlus className="w-4 h-4" /> Crear usuario
            </Link>
          </Button>
        }
      />

      <div className="space-y-8">
        <LiveStatus />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <OnlineStat />
          <Stat label="Participantes" value={participants.length} hint={`${paidCount} pagos · ${freeCount} gratuitos`} />
          <Stat
            label="Ingresaron"
            value={`${funnel.paid.registered ? Math.round((funnel.paid.entered / funnel.paid.registered) * 100) : 0}%`}
            hint={`${funnel.paid.entered} de ${funnel.paid.registered} pagos`}
            tone="success"
          />
          <Stat
            label="Terminaron Día 4"
            value={finished}
            hint={`${participants.length ? Math.round((finished / participants.length) * 100) : 0}% de los participantes`}
          />
        </div>

        <FunnelPanel funnel={funnel} />

        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">Accesos rápidos</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <LinkTile href="/admin/usuarios" icon={Users} title="Usuarios" description="Buscar, filtrar y gestionar a cada participante." />
            <LinkTile href="/admin/en-vivo" icon={Radio} title="En vivo" description="Bloqueo por llamada, horarios y apertura de días." />
            <LinkTile href="/admin/comunicaciones" icon={Mail} title="Comunicaciones" description="Magic links, recordatorios y emails masivos." />
            <LinkTile
              href="/admin/misiones"
              icon={PlaySquare}
              title="Misiones y reportes"
              description="Misión diaria, ráfagas y reportes de la web del Día 3."
              meta={<PendingCounts kind="reports" />}
            />
            <LinkTile
              href="/admin/ventas"
              icon={TrendingUp}
              title="Ventas"
              description="Quién mostró intención de compra después del challenge."
              meta={<PendingCounts kind="leads" />}
            />
            <LinkTile href="/admin/cierre" icon={Trophy} title="Cierre y sorteo" description="Pausa de puntos, sorteo final y cierre del acceso." />
          </div>
        </div>
      </div>
    </>
  );
}
