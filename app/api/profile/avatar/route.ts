import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/profile/avatar
 * Recibe una imagen recortada en base64, la sube a Supabase Storage
 * (avatars/{user_id}/avatar.png) y actualiza users.avatar_url.
 */
export async function POST(req: NextRequest) {
  // Auth check with user-session client
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let base64: string;
  try {
    const body = await req.json() as { base64?: string };
    if (!body.base64) throw new Error("missing");
    base64 = body.base64;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Strip data-URL prefix → raw base64
  const raw = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");

  if (buffer.byteLength > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // ── Magic-bytes validation ──────────────────────────────────────────────────
  // Reject anything that isn't a real PNG, JPEG, or WebP image, regardless of
  // what the client claims in the data-URL prefix.
  function detectImageType(buf: Buffer): { contentType: string; ext: string } | null {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      return { contentType: "image/png", ext: "png" };
    }
    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
      return { contentType: "image/jpeg", ext: "jpg" };
    }
    // WebP: RIFF????WEBP  (bytes 0-3 = "RIFF", bytes 8-11 = "WEBP")
    if (
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    ) {
      return { contentType: "image/webp", ext: "webp" };
    }
    return null;
  }

  const imageType = detectImageType(buffer);
  if (!imageType) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }
  // ───────────────────────────────────────────────────────────────────────────

  // Always store as avatar.png regardless of source format — keeps paths stable
  const filePath = `${user.id}/avatar.png`;

  // Upload using the user-session client so storage RLS policies apply
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, buffer, {
      contentType: imageType.contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error("[profile/avatar] upload error:", uploadError);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  // Build public URL + cache-busting param
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  // Update users table via service client (bypasses RLS — user already verified above)
  // Cast as Record<string, unknown> to work around Supabase `never` generated types
  const service = createServiceClient();
  const { error: updateError } = await service
    .from("users")
    .update({ avatar_url: avatarUrl } as Record<string, unknown>)
    .eq("id", user.id);

  if (updateError) {
    console.error("[profile/avatar] db update error:", updateError);
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, avatar_url: avatarUrl });
}

/**
 * DELETE /api/profile/avatar
 * Elimina la imagen del Storage y pone avatar_url = null en la DB.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const filePath = `${user.id}/avatar.png`;

  // Remove from Storage (non-fatal if file doesn't exist)
  await supabase.storage.from("avatars").remove([filePath]);

  // Set avatar_url = null in DB
  const service = createServiceClient();
  const { error } = await service
    .from("users")
    .update({ avatar_url: null } as Record<string, unknown>)
    .eq("id", user.id);

  if (error) {
    console.error("[profile/avatar DELETE] db error:", error.message);
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
