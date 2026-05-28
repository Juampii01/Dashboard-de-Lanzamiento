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
    .select("last_avatar_xp_at, is_admin")
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

  // A3 fix: atomic increment — no read-then-write race on total_points
  const { data: newTotal, error } = await supabase.rpc("add_points", {
    p_user_id: user.id,
    p_delta: POINTS,
  });

  if (error) {
    console.error("[avatar] add_points error:", error);
    return NextResponse.json({ awarded: false }, { status: 500 });
  }

  // Stamp cooldown + increment combo in parallel (both non-critical)
  const [, { data: comboVal }] = await Promise.all([
    supabase
      .from("users")
      .update({ last_avatar_xp_at: now.toISOString() })
      .eq("id", user.id),
    supabase.rpc("add_combo_progress", { p_user_id: user.id, p_delta: 5 }),
  ]);

  return NextResponse.json({
    awarded: true,
    points: POINTS,
    total: newTotal,
    combo: comboVal ?? undefined,
  });
}
