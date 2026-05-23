import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const POINTS_PER_DAY = 25;

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

  // Check if already completed (prevent double points)
  // Use maybeSingle() so a missing row returns null instead of PGRST116 error
  const { data: progress } = await supabase
    .from("day_progress")
    .select("is_completed")
    .eq("user_id", user.id)
    .eq("day_number", day)
    .maybeSingle();

  const alreadyDone = progress?.is_completed ?? false;

  // Mark day completed — onConflict requires UNIQUE(user_id, day_number) on the table
  await supabase
    .from("day_progress")
    .upsert(
      {
        user_id: user.id,
        day_number: day,
        is_completed: true,
        is_unlocked: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day_number" }
    );

  if (alreadyDone) {
    // Already completed — return current total without adding points
    const { data: profile } = await supabase
      .from("users")
      .select("total_points")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      ok: true,
      pointsAwarded: 0,
      total: profile?.total_points ?? 0,
      alreadyCompleted: true,
    });
  }

  // Award points
  const { data: profile } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", user.id)
    .single();

  const newTotal = (profile?.total_points ?? 0) + POINTS_PER_DAY;

  await supabase
    .from("users")
    .update({ total_points: newTotal })
    .eq("id", user.id);

  return NextResponse.json({
    ok: true,
    pointsAwarded: POINTS_PER_DAY,
    total: newTotal,
    alreadyCompleted: false,
  });
}
