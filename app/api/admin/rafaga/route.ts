import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
    .from("rafaga_missions")
    .select("id, title, description, starts_at, duration_minutes, points_reward, is_active, created_at")
    .order("starts_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as {
    title?: string;
    description?: string;
    starts_at?: string;
    duration_minutes?: number;
    points_reward?: number;
  };

  const title = String(body.title ?? "").trim();
  const starts_at = String(body.starts_at ?? "").trim();
  const duration_minutes = Number(body.duration_minutes ?? 120);

  if (!title || !starts_at || isNaN(duration_minutes) || duration_minutes < 1) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Puntos elegibles por el admin (1–100.000). Si no es válido, default 1.000.
  const rawPts = Math.round(Number(body.points_reward));
  const points_reward = Number.isFinite(rawPts) && rawPts > 0 ? Math.min(100000, rawPts) : 1000;

  const { data, error } = await ctx.service
    .from("rafaga_missions")
    .insert({
      title,
      description: String(body.description ?? "").trim() || null,
      starts_at,
      duration_minutes,
      points_reward,
      is_active: true,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin/rafaga] insert error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as { id?: string };
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { error } = await ctx.service
    .from("rafaga_missions")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("[admin/rafaga] deactivate error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
