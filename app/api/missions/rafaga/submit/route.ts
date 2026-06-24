import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as { rafaga_id?: string };
  const rafaga_id = String(body.rafaga_id ?? "").trim();
  if (!rafaga_id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const service = createServiceClient();

  const { data: rafaga } = await service
    .from("rafaga_missions")
    .select("id, points_reward, starts_at, duration_minutes, is_active")
    .eq("id", rafaga_id)
    .maybeSingle();

  if (!rafaga || !(rafaga as { is_active: boolean }).is_active) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const r = rafaga as {
    id: string;
    points_reward: number;
    starts_at: string;
    duration_minutes: number;
    is_active: boolean;
  };

  const now = Date.now();
  const startsAt = new Date(r.starts_at).getTime();
  const endsAt = startsAt + r.duration_minutes * 60 * 1000;

  if (now < startsAt) {
    return NextResponse.json({ error: "not_open_yet" }, { status: 409 });
  }
  if (now > endsAt) {
    return NextResponse.json({ error: "expired" }, { status: 409 });
  }

  // Register (idempotent via UNIQUE user_id+rafaga_id)
  const { error: insErr } = await service.from("rafaga_submissions").insert({
    user_id: user.id,
    rafaga_id,
    points_earned: r.points_reward,
  });

  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: true, awarded: false, reason: "already_claimed" });
    }
    console.error("[rafaga/submit] insert error:", insErr);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Award XP. Si falla, rollback de la fila para que el reintento reacredite
  // (insert + RPC no son atómicos).
  const { data: total, error: rpcErr } = await service.rpc("add_points", {
    p_user_id: user.id,
    p_delta: r.points_reward,
    p_category: "rafaga",
  });

  if (rpcErr) {
    console.error("[rafaga/submit] add_points error:", rpcErr);
    await service.from("rafaga_submissions").delete().eq("user_id", user.id).eq("rafaga_id", rafaga_id);
    return NextResponse.json({ ok: false, error: "award_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, awarded: true, delta: r.points_reward, total });
}
