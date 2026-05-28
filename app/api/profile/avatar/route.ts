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

  const filePath = `${user.id}/avatar.png`;

  // Upload using the user-session client so storage RLS policies apply
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, buffer, {
      contentType: "image/png",
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
  const service = createServiceClient();
  const { error: updateError } = await service
    .from("users")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (updateError) {
    console.error("[profile/avatar] db update error:", updateError);
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, avatar_url: avatarUrl });
}
