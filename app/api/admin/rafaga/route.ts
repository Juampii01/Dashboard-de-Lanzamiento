import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type LinkButton = { label: string; url: string };

// Sanea los botones de enlace (hasta 3): cada uno necesita URL; se normaliza a https.
function parseLinkButtons(raw: unknown): LinkButton[] {
  if (!Array.isArray(raw)) return [];
  const out: LinkButton[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    let url = String((item as { url?: unknown }).url ?? "").trim();
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const label = String((item as { label?: unknown }).label ?? "").trim().slice(0, 60) || "Abrir enlace";
    out.push({ label, url: url.slice(0, 500) });
    if (out.length >= 3) break;
  }
  return out;
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
    link_buttons?: unknown;
  };

  const title = String(body.title ?? "").trim();
  const starts_at = String(body.starts_at ?? "").trim();
  const duration_minutes = Number(body.duration_minutes ?? 120);
  const link_buttons = parseLinkButtons(body.link_buttons);

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

  // Columnas opcionales que dependen de migraciones (image_url: 20260630000002,
  // link_buttons: 20260701000002). Si alguna no existe, se reintenta sin ella.
  const optional: Record<string, unknown> = {};
  if (image_url) optional.image_url = image_url;
  if (link_buttons.length) optional.link_buttons = link_buttons;

  let imageSaved = !!image_url;
  let linksSaved = link_buttons.length > 0;
  let ins = await ctx.service.from("rafaga_missions").insert({ ...base, ...optional }).select("id").single();

  if (ins.error && /link_buttons/i.test(ins.error.message)) {
    linksSaved = false;
    delete optional.link_buttons;
    ins = await ctx.service.from("rafaga_missions").insert({ ...base, ...optional }).select("id").single();
  }
  if (ins.error && /image_url/i.test(ins.error.message)) {
    imageSaved = false;
    delete optional.image_url;
    ins = await ctx.service.from("rafaga_missions").insert({ ...base, ...optional }).select("id").single();
  }

  if (ins.error) {
    console.error("[admin/rafaga] insert error:", ins.error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: (ins.data as { id: string }).id, imageSaved, linksSaved });
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
    link_buttons?: unknown;
  };

  const id = String(body.id ?? "").trim();
  const title = String(body.title ?? "").trim();
  const starts_at = String(body.starts_at ?? "").trim();
  const duration_minutes = Number(body.duration_minutes ?? 120);
  const link_buttons = parseLinkButtons(body.link_buttons);
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

  // En edición mandamos image_url (aunque sea null → quitar imagen) y link_buttons
  // (aunque sea [] → vaciarlos). Fallback si alguna columna no existe todavía.
  const optional: Record<string, unknown> = { image_url, link_buttons };
  let imageSaved = true;
  let linksSaved = true;
  let upd = await ctx.service.from("rafaga_missions").update({ ...base, ...optional }).eq("id", id);

  if (upd.error && /link_buttons/i.test(upd.error.message)) {
    linksSaved = false;
    delete optional.link_buttons;
    upd = await ctx.service.from("rafaga_missions").update({ ...base, ...optional }).eq("id", id);
  }
  if (upd.error && /image_url/i.test(upd.error.message)) {
    imageSaved = false;
    delete optional.image_url;
    upd = await ctx.service.from("rafaga_missions").update({ ...base, ...optional }).eq("id", id);
  }

  if (upd.error) {
    console.error("[admin/rafaga] update error:", upd.error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, imageSaved, linksSaved });
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
