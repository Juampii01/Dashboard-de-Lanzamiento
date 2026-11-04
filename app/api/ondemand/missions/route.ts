import { NextResponse } from "next/server";
import { isMigrationMissing, requireOndemandUser } from "@/lib/ondemand-server";

/**
 * GET /api/ondemand/missions
 * Misiones fijas de on demand (todas las activas) con el estado de la persona.
 */
export async function GET() {
  const auth = await requireOndemandUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { db, userId } = auth;

  const [{ data: missions, error }, { data: subs }] = await Promise.all([
    db
      .from("ondemand_missions")
      .select("id, day_number, title, description, action_url, proof, points_reward, sort_order")
      .eq("is_active", true)
      .order("day_number", { ascending: true, nullsFirst: true })
      .order("sort_order", { ascending: true }),
    db
      .from("ondemand_mission_submissions")
      .select("mission_id, status, points_awarded, created_at")
      .eq("user_id", userId),
  ]);
  if (isMigrationMissing(error)) return NextResponse.json({ missions: [] });
  if (error) return NextResponse.json({ error: "internal" }, { status: 500 });

  const byMission = new Map(((subs ?? []) as Array<{ mission_id: string; status: string; points_awarded: number }>).map((s) => [s.mission_id, s]));
  return NextResponse.json({
    missions: ((missions ?? []) as Array<Record<string, unknown> & { id: string }>).map((m) => ({
      ...m,
      submission: byMission.get(m.id) ?? null,
    })),
  });
}
