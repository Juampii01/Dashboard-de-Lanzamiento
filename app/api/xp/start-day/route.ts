import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const POINTS = 25;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ awarded: false }, { status: 401 });

  const { day } = await req.json();
  if (!day || day < 1 || day > 4) {
    return NextResponse.json({ awarded: false, error: "invalid_day" }, { status: 400 });
  }

  // Idempotent: if a day_progress row already exists, the day was already started
  const { data: existing } = await supabase
    .from("day_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("day_number", day)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ awarded: false, alreadyStarted: true });
  }

  // Create the row and award XP
  await supabase.from("day_progress").upsert(
    { user_id: user.id, day_number: day, is_unlocked: true, is_completed: false },
    { onConflict: "user_id,day_number" }
  );

  const { data: profile } = await supabase
    .from("users")
    .select("total_points, is_admin")
    .eq("id", user.id)
    .single();

  const newTotal = (profile?.total_points ?? 0) + POINTS;
  await supabase.from("users").update({ total_points: newTotal }).eq("id", user.id);

  return NextResponse.json({ awarded: true, points: POINTS, total: newTotal });
}
