import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { isDayUnlocked } from "@/lib/supabase/day-access";

const POINTS = 250;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ awarded: false }, { status: 401 });

  const { day } = await req.json();
  if (!day || day < 1 || day > 4) {
    return NextResponse.json({ awarded: false, error: "invalid_day" }, { status: 400 });
  }

  // ── Day-unlock gate ───────────────────────────────────────────────────────
  // Mirrors the gate in /api/quiz/submit: checks day_progress, admin_toggles,
  // and users.is_admin before allowing XP to be awarded.
  const unlocked = await isDayUnlocked(user.id, day);
  if (!unlocked) {
    return NextResponse.json({ awarded: false, error: "day_locked" }, { status: 403 });
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Idempotente y atómico: insertamos la fila; si ya existe (UNIQUE user_id,day_number)
  // el INSERT falla con 23505 → el día ya se inició y NO se vuelve a otorgar XP.
  // Esto evita la carrera del SELECT→upsert (dos requests dando +25 en el primer hit).
  const { error: insertError } = await supabase
    .from("day_progress")
    .insert({ user_id: user.id, day_number: day, is_unlocked: true, is_completed: false });

  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") {
      return NextResponse.json({ awarded: false, alreadyStarted: true });
    }
    console.error("[start-day] insert error:", insertError);
    return NextResponse.json({ awarded: false }, { status: 500 });
  }

  // A3 fix: atomic increment — no read-then-write race on total_points
  const { data: newTotal, error } = await supabase.rpc("add_points", {
    p_user_id: user.id,
    p_delta: POINTS,
  });

  if (error) {
    console.error("[start-day] add_points error:", error);
    return NextResponse.json({ awarded: false }, { status: 500 });
  }

  return NextResponse.json({ awarded: true, points: POINTS, total: newTotal });
}
