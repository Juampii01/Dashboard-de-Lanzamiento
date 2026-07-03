import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getRank, RANKS, type Rank } from "@/lib/ranks";

/**
 * Sorteo de premios por rango. Elegibilidad (misma regla para los 4 rangos):
 *   1. Pago 100% confirmado — email presente en sorteo_confirmed_payers
 *      (cruce de las 3 plataformas de pago: Hotmart, SEM/"Sell", Stripe).
 *   2. Haber ingresado al dashboard al menos una vez (users.last_seen_at
 *      not null) — quien pagó pero nunca entró NO participa del sorteo.
 * Dentro de cada rango: Elevate/Prime sortean PONDERADO por puntos (más
 * puntos = más probabilidad, ver weightedSampleWithoutReplacement); Legacy/
 * Expert sortean uniforme (todos con la misma chance).
 * Se excluyen SIEMPRE cuentas is_admin / is_student (equipo interno, nunca
 * compiten por premios reales). El admin puede además destildar a mano
 * cualquier otra cuenta rara (test/duplicada) antes de sortear, desde la UI.
 *
 * Flujo de RECLAMO (en vivo, el día del sorteo):
 *   1. POST /draw sortea los N ganadores del rango → quedan status
 *      'pending_claim'.
 *   2. El admin tilda a los que reclamaron el premio en el momento →
 *      PATCH pone status 'claimed'.
 *   3. Si sobran sin reclamar, el admin vuelve a llamar POST /draw (mismo
 *      endpoint): los 'pending_claim' pasan a 'eliminated' (nunca vuelven a
 *      entrar al pool) y se sortean reemplazos SOLO para los lugares que
 *      faltan (target - ya reclamados). Se repite hasta que estén los N
 *      confirmados. Los ya 'claimed' quedan fijos — nunca se re-sortean.
 */

const WEIGHTED_RANKS = new Set(["elevate", "prime"]); // ponderado por puntos
const TARGET_COUNT: Record<string, number> = { elevate: 10, prime: 1, legacy: 1, expert: 1 };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return { error: "forbidden" as const, status: 403 };
  return { service, adminId: user.id };
}

interface EligibleUser {
  id: string;
  full_name: string | null;
  email: string;
  total_points: number;
}

/**
 * A-Res (Efraimidis-Spirakis): sampling ponderado sin reemplazo. Cada id
 * recibe una key = U^(1/peso) con U uniforme(0,1); los `count` con mayor key
 * ganan. A más peso (puntos), mayor probabilidad de key alta — pero nunca 0
 * probabilidad para nadie (peso mínimo 1).
 */
function weightedSampleWithoutReplacement(ids: string[], weights: number[], count: number): string[] {
  const keyed = ids.map((id, i) => ({
    id,
    key: Math.pow(Math.random(), 1 / Math.max(1, weights[i])),
  }));
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, count).map((x) => x.id);
}

/** GET → pool elegible por rango + ganadores activos (pending_claim/claimed), persistidos. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [{ data: users, error: usersError }, { data: confirmedPayers, error: payersError }, { data: winnersData, error: winnersError }, { data: mentorshipBuyers, error: mentorshipError }] = await Promise.all([
    auth.service.from("users").select("id, full_name, email, total_points, is_admin, is_student, last_seen_at"),
    auth.service.from("sorteo_confirmed_payers").select("email"),
    auth.service.from("sorteo_winners").select("id, rank_key, user_id, drawn_at, status, claimed_at"),
    auth.service.from("sorteo_mentorship_buyers").select("email"),
  ]);

  if (usersError) return NextResponse.json({ error: "internal" }, { status: 500 });
  if (payersError?.code === "42P01") {
    return NextResponse.json({ error: "sorteo_confirmed_payers_missing" }, { status: 501 });
  }
  if (payersError) return NextResponse.json({ error: "internal" }, { status: 500 });

  // Ya compraron la mentoría de $15K por fuera del challenge — se excluyen
  // SOLO de Expert (ese rango sortea justamente esa misma mentoría; ganarla
  // de nuevo no tiene sentido). Si la tabla no existe todavía, no excluye a
  // nadie (fail-open: es una exclusión extra, no la elegibilidad base).
  const mentorshipEmails = new Set(
    mentorshipError ? [] : ((mentorshipBuyers ?? []) as { email: string }[]).map((m) => m.email.toLowerCase())
  );

  type WinnerRow = { rank_key: string; user_id: string; drawn_at: string; status: string; claimed_at: string | null };
  const allWinnerRows = (winnersError ? [] : (winnersData ?? [])) as WinnerRow[];

  // Fail-closed si la migración de status/claimed_at no corrió: tratamos
  // cualquier fila existente como si bloqueara el pool igual (no se pierde
  // la exclusión), pero no reventamos si faltan las columnas nuevas.
  const alreadyWon = new Set(allWinnerRows.map((w) => w.user_id));

  const pools: Record<string, EligibleUser[]> = {};
  for (const r of RANKS) pools[r.key] = [];

  for (const u of (users ?? []) as Array<{
    id: string; full_name: string | null; email: string; total_points: number;
    is_admin: boolean; is_student: boolean; last_seen_at: string | null;
  }>) {
    if (u.is_admin || u.is_student) continue; // staff/test, nunca elegibles
    if (alreadyWon.has(u.id)) continue; // ya salió sorteado en este o algún rango (aunque no haya reclamado)
    if (!confirmedEmails(confirmedPayers).has((u.email || "").toLowerCase())) continue; // pago no confirmado
    if (!u.last_seen_at) continue; // pagó pero nunca ingresó — no participa
    const rank = getRank(u.total_points ?? 0);
    if (rank.key === "expert" && mentorshipEmails.has((u.email || "").toLowerCase())) continue; // ya tiene la mentoría de $15K
    pools[rank.key].push({ id: u.id, full_name: u.full_name, email: u.email, total_points: u.total_points ?? 0 });
  }
  for (const key of Object.keys(pools)) {
    pools[key].sort((a, b) => b.total_points - a.total_points);
  }

  // Solo mostramos como "ganadores activos" a pending_claim/claimed —
  // los eliminated (no reclamaron, ya reemplazados) quedan ocultos pero
  // siguen bloqueando el pool arriba.
  const activeRows = allWinnerRows.filter((w) => w.status !== "eliminated");
  const winnersByRank: Record<string, Array<{ id: string; winnerId: string; full_name: string | null; email: string; drawn_at: string; status: string; claimed_at: string | null }>> = {};
  const winnerUserIds = [...new Set(activeRows.map((w) => w.user_id))];
  const nameMap: Record<string, { full_name: string | null; email: string }> = {};
  if (winnerUserIds.length) {
    const { data: winnerUsers } = await auth.service.from("users").select("id, full_name, email").in("id", winnerUserIds);
    for (const u of (winnerUsers ?? []) as Array<{ id: string; full_name: string | null; email: string }>) {
      nameMap[u.id] = { full_name: u.full_name, email: u.email };
    }
  }
  for (const w of activeRows as unknown as Array<WinnerRow & { id: string }>) {
    winnersByRank[w.rank_key] = winnersByRank[w.rank_key] ?? [];
    winnersByRank[w.rank_key].push({
      id: w.user_id,
      winnerId: w.id,
      full_name: nameMap[w.user_id]?.full_name ?? null,
      email: nameMap[w.user_id]?.email ?? "",
      drawn_at: w.drawn_at,
      status: w.status ?? "pending_claim",
      claimed_at: w.claimed_at,
    });
  }

  return NextResponse.json({ ok: true, pools, winners: winnersByRank });
}

function confirmedEmails(rows: unknown): Set<string> {
  return new Set(((rows ?? []) as { email: string }[]).map((p) => p.email.toLowerCase()));
}

/**
 * POST → sortea los lugares que falten en rankKey (target - ya reclamados).
 * Si había ganadores pending_claim sin reclamar, los pasa a 'eliminated'
 * antes de sortear los reemplazos. Body: { rankKey, allowedIds }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as { rankKey?: string; allowedIds?: string[] };
  const rank = RANKS.find((r) => r.key === body.rankKey) as Rank | undefined;
  if (!rank) return NextResponse.json({ error: "bad_rank" }, { status: 400 });
  const target = TARGET_COUNT[rank.key] ?? 1;
  const allowedIds = Array.isArray(body.allowedIds) ? body.allowedIds.filter((id) => typeof id === "string") : [];

  // 1. Los pending_claim previos (si los hay) pasan a eliminated — nunca
  //    vuelven a entrar al pool, ni de este ni de otro rango.
  const { error: elimError } = await auth.service
    .from("sorteo_winners")
    .update({ status: "eliminated" })
    .eq("rank_key", rank.key)
    .eq("status", "pending_claim");
  if (elimError?.code === "42P01") return NextResponse.json({ error: "table_not_found" }, { status: 501 });
  if (elimError) {
    console.error("[admin/sorteo POST eliminate]", elimError.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // 2. ¿Cuántos lugares faltan?
  const { data: claimedRows, error: claimedError } = await auth.service
    .from("sorteo_winners")
    .select("id")
    .eq("rank_key", rank.key)
    .eq("status", "claimed");
  if (claimedError) return NextResponse.json({ error: "internal" }, { status: 500 });
  const remaining = target - (claimedRows?.length ?? 0);
  if (remaining <= 0) {
    return NextResponse.json({ error: "already_complete" }, { status: 400 });
  }

  if (allowedIds.length === 0) {
    return NextResponse.json({ error: "empty_pool" }, { status: 400 });
  }
  if (allowedIds.length < remaining) {
    return NextResponse.json({ error: "not_enough_candidates", available: allowedIds.length, remaining }, { status: 400 });
  }

  let winnerIds: string[];
  if (WEIGHTED_RANKS.has(rank.key)) {
    // Elevate/Prime: ponderado por puntos — recalculo los puntos FRESCOS acá
    // (no confío en pesos que pudiera mandar el cliente).
    const { data: weightRows } = await auth.service.from("users").select("id, total_points").in("id", allowedIds);
    const pointsMap = new Map(
      ((weightRows ?? []) as Array<{ id: string; total_points: number }>).map((u) => [u.id, u.total_points ?? 0])
    );
    const weights = allowedIds.map((id) => pointsMap.get(id) ?? 0);
    winnerIds = weightedSampleWithoutReplacement(allowedIds, weights, remaining);
  } else {
    // Legacy/Expert: sorteo uniforme (shuffle Fisher-Yates), todos con la misma chance.
    const pool = [...allowedIds];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    winnerIds = pool.slice(0, remaining);
  }

  const rows = winnerIds.map((user_id) => ({ rank_key: rank.key, user_id, drawn_by: auth.adminId, status: "pending_claim" }));
  const { error } = await auth.service.from("sorteo_winners").insert(rows);

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "table_not_found" }, { status: 501 });
  }
  if (error) {
    console.error("[admin/sorteo POST]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const { data: winnerUsers } = await auth.service.from("users").select("id, full_name, email").in("id", winnerIds);
  return NextResponse.json({ ok: true, winners: winnerUsers ?? [] });
}

/** PATCH → marca/desmarca un ganador como "reclamó el premio". Body: { winnerId, claimed } */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as { winnerId?: string; claimed?: boolean };
  if (!body.winnerId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { error } = await auth.service
    .from("sorteo_winners")
    .update(
      body.claimed
        ? { status: "claimed", claimed_at: new Date().toISOString() }
        : { status: "pending_claim", claimed_at: null }
    )
    .eq("id", body.winnerId);

  if (error) {
    console.error("[admin/sorteo PATCH]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE → reinicio total de un rango (borra TODO, incluso reclamados). Body: { rankKey } */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as { rankKey?: string };
  const rank = RANKS.find((r) => r.key === body.rankKey);
  if (!rank) return NextResponse.json({ error: "bad_rank" }, { status: 400 });

  const { error } = await auth.service.from("sorteo_winners").delete().eq("rank_key", rank.key);
  if (error) {
    console.error("[admin/sorteo DELETE]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
