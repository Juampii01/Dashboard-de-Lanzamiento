import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return { error: "forbidden" as const, status: 403 };
  return { service, userId: user.id };
}

/** GET → misión activa actual (admin). */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data } = await auth.service
    .from("daily_missions")
    .select("id, title, description, points_reward, is_active, created_at")
    .eq("is_active", true)
    .maybeSingle();
  return NextResponse.json({ ok: true, mission: data ?? null });
}

/**
 * POST → setea o apaga la misión activa.
 * Body: { action: "set", title, description?, points_reward? } | { action: "clear" }
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { action?: string; title?: string; description?: string; points_reward?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  // Apagar la(s) misión(es) activa(s).
  await auth.service.from("daily_missions").update({ is_active: false }).eq("is_active", true);

  if (body.action === "clear") {
    return NextResponse.json({ ok: true, mission: null });
  }

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });
  const points = Number.isFinite(body.points_reward) ? Math.max(0, Math.min(5000, Number(body.points_reward))) : 200;

  const { data, error } = await auth.service
    .from("daily_missions")
    .insert({
      title,
      description: String(body.description ?? "").trim() || null,
      points_reward: points,
      is_active: true,
      created_by: auth.userId,
    } as Record<string, unknown>)
    .select("id, title, description, points_reward, is_active, created_at")
    .single();

  if (error) {
    console.error("[daily-mission] insert error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, mission: data });
}
