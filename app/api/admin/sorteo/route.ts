import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getRank, RANKS, type Rank } from "@/lib/ranks";

/**
 * Sorteo de premios por rango. Reglas de elegibilidad (distintas por rango):
 *   - Legacy / Expert: OBLIGATORIO haber completado los 4 días del challenge.
 *   - Elevate / Prime: NO hace falta completar los 4 días — cualquier usuario
 *     real del rango entra al sorteo, ponderado por puntos (más puntos = más
 *     probabilidad, ver weightedSampleWithoutReplacement en el POST).
 * Se excluyen SIEMPRE cuentas is_admin / is_student (equipo interno, nunca
 * compiten por premios reales). El admin puede además destildar a mano
 * cualquier otra cuenta rara (test/duplicada) antes de sortear, desde la UI.
 */

const WEIGHTED_RANKS = new Set(["elevate", "prime"]); // ponderado por puntos, sin requisito de días
const GATED_RANKS = new Set(["legacy", "expert"]); // requiere completar los 4 días

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

/** GET → pool elegible por rango + ganadores ya sorteados (persistidos). */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [{ data: users, error: usersError }, { data: progress, error: progressError }, { data: winnersData, error: winnersError }] = await Promise.all([
    auth.service.from("users").select("id, full_name, email, total_points, is_admin, is_student"),
    auth.service.from("day_progress").select("user_id, day_number, is_completed").in("day_number", [1, 2, 3, 4]),
    auth.service.from("sorteo_winners").select("id, rank_key, user_id, drawn_at"),
  ]);

  if (usersError) return NextResponse.json({ error: "internal" }, { status: 500 });
  if (progressError?.code === "42P01") return NextResponse.json({ error: "internal" }, { status: 500 });

  // user_id -> cuántos de los 4 días completó
  const completedCount = new Map<string, number>();
  for (const p of (progress ?? []) as Array<{ user_id: string; is_completed: boolean }>) {
    if (p.is_completed) completedCount.set(p.user_id, (completedCount.get(p.user_id) ?? 0) + 1);
  }

  const alreadyWon = new Set(
    winnersError ? [] : ((winnersData ?? []) as { user_id: string }[]).map((w) => w.user_id)
  );

  const pools: Record<string, EligibleUser[]> = {};
  for (const r of RANKS) pools[r.key] = [];

  for (const u of (users ?? []) as Array<{
    id: string; full_name: string | null; email: string; total_points: number;
    is_admin: boolean; is_student: boolean;
  }>) {
    if (u.is_admin || u.is_student) continue; // staff/test, nunca elegibles
    if (alreadyWon.has(u.id)) continue; // ya ganó algo, no vuelve al pool
    const rank = getRank(u.total_points ?? 0);
    if (GATED_RANKS.has(rank.key) && (completedCount.get(u.id) ?? 0) < 4) continue; // Legacy/Expert: 4 días obligatorio
    pools[rank.key].push({ id: u.id, full_name: u.full_name, email: u.email, total_points: u.total_points ?? 0 });
  }
  for (const key of Object.keys(pools)) {
    pools[key].sort((a, b) => b.total_points - a.total_points);
  }

  const winnersByRank: Record<string, Array<{ id: string; full_name: string | null; email: string; drawn_at: string }>> = {};
  if (!winnersError) {
    const winnerUserIds = [...new Set(((winnersData ?? []) as { user_id: string }[]).map((w) => w.user_id))];
    const nameMap: Record<string, { full_name: string | null; email: string }> = {};
    if (winnerUserIds.length) {
      const { data: winnerUsers } = await auth.service.from("users").select("id, full_name, email").in("id", winnerUserIds);
      for (const u of (winnerUsers ?? []) as Array<{ id: string; full_name: string | null; email: string }>) {
        nameMap[u.id] = { full_name: u.full_name, email: u.email };
      }
    }
    for (const w of (winnersData ?? []) as Array<{ rank_key: string; user_id: string; drawn_at: string }>) {
      winnersByRank[w.rank_key] = winnersByRank[w.rank_key] ?? [];
      winnersByRank[w.rank_key].push({
        id: w.user_id,
        full_name: nameMap[w.user_id]?.full_name ?? null,
        email: nameMap[w.user_id]?.email ?? "",
        drawn_at: w.drawn_at,
      });
    }
  }

  return NextResponse.json({ ok: true, pools, winners: winnersByRank });
}

/** POST → sortea `count` ganadores dentro de rankKey, entre los ids permitidos. Body: { rankKey, count, allowedIds } */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as { rankKey?: string; count?: number; allowedIds?: string[] };
  const rank = RANKS.find((r) => r.key === body.rankKey) as Rank | undefined;
  if (!rank) return NextResponse.json({ error: "bad_rank" }, { status: 400 });
  const count = Math.max(1, Math.min(50, Number(body.count) || 1));
  const allowedIds = Array.isArray(body.allowedIds) ? body.allowedIds.filter((id) => typeof id === "string") : [];

  if (allowedIds.length === 0) {
    return NextResponse.json({ error: "empty_pool" }, { status: 400 });
  }
  if (allowedIds.length < count) {
    return NextResponse.json({ error: "not_enough_candidates", available: allowedIds.length }, { status: 400 });
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
    winnerIds = weightedSampleWithoutReplacement(allowedIds, weights, count);
  } else {
    // Legacy/Expert: sorteo uniforme (shuffle Fisher-Yates), todos con la misma chance.
    const pool = [...allowedIds];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    winnerIds = pool.slice(0, count);
  }

  const rows = winnerIds.map((user_id) => ({ rank_key: rank.key, user_id, drawn_by: auth.adminId }));
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

/** DELETE → limpia los ganadores de un rango, para volver a sortear. Body: { rankKey } */
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
