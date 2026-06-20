import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/missions/submit
 * Body: { base64: string }  (captura de pantalla de la misión cumplida)
 *
 * Sube la imagen, registra la submission (1 por usuario por misión activa) y
 * acredita points_reward al instante. Idempotente por UNIQUE(user_id, mission_id).
 */
function detectImageType(buf: Buffer): string | null {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  return null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let base64: string;
  try {
    const body = (await req.json()) as { base64?: string };
    if (!body.base64) throw new Error("missing");
    base64 = body.base64;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const raw = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");
  if (buffer.byteLength > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }
  const contentType = detectImageType(buffer);
  if (!contentType) return NextResponse.json({ error: "invalid_image" }, { status: 400 });

  const service = createServiceClient();

  // 1. Misión activa.
  const { data: mission } = await service
    .from("daily_missions")
    .select("id, points_reward")
    .eq("is_active", true)
    .maybeSingle();
  if (!mission) return NextResponse.json({ error: "no_active_mission" }, { status: 409 });

  const missionId = (mission as { id: string }).id;
  const reward = (mission as { points_reward: number }).points_reward ?? 0;

  // 2. Subir la imagen al storage (bucket avatars).
  const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
  const filePath = `${user.id}/mission-${missionId}.${ext}`;
  const { error: upErr } = await service.storage
    .from("avatars")
    .upload(filePath, buffer, { contentType, upsert: true });
  if (upErr) {
    console.error("[missions/submit] upload error:", upErr);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
  const { data: { publicUrl } } = service.storage.from("avatars").getPublicUrl(filePath);
  const imageUrl = `${publicUrl}?t=${Date.now()}`;

  // 3. Registrar submission (idempotente por UNIQUE user+mission).
  const { error: insErr } = await service.from("mission_submissions").insert({
    user_id: user.id,
    mission_id: missionId,
    image_url: imageUrl,
    status: "approved",
    points_awarded: reward,
  } as Record<string, unknown>);

  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: true, awarded: false, reason: "already_submitted" });
    }
    console.error("[missions/submit] insert error:", insErr);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // 4. Acreditar XP (atómico).
  const { data: total, error: rpcErr } = await service.rpc("add_points", {
    p_user_id: user.id,
    p_delta: reward,
  });
  if (rpcErr) {
    console.error("[missions/submit] add_points error:", rpcErr);
    return NextResponse.json({ ok: true, awarded: false, reason: "award_failed" });
  }

  return NextResponse.json({ ok: true, awarded: true, delta: reward, total });
}
