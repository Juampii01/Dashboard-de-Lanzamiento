import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const COOLDOWN_MINUTES = 5;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { capsuleId } = await req.json();
  if (!capsuleId) return NextResponse.json({ ok: false, error: "missing_capsule_id" }, { status: 400 });

  // Check if already completed this capsule
  const { data: existing } = await supabase
    .from("video_capsule_completions")
    .select("id")
    .eq("user_id", user.id)
    .eq("capsule_id", capsuleId)
    .single();

  if (existing) {
    return NextResponse.json({ ok: false, alreadyWatched: true });
  }

  // Check global 5-min cooldown (most recent completion by this user)
  const { data: recent } = await supabase
    .from("video_capsule_completions")
    .select("completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (recent?.completed_at) {
    const minutesSince = (Date.now() - new Date(recent.completed_at).getTime()) / 60_000;
    if (minutesSince < COOLDOWN_MINUTES) {
      const nextInSeconds = Math.ceil((COOLDOWN_MINUTES - minutesSince) * 60);
      return NextResponse.json({ ok: false, cooldown: true, nextInSeconds });
    }
  }

  // Get capsule points
  const { data: capsule } = await supabase
    .from("video_capsules")
    .select("points_reward")
    .eq("id", capsuleId)
    .single();

  const points = capsule?.points_reward ?? 10;

  // Record completion
  await supabase.from("video_capsule_completions").insert({
    user_id: user.id,
    capsule_id: capsuleId,
    points_earned: points,
    completed_at: new Date().toISOString(),
  });

  // Award XP
  const { data: profile } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", user.id)
    .single();

  const newTotal = (profile?.total_points ?? 0) + points;
  await supabase.from("users").update({ total_points: newTotal }).eq("id", user.id);

  return NextResponse.json({ ok: true, points, total: newTotal });
}
