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
    .select("*")
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
    image_url?: string | null;
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

  const image_url =
    typeof body.image_url === "string" && body.image_url.trim() ? body.image_url.trim() : null;

  const base = {
    title,
    description: String(body.description ?? "").trim() || null,
    starts_at,
    duration_minutes,
    points_reward,
    is_active: true,
    created_by: ctx.user.id,
  };

  // Insert con image_url. Si la columna aún no existe (falta correr la migración
  // 20260630000002_rafaga_image), reintenta sin la imagen para no romper la creación.
  let imageSaved = !!image_url;
  let ins = await ctx.service
    .from("rafaga_missions")
    .insert(image_url ? { ...base, image_url } : base)
    .select("id")
    .single();

  if (ins.error && image_url && /image_url/i.test(ins.error.message)) {
    imageSaved = false;
    ins = await ctx.service.from("rafaga_missions").insert(base).select("id").single();
  }

  if (ins.error) {
    console.error("[admin/rafaga] insert error:", ins.error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: (ins.data as { id: string }).id, imageSaved });
}

export async function PUT(req: NextRequest) {
  const ctx = await getAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as {
    id?: string;
    title?: string;
    description?: string;
    starts_at?: string;
    duration_minutes?: number;
    points_reward?: number;
    image_url?: string | null;
  };

  const id = String(body.id ?? "").trim();
  const title = String(body.title ?? "").trim();
  const starts_at = String(body.starts_at ?? "").trim();
  const duration_minutes = Number(body.duration_minutes ?? 120);
  if (!id || !title || !starts_at || isNaN(duration_minutes) || duration_minutes < 1) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const rawPts = Math.round(Number(body.points_reward));
  const points_reward = Number.isFinite(rawPts) && rawPts > 0 ? Math.min(100000, rawPts) : 1000;
  const image_url =
    typeof body.image_url === "string" && body.image_url.trim() ? body.image_url.trim() : null;

  // Editar reactiva la misión (queda activa/programada según la nueva fecha).
  const base = {
    title,
    description: String(body.description ?? "").trim() || null,
    starts_at,
    duration_minutes,
    points_reward,
    is_active: true,
  };

  let imageSaved = true;
  let upd = await ctx.service.from("rafaga_missions").update({ ...base, image_url }).eq("id", id);
  if (upd.error && /image_url/i.test(upd.error.message)) {
    imageSaved = false;
    upd = await ctx.service.from("rafaga_missions").update(base).eq("id", id);
  }

  if (upd.error) {
    console.error("[admin/rafaga] update error:", upd.error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, imageSaved });
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
