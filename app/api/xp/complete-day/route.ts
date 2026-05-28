import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const POINTS_PER_DAY = 50;

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { day } = await req.json();
  if (!day || day < 1 || day > 4) {
    return NextResponse.json({ ok: false, error: "invalid_day" }, { status: 400 });
  }

  const service = createServiceClient();

  // Atomic update: only succeeds if the row exists AND is_completed = false.
  // This eliminates the SELECT→UPDATE race condition.
  const { data: updatedRows, error: updateError } = await service
    .from("day_progress")
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      is_unlocked: true,
    })
    .eq("user_id", user.id)
    .eq("day_number", day)
    .eq("is_completed", false) // only update if NOT already completed
    .select();

  if (updateError) {
    console.error("[complete-day] update error:", updateError);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }

  const wasAlreadyCompleted = !updatedRows || updatedRows.length === 0;

  if (wasAlreadyCompleted) {
    // Either already completed, or row doesn't exist yet (edge case: no start-day)
    const { data: existing } = await service
      .from("day_progress")
      .select("is_completed")
      .eq("user_id", user.id)
      .eq("day_number", day)
      .maybeSingle();

    if (existing?.is_completed) {
      // Legitimately already completed — return current XP total
      const { data: u } = await service
        .from("users")
        .select("total_points")
        .eq("id", user.id)
        .single();
      return NextResponse.json({
        ok: true,
        pointsAwarded: 0,
        total: u?.total_points ?? 0,
        alreadyCompleted: true,
      });
    }

    // Row doesn't exist — create and mark completed (edge case: user skipped start-day)
    await service.from("day_progress").upsert(
      {
        user_id: user.id,
        day_number: day,
        is_completed: true,
        is_unlocked: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day_number" }
    );
    // Fall through to award XP below
  }

  // A3 fix: atomic increment — no read-then-write race on total_points
  const { data: newTotal, error: pointsError } = await service.rpc("add_points", {
    p_user_id: user.id,
    p_delta: POINTS_PER_DAY,
  });

  if (pointsError) {
    console.error("[complete-day] add_points error:", pointsError);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }

  // Combo progress — completar un día da un gran impulso
  const { data: comboVal } = await service.rpc("add_combo_progress", {
    p_user_id: user.id,
    p_delta: 30,
  });

  return NextResponse.json({
    ok: true,
    pointsAwarded: POINTS_PER_DAY,
    total: newTotal ?? 0,
    alreadyCompleted: false,
    combo: comboVal ?? undefined,
  });
}
