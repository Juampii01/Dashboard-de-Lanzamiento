import { NextResponse } from "next/server";
import { detectImageType, requireOndemandUser } from "@/lib/ondemand-server";

/**
 * POST /api/ondemand/missions/submit
 * Body: { mission_id, base64? }  → captura de pantalla
 *    o: { mission_id, text? }    → link o texto (según la misión)
 *
 * Una vez por misión (UNIQUE user+mission). Acredita los puntos al instante;
 * el equipo puede rechazar la respuesta desde /admin/on-demand (descuenta).
 */
export async function POST(req: Request) {
  const auth = await requireOndemandUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { db, userId } = auth;

  let body: { mission_id?: string; base64?: string; text?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const missionId = String(body.mission_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(missionId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { data: mission } = await db
    .from("ondemand_missions")
    .select("id, proof, points_reward, is_active")
    .eq("id", missionId)
    .maybeSingle();
  const m = mission as { id: string; proof: "image" | "link" | "text" | "none"; points_reward: number; is_active: boolean } | null;
  if (!m || !m.is_active) return NextResponse.json({ error: "mission_not_found" }, { status: 404 });

  let image_url: string | null = null;
  let storage_path: string | null = null;
  let content_text: string | null = null;

  if (m.proof === "image") {
    if (!body.base64) return NextResponse.json({ error: "image_required" }, { status: 400 });
    const raw = String(body.base64).replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(raw, "base64");
    if (buffer.byteLength > 5 * 1024 * 1024) return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    const contentType = detectImageType(buffer);
    if (!contentType) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
    storage_path = `${userId}/od-mission-${missionId}.${ext}`;
    const { error: upErr } = await db.storage.from("avatars").upload(storage_path, buffer, { contentType, upsert: true });
    if (upErr) {
      console.error("[ondemand/missions/submit] upload:", upErr.message);
      return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }
    const { data: { publicUrl } } = db.storage.from("avatars").getPublicUrl(storage_path);
    image_url = `${publicUrl}?t=${Date.now()}`;
  } else if (m.proof === "link" || m.proof === "text") {
    const text = String(body.text ?? "").trim().slice(0, 2000);
    if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
    if (m.proof === "link" && !/^https?:\/\//i.test(text)) return NextResponse.json({ error: "invalid_link" }, { status: 400 });
    content_text = text;
  }

  const { error: insErr } = await db.from("ondemand_mission_submissions").insert({
    user_id: userId,
    mission_id: missionId,
    content_type: m.proof,
    content_text,
    image_url,
    storage_path,
    status: "approved",
    points_awarded: m.points_reward,
  });
  if (insErr) {
    if (insErr.code === "23505") return NextResponse.json({ ok: true, awarded: false, reason: "already_submitted" });
    console.error("[ondemand/missions/submit] insert:", insErr.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  if (m.points_reward <= 0) return NextResponse.json({ ok: true, awarded: false });
  const { data: total, error: rpcErr } = await db.rpc("add_points", { p_user_id: userId, p_delta: m.points_reward, p_category: "mission" });
  if (rpcErr) {
    console.error("[ondemand/missions/submit] add_points:", rpcErr.message);
    return NextResponse.json({ ok: true, awarded: false, reason: "award_failed" });
  }
  return NextResponse.json({ ok: true, awarded: true, delta: m.points_reward, total });
}
