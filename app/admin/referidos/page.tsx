import { Users2, ListChecks } from "lucide-react";
import { PageHeader, Panel, Stat, StatusPill } from "../_components/ui";
import { createServiceClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { REFERRAL_LEAD_XP } from "@/lib/referrals";

export const dynamic = "force-dynamic";

interface Lead {
  id: string;
  referred_email: string;
  xp_awarded: number;
  credited_at: string | null;
  created_at: string;
  referrer_id: string;
}
interface Referrer {
  id: string;
  full_name: string | null;
  email: string;
  referral_code: string | null;
}

async function getData(): Promise<{ leads: Lead[]; referrers: Record<string, Referrer> }> {
  const service = createServiceClient();
  const { data: leadsRaw } = await service
    .from("referral_leads")
    .select("id, referred_email, xp_awarded, credited_at, created_at, referrer_id")
    .order("created_at", { ascending: false });
  const leads = (leadsRaw as Lead[] | null) ?? [];

  const ids = Array.from(new Set(leads.map((l) => l.referrer_id)));
  const referrers: Record<string, Referrer> = {};
  if (ids.length) {
    const { data: usersRaw } = await service
      .from("users")
      .select("id, full_name, email, referral_code")
      .in("id", ids);
    for (const u of (usersRaw as Referrer[] | null) ?? []) referrers[u.id] = u;
  }
  return { leads, referrers };
}

function fmt(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-AR", {
      day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default async function AdminReferidosPage() {
  const { leads, referrers } = await getData();

  const total = leads.length;
  const credited = leads.filter((l) => !!l.credited_at).length;
  const pending = total - credited;

  // Resumen por referidor (ordenado por acreditados desc).
  const byReferrer = Object.values(
    leads.reduce<Record<string, { ref: Referrer | null; id: string; total: number; credited: number }>>((acc, l) => {
      const key = l.referrer_id;
      if (!acc[key]) acc[key] = { ref: referrers[key] ?? null, id: key, total: 0, credited: 0 };
      acc[key].total += 1;
      if (l.credited_at) acc[key].credited += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.credited - a.credited || b.total - a.total);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Después del challenge"
        title="Referidos"
        description={
          <>
            Cada referidor gana <strong>+{REFERRAL_LEAD_XP} pts</strong> cuando el email que invitó se crea como usuario (= pagó).
            Hasta entonces el lead queda <strong>pendiente</strong>.
          </>
        }
      />

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Referidos registrados" value={total} />
        <Stat label="Pagaron" value={credited} tone="success" hint={total ? `${Math.round((credited / total) * 100)}% de conversión` : undefined} />
        <Stat label="Pendientes de pago" value={pending} />
      </div>

      {/* Resumen por referidor */}
      <Panel icon={Users2} title="Por referidor" description="Quién invitó a quién y cuántos de sus referidos ya pagaron.">
        <div className="overflow-x-auto">
          {byReferrer.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay referidos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referidor</TableHead>
                  <TableHead className="text-center">Invitados</TableHead>
                  <TableHead className="text-center">Pagaron</TableHead>
                  <TableHead className="text-center">Pts ganados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byReferrer.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{r.ref?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.ref?.email ?? r.id}</p>
                    </TableCell>
                    <TableCell className="text-center font-medium">{r.total}</TableCell>
                    <TableCell className="text-center font-medium" style={{ color: r.credited > 0 ? "var(--success)" : undefined }}>
                      {r.credited}
                    </TableCell>
                    <TableCell className="text-center font-medium">{(r.credited * REFERRAL_LEAD_XP).toLocaleString("es-AR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Panel>

      {/* Detalle de cada referido */}
      <Panel icon={ListChecks} title="Detalle de referidos" description={`${total} registros, del más reciente al más antiguo.`}>
        <div className="overflow-x-auto">
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay referidos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referido (email)</TableHead>
                  <TableHead>Referidor</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Registrado</TableHead>
                  <TableHead className="text-center">Pagó</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => {
                  const ref = referrers[l.referrer_id];
                  const paid = !!l.credited_at;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm font-medium">{l.referred_email}</TableCell>
                      <TableCell>
                        <p className="text-sm">{ref?.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{ref?.email ?? l.referrer_id}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusPill tone={paid ? "success" : "muted"}>
                          {paid ? `Pagó · +${REFERRAL_LEAD_XP}` : "Pendiente"}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{fmt(l.created_at)}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{fmt(l.credited_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Panel>
    </div>
  );
}
