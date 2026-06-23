import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { isDayUnlocked } from "@/lib/supabase/day-access";

const COOLDOWN_MINUTES = 5;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { capsuleId } = await req.json();
  if (!capsuleId) return NextResponse.json({ ok: false, error: "missing_capsule_id" }, { status: 400 });

  // Check if user is admin (admins bypass all cooldowns)
  const { data: userProfile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = userProfile?.is_admin === true;

  // Check if already completed this capsule (applies to everyone, even admins)
  const { data: existing } = await supabase
    .from("video_capsule_completions")
    .select("id")
    .eq("user_id", user.id)
    .eq("capsule_id", capsuleId)
    .maybeSingle();

  if (existing) {
    // Admins can "re-watch" to reopen the quiz — no new XP
    if (isAdmin) {
      return NextResponse.json({ ok: true, alreadyWatched: true, points: 0, total: null });
    }
    return NextResponse.json({ ok: false, alreadyWatched: true });
  }

  // Check global 5-min cooldown — admins skip this
  if (!isAdmin) {
    const { data: recent } = await supabase
      .from("video_capsule_completions")
      .select("completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent?.completed_at) {
      const minutesSince = (Date.now() - new Date(recent.completed_at).getTime()) / 60_000;
      if (minutesSince < COOLDOWN_MINUTES) {
        const nextInSeconds = Math.ceil((COOLDOWN_MINUTES - minutesSince) * 60);
        return NextResponse.json({ ok: false, cooldown: true, nextInSeconds });
      }
    }
  }

  // Get capsule metadata (points + day_number for the unlock gate)
  const { data: capsule } = await supabase
    .from("video_capsules")
    .select("points_reward, day_number")
    .eq("id", capsuleId)
    .single();

  const points = capsule?.points_reward ?? 100;

  // ── Day-unlock gate ───────────────────────────────────────────────────────
  // Derive day_number from the capsule and verify the user (or a global toggle)
  // has that day unlocked — same logic as /api/quiz/submit.
  // Admins skip this check via isDayUnlocked's third pass.
  if (capsule?.day_number != null) {
    const unlocked = await isDayUnlocked(user.id, capsule.day_number);
    if (!unlocked) {
      return NextResponse.json({ ok: false, error: "day_locked" }, { status: 403 });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Record completion — unique constraint prevents double-award on concurrent requests
  const { error: insertError } = await supabase.from("video_capsule_completions").insert({
    user_id: user.id,
    capsule_id: capsuleId,
    points_earned: points,
    completed_at: new Date().toISOString(),
  });

  // 23505 = unique_violation: another request beat us to it
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: false, alreadyWatched: true });
    }
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  // A3 fix: atomic increment — no read-then-write race on total_points
  const { data: newTotal, error: pointsError } = await supabase.rpc("add_points", {
    p_user_id: user.id,
    p_delta: points,
    p_category: "video",
  });

  if (pointsError) {
    console.error("[watch-capsule] add_points error:", pointsError);
    return NextResponse.json({ ok: true, points, total: null });
  }

  return NextResponse.json({ ok: true, points, total: newTotal });
}
