import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/missions/rafaga/submit
 * Body: { rafaga_id, base64 }  → captura
 *    o: { rafaga_id, text, kind: "link" | "text" }  → link o texto
 *
 * El usuario debe enviar una PRUEBA (texto/link o captura) para reclamar — ya no
 * es un click directo. Acredita points_reward al instante (como la misión diaria)
 * e idempotente por UNIQUE(user_id, rafaga_id). El admin puede rechazar después.
 */
function detectImageType(buf: Buffer): string | null {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { rafaga_id?: string; base64?: string; text?: string; kind?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const rafaga_id = String(body.rafaga_id ?? "").trim();
  if (!rafaga_id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const isImage = !!body.base64;
  const text = String(body.text ?? "").trim();
  const kind = body.kind === "link" ? "link" : "text";
  if (!isImage && !text) return NextResponse.json({ error: "empty" }, { status: 400 });

  const service = createServiceClient();

  const { data: rafaga } = await service
    .from("rafaga_missions")
    .select("id, points_reward, starts_at, duration_minutes, is_active")
    .eq("id", rafaga_id)
    .maybeSingle();

  if (!rafaga || !(rafaga as { is_active: boolean }).is_active) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const r = rafaga as { id: string; points_reward: number; starts_at: string; duration_minutes: number; is_active: boolean };

  const now = Date.now();
  const startsAt = new Date(r.starts_at).getTime();
  const endsAt = startsAt + r.duration_minutes * 60 * 1000;
  if (now < startsAt) return NextResponse.json({ error: "not_open_yet" }, { status: 409 });
  if (now > endsAt) return NextResponse.json({ error: "expired" }, { status: 409 });

  // Contenido según el tipo.
  let image_url: string | null = null;
  let storage_path: string | null = null;
  let content_type = kind;            // 'link' | 'text'
  let content_text: string | null = text || null;

  if (isImage) {
    const raw = String(body.base64).replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(raw, "base64");
    if (buffer.byteLength > 5 * 1024 * 1024) return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    const contentType = detectImageType(buffer);
    if (!contentType) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
    storage_path = `rafaga-sub/${user.id}-${rafaga_id}.${ext}`;
    const { error: upErr } = await service.storage.from("stories").upload(storage_path, buffer, { contentType, upsert: true });
    if (upErr) {
      console.error("[rafaga/submit] upload error:", upErr);
      return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }
    const { data: { publicUrl } } = service.storage.from("stories").getPublicUrl(storage_path);
    image_url = `${publicUrl}?t=${Date.now()}`;
    content_type = "image";
    content_text = null;
  }

  // Registrar (idempotente por UNIQUE user+rafaga). Con fallback si las columnas de
  // contenido aún no existen (falta correr 20260701000001): guarda solo el reclamo.
  const full = { user_id: user.id, rafaga_id, points_earned: r.points_reward, content_type, content_text, image_url, storage_path };
  const bare = { user_id: user.id, rafaga_id, points_earned: r.points_reward };
  let insErr = (await service.from("rafaga_submissions").insert(full as Record<string, unknown>)).error;
  if (insErr && /(content_type|content_text|image_url|storage_path)/i.test(insErr.message)) {
    insErr = (await service.from("rafaga_submissions").insert(bare)).error;
  }

  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: true, awarded: false, reason: "already_claimed" });
    }
    console.error("[rafaga/submit] insert error:", insErr);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Acreditar XP. Si falla, rollback de la fila para que el reintento reacredite.
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
