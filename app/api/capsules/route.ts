import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const day = Number(req.nextUrl.searchParams.get("day") ?? "0");
  if (!day || day < 1 || day > 4) {
    return NextResponse.json({ capsules: [] }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch capsules for this day
  const { data: capsules } = await supabase
    .from("video_capsules")
    .select("id, title, description, youtube_url, points_reward, sort_order")
    .eq("day_number", day)
    .order("sort_order");

  if (!capsules) return NextResponse.json({ capsules: [] });

  // Fetch completions for this user
  let completedIds = new Set<string>();
  let lastCompletedAt: string | null = null;

  if (user) {
    const capsuleIds = capsules.map((c) => c.id);
    const { data: completions } = await supabase
      .from("video_capsule_completions")
      .select("capsule_id, completed_at")
      .eq("user_id", user.id)
      .in("capsule_id", capsuleIds)
      .order("completed_at", { ascending: false });

    if (completions) {
      completedIds = new Set(completions.map((c) => c.capsule_id));
      lastCompletedAt = completions[0]?.completed_at ?? null;
    }
  }

  const enriched = capsules.map((c) => ({
    ...c,
    completed: completedIds.has(c.id),
  }));

  return NextResponse.json({ capsules: enriched, lastCompletedAt });
}
