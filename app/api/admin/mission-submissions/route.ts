import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return { error: "forbidden" as const, status: 403 };
  return { service };
}

/** GET → submissions de la misión activa (con nombre/email del autor). */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: mission } = await auth.service
    .from("daily_missions").select("id").eq("is_active", true).maybeSingle();
  if (!mission) return NextResponse.json({ ok: true, mission_id: null, submissions: [] });

  const missionId = (mission as { id: string }).id;
  const { data: subs } = await auth.service
    .from("mission_submissions")
    .select("id, user_id, image_url, status, points_awarded, created_at")
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false });

  const rows = (subs ?? []) as Array<{ id: string; user_id: string; image_url: string; status: string; points_awarded: number; created_at: string }>;
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const nameMap: Record<string, { full_name: string | null; email: string }> = {};
  if (ids.length) {
    const { data: users } = await auth.service.from("users").select("id, full_name, email").in("id", ids);
    for (const u of (users ?? []) as Array<{ id: string; full_name: string | null; email: string }>) {
      nameMap[u.id] = { full_name: u.full_name, email: u.email };
    }
  }

  return NextResponse.json({
    ok: true,
    mission_id: missionId,
    submissions: rows.map((r) => ({ ...r, ...(nameMap[r.user_id] ?? { full_name: null, email: "" }) })),
  });
}

/**
 * POST → moderar una submission.
 * Body: { submission_id, action: "reject" | "approve" }
 * reject: descuenta los puntos (si los tenía). approve: re-acredita si estaba rechazada.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { submission_id?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const id = String(body.submission_id ?? "");
  const action = body.action;
  if (!id || (action !== "reject" && action !== "approve")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data: sub } = await auth.service
    .from("mission_submissions")
    .select("id, user_id, mission_id, status, points_awarded")
    .eq("id", id)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const s = sub as { user_id: string; mission_id: string; status: string; points_awarded: number };

  if (action === "reject" && s.status !== "rejected") {
    if (s.points_awarded > 0) {
      await auth.service.rpc("add_points", { p_user_id: s.user_id, p_delta: -s.points_awarded });
    }
    await auth.service.from("mission_submissions")
      .update({ status: "rejected", points_awarded: 0, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (action === "approve" && s.status === "rejected") {
    const { data: mission } = await auth.service
      .from("daily_missions").select("points_reward").eq("id", s.mission_id).maybeSingle();
    const reward = (mission as { points_reward?: number } | null)?.points_reward ?? 0;
    if (reward > 0) {
      await auth.service.rpc("add_points", { p_user_id: s.user_id, p_delta: reward });
    }
    await auth.service.from("mission_submissions")
      .update({ status: "approved", points_awarded: reward, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ ok: true, status: "approved" });
  }

  return NextResponse.json({ ok: true, status: s.status }); // no-op
}
