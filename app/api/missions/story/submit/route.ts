import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const STORY_POINTS = 500;
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

function detectImageType(buf: Buffer): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // WebP: "RIFF"(52 49 46 46) en 0-3 y "WEBP"(57 45 42 50) en 8-11
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

// Returns the Miami-timezone date string (YYYY-MM-DD) adjusted for the 8AM reset.
// Before 8AM Miami time, the "story day" is still the previous calendar day.
function getMiamiStoryDate(): string {
  const now = new Date();
  // Get Miami date components
  const miamiParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) => miamiParts.find((p) => p.type === type)?.value ?? "";
  const hour = parseInt(get("hour"), 10);

  // If it's before 8AM Miami time, use the previous day as the story date
  if (hour < 8) {
    const prev = new Date(now);
    // Subtract enough to land in "previous day" Miami time — use Date math in UTC
    prev.setUTCHours(prev.getUTCHours() - 24);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(prev);
  }

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });

  if (file.size > MAX_SIZE) return NextResponse.json({ error: "file_too_large" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = detectImageType(buf);
  if (!contentType) return NextResponse.json({ error: "invalid_image" }, { status: 400 });

  const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
  const submission_date = getMiamiStoryDate();
  const storage_path = `${user.id}/${submission_date}.${ext}`;

  const service = createServiceClient();

  // Upload to Supabase Storage (bucket: stories)
  const { error: upErr } = await service.storage
    .from("stories")
    .upload(storage_path, buf, { contentType, upsert: true });

  if (upErr) {
    console.error("[story/submit] upload error:", upErr);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data: { publicUrl } } = service.storage.from("stories").getPublicUrl(storage_path);
  const image_url = `${publicUrl}?t=${Date.now()}`;

  // Register (idempotent via UNIQUE user_id+submission_date)
  const { error: insErr } = await service.from("story_submissions").insert({
    user_id: user.id,
    image_url,
    storage_path,
    points_earned: STORY_POINTS,
    submission_date,
  });

  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: true, awarded: false, reason: "already_submitted_today" });
    }
    console.error("[story/submit] insert error:", insErr);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Award XP. Si falla, rollback de la fila para que el reintento reacredite
  // (insert + RPC no son atómicos).
  const { data: total, error: rpcErr } = await service.rpc("add_points", {
    p_user_id: user.id,
    p_delta: STORY_POINTS,
    p_category: "story",
  });

  if (rpcErr) {
    console.error("[story/submit] add_points error:", rpcErr);
    await service.from("story_submissions").delete().eq("user_id", user.id).eq("submission_date", submission_date);
    return NextResponse.json({ ok: false, error: "award_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, awarded: true, delta: STORY_POINTS, total });
}
