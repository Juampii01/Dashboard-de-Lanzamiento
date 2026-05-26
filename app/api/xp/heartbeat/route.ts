import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const POINTS = 5;
const COOLDOWN_MINUTES = 10;
const DAILY_CAP = 30;

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ awarded: false }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("total_points, last_time_xp_at, is_admin, heartbeat_count_today, heartbeat_count_day")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ awarded: false }, { status: 404 });

  const now = new Date();

  // Admins bypass the cooldown and daily cap entirely
  if (!profile.is_admin) {
    const lastXp = profile.last_time_xp_at ? new Date(profile.last_time_xp_at) : null;
    const minutesSinceLast = lastXp
      ? (now.getTime() - lastXp.getTime()) / 60_000
      : Infinity;

    if (minutesSinceLast < COOLDOWN_MINUTES) {
      const nextInSeconds = Math.ceil((COOLDOWN_MINUTES - minutesSinceLast) * 60);
      return NextResponse.json({ awarded: false, nextInSeconds });
    }

    // Daily cap check
    const today = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const isSameDay = profile.heartbeat_count_day === today;
    const currentCount = isSameDay ? (profile.heartbeat_count_today ?? 0) : 0;

    if (currentCount >= DAILY_CAP) {
      return NextResponse.json({ ok: true, awarded: false, capped: true, points: 0 });
    }

    // Compute new heartbeat count for the update
    const newCount = currentCount + 1;
    const newTotal = (profile.total_points ?? 0) + POINTS;

    await supabase
      .from("users")
      .update({
        total_points: newTotal,
        last_time_xp_at: now.toISOString(),
        heartbeat_count_today: newCount,
        heartbeat_count_day: today,
      })
      .eq("id", user.id);

    return NextResponse.json({ awarded: true, points: POINTS, total: newTotal });
  }

  // Admin path — no cooldown, no cap
  const newTotal = (profile.total_points ?? 0) + POINTS;

  await supabase
    .from("users")
    .update({ total_points: newTotal, last_time_xp_at: now.toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ awarded: true, points: POINTS, total: newTotal });
}
