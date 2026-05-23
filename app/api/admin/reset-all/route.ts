import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  // 1. Borrar todo el progreso de días
  await service.from("day_progress").delete().eq("user_id", user.id);

  // 2. Borrar completados de cápsulas de video
  await service.from("video_capsule_completions").delete().eq("user_id", user.id);

  // 3. Resetear puntos y timestamps XP del usuario
  await service
    .from("users")
    .update({
      total_points: 0,
      last_time_xp_at: null,
      last_avatar_xp_at: null,
      has_seen_onboarding: false,
    })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
