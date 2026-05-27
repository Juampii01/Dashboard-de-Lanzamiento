import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/xp/heartbeat
 *
 * Delegates the full cooldown + daily-cap + award logic to the
 * award_heartbeat_xp() SQL function, which runs atomically under a
 * FOR UPDATE row lock.  This eliminates the read-then-write race that
 * allowed concurrent requests to award duplicate XP.
 *
 * A5 fix: the SQL function compares heartbeat_count_day against
 * CURRENT_DATE (UTC) in one transaction, so the cap cannot be gamed
 * by straddling the UTC midnight boundary from different time zones.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ awarded: false }, { status: 401 });

  const { data, error } = await supabase.rpc("award_heartbeat_xp", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("[heartbeat] award_heartbeat_xp error:", error);
    return NextResponse.json({ awarded: false }, { status: 500 });
  }

  // data shape: { awarded, points?, total?, nextInSeconds?, capped?, error? }
  return NextResponse.json(data);
}
