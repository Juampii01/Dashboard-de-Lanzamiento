import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const POINTS = 125; // +125 por llamada en vivo · 4 llamadas = 500 pts

/**
 * POST /api/xp/live-call-join
 * Body: { callId: string }   — the dashboard_lock.locked_at of the current call.
 *
 * Awards join points the FIRST time the user clicks "Ir a la llamada" for a
 * given live call. Each new call (new locked_at) is eligible again.
 * Idempotent via a unique user_events row keyed by the call id.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let callId = "";
  try {
    const body = (await req.json()) as { callId?: string };
    callId = (body.callId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!callId) {
    return NextResponse.json({ error: "missing_call_id" }, { status: 400 });
  }

  const service = createServiceClient();
  // Keep the key short + unique per call. Truncate to stay within column limits.
  const eventType = `live_call_${callId}`.slice(0, 80);

  // Atomic INSERT — PK/unique collision means already claimed for this call
  const { error: insertError } = await service
    .from("user_events")
    .insert({ user_id: user.id, event_type: eventType });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, awarded: false, already_claimed: true });
    }
    console.error("[live-call-join] insert error:", insertError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const { data: newTotal, error: pointsError } = await service.rpc("add_points", {
    p_user_id: user.id,
    p_delta: POINTS,
    p_category: "call",
  });

  if (pointsError) {
    console.error("[live-call-join] add_points error:", pointsError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, awarded: true, delta: POINTS, total: newTotal });
}
