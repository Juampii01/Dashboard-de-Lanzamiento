import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isDayUnlocked } from "@/lib/supabase/day-access";

const POINTS = 300;

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

  // Day-unlock gate: no reclamar XP de la llamada de un día bloqueado.
  if (!(await isDayUnlocked(user.id, day))) {
    return NextResponse.json({ error: "day_locked" }, { status: 403 });
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
