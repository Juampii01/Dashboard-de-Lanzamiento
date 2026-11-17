import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUserProgram } from "@/lib/program-server";
import { getCallBanner } from "@/lib/call-banner";

/**
 * POST /api/xp/call-banner
 * Suma los puntos de la llamada al entrar desde el banner. Una vez por llamada
 * (user_events "call_banner_<id>"). No respeta el tope de 1.600 (add_points_uncapped).
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((await getUserProgram(user.id)) === "ondemand") {
    return NextResponse.json({ ok: false, awarded: false, skipped: "ondemand" });
  }

  const service = createServiceClient();
  const banner = await getCallBanner(service);
  if (!banner || banner.points <= 0) return NextResponse.json({ error: "no_call" }, { status: 404 });

  const { error: insertError } = await service
    .from("user_events")
    .insert({ user_id: user.id, event_type: `call_banner_${banner.id}`.slice(0, 80) });
  if (insertError) {
    if (insertError.code === "23505") return NextResponse.json({ ok: true, awarded: false, already_claimed: true });
    console.error("[call-banner] insert:", insertError.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const { data: total, error } = await service.rpc("add_points_uncapped", {
    p_user_id: user.id,
    p_delta: banner.points,
    p_category: "call",
  });
  if (error) {
    console.error("[call-banner] add_points_uncapped:", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, awarded: true, delta: banner.points, total });
}
