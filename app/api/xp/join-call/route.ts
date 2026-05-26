import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const POINTS = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { day } = (await req.json()) as { day?: number };
  if (!day || day < 1 || day > 4) {
    return NextResponse.json({ error: "invalid_day" }, { status: 400 });
  }

  const service = createServiceClient();
  const eventType = `call_join_day_${day}`;

  // Attempt atomic INSERT — fails with PK duplicate if already claimed
  const { error: insertError } = await service
    .from("user_events")
    .insert({ user_id: user.id, event_type: eventType });

  if (insertError) {
    if (insertError.code === "23505") {
      // Already received XP for this day's call
      return NextResponse.json({ ok: true, awarded: false, already_claimed: true });
    }
    console.error("[join-call] insert error:", insertError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Read current points and add reward
  const { data: profile } = await service
    .from("users")
    .select("total_points")
    .eq("id", user.id)
    .single();

  const newTotal = (profile?.total_points ?? 0) + POINTS;

  await service
    .from("users")
    .update({ total_points: newTotal })
    .eq("id", user.id);

  return NextResponse.json({ ok: true, awarded: true, delta: POINTS, total: newTotal });
}
