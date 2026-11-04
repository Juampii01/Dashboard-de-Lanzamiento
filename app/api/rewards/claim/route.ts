import { NextResponse } from "next/server";
import { requireOndemandUser } from "@/lib/ondemand-server";

/**
 * POST /api/rewards/claim  { tier_id }
 * Pide el premio de un nivel. Valida en el servidor que la persona tenga los
 * puntos (no confía en el cliente). Una solicitud por nivel; los puntos NO se
 * descuentan. El equipo la aprueba o rechaza en /admin/on-demand.
 */
export async function POST(req: Request) {
  const auth = await requireOndemandUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { db, userId } = auth;

  const body = (await req.json().catch(() => ({}))) as { tier_id?: string };
  const tierId = String(body.tier_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(tierId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const [{ data: tier }, { data: me }] = await Promise.all([
    db.from("reward_tiers").select("id, points, is_active, program").eq("id", tierId).maybeSingle(),
    db.from("users").select("total_points").eq("id", userId).maybeSingle(),
  ]);
  const t = tier as { id: string; points: number; is_active: boolean; program: string } | null;
  if (!t || !t.is_active || t.program !== "ondemand") return NextResponse.json({ error: "tier_not_found" }, { status: 404 });
  const points = (me as { total_points?: number } | null)?.total_points ?? 0;
  if (points < t.points) return NextResponse.json({ error: "not_enough_points", points, needed: t.points }, { status: 400 });

  const { error } = await db.from("reward_claims").insert({ user_id: userId, tier_id: tierId, points_at_request: points });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true, already: true });
    console.error("[rewards/claim]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
