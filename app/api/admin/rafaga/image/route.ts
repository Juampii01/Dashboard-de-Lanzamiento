import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

function detectImageType(buf: Buffer): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

// POST /api/admin/rafaga/image — sube una imagen (admin) al bucket público
// `stories` bajo la carpeta rafaga/ y devuelve la URL pública para guardarla
// en la misión ráfaga.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: prof } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(prof as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "file_too_large" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = detectImageType(buf);
  if (!contentType) return NextResponse.json({ error: "invalid_image" }, { status: 400 });

  const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
  const path = `rafaga/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;

  const { error: upErr } = await service.storage
    .from("stories")
    .upload(path, buf, { contentType, upsert: true });

  if (upErr) {
    console.error("[admin/rafaga/image] upload error:", upErr);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data: { publicUrl } } = service.storage.from("stories").getPublicUrl(path);
  return NextResponse.json({ ok: true, url: publicUrl });
}
