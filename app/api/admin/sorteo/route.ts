import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getRank, RANKS, type Rank } from "@/lib/ranks";

/**
 * Sorteo de premios por rango. Elegibilidad = sorteo_submissions.eligible = true
 * (el usuario subió su Capability Statement antes del cierre, ver dia-4/client.tsx).
 * Se excluyen SIEMPRE cuentas is_admin / is_student (equipo interno, nunca
 * compiten por premios reales) — no hay columna nueva, es un filtro en cada
 * consulta. El admin puede además destildar a mano cualquier otra cuenta rara
 * (test/duplicada) antes de sortear, desde la UI.
 */

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

/** GET → pool elegible por rango + ganadores ya sorteados (persistidos). */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [{ data: submissions, error: subError }, { data: winnersData, error: winnersError }] = await Promise.all([
    auth.service.from("sorteo_submissions").select("user_id").eq("eligible", true),
    auth.service.from("sorteo_winners").select("id, rank_key, user_id, drawn_at"),
  ]);

  if (subError?.code === "42P01") {
    return NextResponse.json({ error: "sorteo_submissions_missing" }, { status: 501 });
  }
  if (subError) return NextResponse.json({ error: "internal" }, { status: 500 });

  const eligibleIds = ((submissions ?? []) as { user_id: string }[]).map((s) => s.user_id);
  if (eligibleIds.length === 0) {
    return NextResponse.json({ ok: true, pools: {}, winners: {} });
  }

  const { data: users, error: usersError } = await auth.service
    .from("users")
    .select("id, full_name, email, total_points, is_admin, is_student")
    .in("id", eligibleIds);
  if (usersError) return NextResponse.json({ error: "internal" }, { status: 500 });

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

  // Sorteo real: shuffle (Fisher-Yates) y tomo los primeros `count`.
  const pool = [...allowedIds];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const winnerIds = pool.slice(0, count);

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
