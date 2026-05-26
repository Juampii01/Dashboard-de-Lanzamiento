import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const service = createServiceClient();

  // Verify admin
  const { data: profile } = await service
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // targetUserId: if provided, reset that user; otherwise reset the admin's own account
  let body: { targetUserId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is ok
  }
  const targetUserId = body.targetUserId ?? user.id;

  // 1. Borrar progreso de días
  await service.from("day_progress").delete().eq("user_id", targetUserId);

  // 2. Borrar completados de cápsulas de video
  await service.from("video_capsule_completions").delete().eq("user_id", targetUserId);

  // 3. Borrar user_events (call joins, etc.)
  await service.from("user_events").delete().eq("user_id", targetUserId);

  // 4. Resetear puntos, timestamps y contadores de heartbeat
  await service
    .from("users")
    .update({
      total_points: 0,
      last_time_xp_at: null,
      last_avatar_xp_at: null,
      has_seen_onboarding: false,
      heartbeat_count_today: 0,
      heartbeat_count_day: null,
    })
    .eq("id", targetUserId);

  return NextResponse.json({ ok: true });
}
