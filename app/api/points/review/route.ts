import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getActor } from "@/lib/viewer";
import { getReviewSummary, markReviewSeen } from "@/lib/missions/pending-points";

/**
 * GET /api/points/review
 * Puntos en revisión del participante (ráfagas y misión del día):
 * { ok, pending_points, pending_count, items[], unseen{...} }
 * Los viewers ven los del anfitrión (getActor).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const actor = await getActor(user.id);
  const summary = await getReviewSummary(createServiceClient(), actor.userId);
  return NextResponse.json({ ok: true, ...summary });
}

/**
 * POST /api/points/review → marca como vistos los resultados ya revisados
 * (para no volver a mostrar "se te acreditaron X pts"). Los viewers no
 * pueden escribir (el middleware corta el POST).
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  await markReviewSeen(createServiceClient(), user.id);
  return NextResponse.json({ ok: true });
}
