import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { dayUnlockIso, JOIN_LEAD_MS } from "@/lib/launch";

const POINTS = 125; // unificado con la llamada en vivo

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { day } = (await req.json()) as { day?: number };
  if (!day || day < 1 || day > 4) {
    return NextResponse.json({ error: "invalid_day" }, { status: 400 });
  }

  // Gate por TIEMPO (no por desbloqueo del día): la XP de la llamada se reclama
  // cuando el contador del día ya llegó a 0 (hora de la clase). El día sigue
  // bloqueado mientras dura la llamada — el equipo lo abre recién al terminar —,
  // así que el guard de "día desbloqueado" no sirve acá. Esto evita además que
  // alguien reclame los puntos de un día antes de su clase.
  const toggle = await getAdminToggle(supabase, day);
  const classMs = Date.parse(dayUnlockIso(toggle?.scheduled_unlock_at, day));
  if (classMs && Date.now() < classMs - JOIN_LEAD_MS) {
    return NextResponse.json({ error: "too_early" }, { status: 403 });
  }

  const service = createServiceClient();
  const eventType = `call_join_day_${day}`;

  // Attempt atomic INSERT — fails with PK duplicate if already claimed
  const { error: insertError } = await service
    .from("user_events")
    .insert({ user_id: user.id, event_type: eventType });

  if (insertError) {
    if (insertError.code === "23505") {
      // Already received XP for this day's call
      return NextResponse.json({ ok: true, awarded: false, already_claimed: true });
    }
    console.error("[join-call] insert error:", insertError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // A3 fix: atomic increment — no read-then-write race on total_points
  const { data: newTotal, error: pointsError } = await service.rpc("add_points", {
    p_user_id: user.id,
    p_delta: POINTS,
    p_category: "call",
  });

  if (pointsError) {
    console.error("[join-call] add_points error:", pointsError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, awarded: true, delta: POINTS, total: newTotal });
}
