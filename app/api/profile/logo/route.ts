import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/profile/logo
 * Recibe la imagen del logo en base64, la sube al bucket "avatars"
 * (path: {user_id}/logo.png) y guarda la URL pública en company_profiles.logo_url.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let base64: string;
  try {
    const body = await req.json() as { base64?: string };
    if (!body.base64) throw new Error("missing");
    base64 = body.base64;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const raw = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");

  if (buffer.byteLength > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // Magic-bytes validation — same as avatar route
  function detectImageType(buf: Buffer): { contentType: string } | null {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47)
      return { contentType: "image/png" };
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF)
      return { contentType: "image/jpeg" };
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50)
      return { contentType: "image/webp" };
    return null;
  }

  const imageType = detectImageType(buffer);
  if (!imageType) return NextResponse.json({ error: "invalid_image" }, { status: 400 });

  const filePath = `${user.id}/logo.png`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, buffer, { contentType: imageType.contentType, upsert: true });

  if (uploadError) {
    console.error("[profile/logo] upload error:", uploadError);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const logoUrl = `${publicUrl}?t=${Date.now()}`;

  const service = createServiceClient();
  const { error: updateError } = await service
    .from("company_profiles")
    .update({ logo_url: logoUrl } as Record<string, unknown>)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[profile/logo] db update error:", updateError);
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, logo_url: logoUrl });
}

/**
 * DELETE /api/profile/logo
 * Elimina el logo del Storage y pone logo_url = null en company_profiles.
 */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await supabase.storage.from("avatars").remove([`${user.id}/logo.png`]);

  const service = createServiceClient();
  const { error } = await service
    .from("company_profiles")
    .update({ logo_url: null } as Record<string, unknown>)
    .eq("user_id", user.id);

  if (error) {
    console.error("[profile/logo DELETE] db error:", error.message);
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
