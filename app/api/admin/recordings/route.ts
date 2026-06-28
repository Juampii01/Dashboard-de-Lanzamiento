import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Grabaciones de las clases (1-4). El admin guarda un link de YouTube por número;
// los 4 aparecen como botones al lado de los puntos en el dashboard.
// Mismo patrón que /api/admin/keywords.

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return null;
  return { user, service };
}

export async function GET() {
  const ctx = await getAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await ctx.service
    .from("class_recordings")
    .select("recording_number, youtube_url, updated_at")
    .order("recording_number");

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { recording_number?: number; youtube_url?: string };
  const num = Number(body.recording_number);
  const url = String(body.youtube_url ?? "").trim();

  if (!num || num < 1 || num > 4) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // url vacío = limpiar el botón (queda sin link).
  const { error } = await ctx.service
    .from("class_recordings")
    .upsert(
      { recording_number: num, youtube_url: url || null, updated_at: new Date().toISOString() },
      { onConflict: "recording_number" }
    );

  if (error) {
    console.error("[admin/recordings] upsert error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
