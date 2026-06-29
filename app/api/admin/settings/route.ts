import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Settings genéricos editables desde el admin (clave/valor en app_settings).
// Whitelist de claves para no exponer un key/value libre.
const ALLOWED = new Set(["tutorial_youtube"]);

// Extrae el ID de YouTube de una URL (youtu.be/ID, watch?v=ID, embed/ID, shorts/ID)
// o acepta el ID pelado. Devuelve "" si no se reconoce (= "coming soon").
function ytId(input: string): string {
  const s = input.trim();
  if (!s) return "";
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{6,}$/.test(s)) return s; // ya es un ID
  return "";
}

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

  const { data } = await ctx.service.from("app_settings").select("key, value").in("key", [...ALLOWED]);
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as { key: string; value: string | null }[]) map[r.key] = r.value ?? "";
  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const ctx = await getAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { key?: string; value?: string };
  const key = String(body.key ?? "");
  if (!ALLOWED.has(key)) return NextResponse.json({ error: "bad_key" }, { status: 400 });

  let value = String(body.value ?? "").trim();
  if (key === "tutorial_youtube") value = ytId(value); // normaliza a ID (o "" si vacío)

  const { error } = await ctx.service
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) {
    console.error("[admin/settings] upsert error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, value });
}
