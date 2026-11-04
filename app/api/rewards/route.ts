import { NextResponse } from "next/server";
import { isMigrationMissing, requireOndemandUser } from "@/lib/ondemand-server";

/**
 * GET /api/rewards
 * Niveles de premios de on demand + puntos de la persona + sus solicitudes.
 * No es un sorteo: cada nivel se gana al llegar a sus puntos.
 */
export async function GET() {
  const auth = await requireOndemandUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { db, userId } = auth;

  const [{ data: tiers, error }, { data: claims }, { data: me }] = await Promise.all([
    db
      .from("reward_tiers")
      .select("id, points, title, description, sort_order")
      .eq("program", "ondemand")
      .eq("is_active", true)
      .order("points", { ascending: true })
      .order("sort_order", { ascending: true }),
    db.from("reward_claims").select("tier_id, status, note, created_at, reviewed_at").eq("user_id", userId),
    db.from("users").select("total_points").eq("id", userId).maybeSingle(),
  ]);
  if (isMigrationMissing(error)) return NextResponse.json({ tiers: [], claims: [], points: 0 });
  if (error) return NextResponse.json({ error: "internal" }, { status: 500 });

  return NextResponse.json({
    tiers: tiers ?? [],
    claims: claims ?? [],
    points: (me as { total_points?: number } | null)?.total_points ?? 0,
  });
}
