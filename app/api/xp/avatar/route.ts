import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const POINTS = 3;
const COOLDOWN_MINUTES = 60;

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ awarded: false }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("total_points, last_avatar_xp_at, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ awarded: false }, { status: 404 });

  const now = new Date();

  // Admins bypass the cooldown entirely
  if (!profile.is_admin) {
    const lastXp = profile.last_avatar_xp_at
      ? new Date(profile.last_avatar_xp_at)
      : null;
    const minutesSinceLast = lastXp
      ? (now.getTime() - lastXp.getTime()) / 60_000
      : Infinity;

    if (minutesSinceLast < COOLDOWN_MINUTES) {
      const nextInMinutes = Math.ceil(COOLDOWN_MINUTES - minutesSinceLast);
      return NextResponse.json({ awarded: false, nextInMinutes });
    }
  }

  const newTotal = (profile.total_points ?? 0) + POINTS;

  await supabase
    .from("users")
    .update({ total_points: newTotal, last_avatar_xp_at: now.toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ awarded: true, points: POINTS, total: newTotal });
}
