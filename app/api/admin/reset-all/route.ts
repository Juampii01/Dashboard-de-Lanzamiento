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

  // 4. Borrar TODOS los artefactos generados por día — si no, al restablecer
  //    quedaban cargados (ej: los códigos del Día 2 reaparecían sin rehacerlo).
  await service.from("naics_expansions").delete().eq("user_id", targetUserId);      // Día 2: códigos + keywords
  await service.from("web_previews").delete().eq("user_id", targetUserId);          // Día 3: preview web
  await service.from("capability_statements").delete().eq("user_id", targetUserId); // Día 4: capability statement
  await service.from("sorteo_submissions").delete().eq("user_id", targetUserId);    // Día 4: entregable del sorteo
  await service.from("video_quiz_attempts").delete().eq("user_id", targetUserId);   // intentos de quiz
  await service.from("podcast_xp_claims").delete().eq("user_id", targetUserId);     // claims de podcast
  await service.from("company_profiles").delete().eq("user_id", targetUserId);      // Día 1: perfil de empresa

  // 5. Resetear puntos, timestamps y contadores de heartbeat
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
