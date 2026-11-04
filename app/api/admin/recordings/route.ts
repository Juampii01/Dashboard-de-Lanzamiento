import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Grabaciones de las clases por programa. El admin guarda un link de YouTube por
// número: 1-4 = clase de cada día; 0 = video introductorio (solo on demand).
//   En vivo:   botones al lado de los puntos en el inicio.
//   On demand: el video va embebido arriba de cada día (y el 0 en el inicio).
// ?program=live|ondemand (GET) / { program } (POST). Default: live.
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

export async function GET(req: NextRequest) {
  const ctx = await getAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const program = req.nextUrl.searchParams.get("program") === "ondemand" ? "ondemand" : "live";

  const byProgram = await ctx.service
    .from("class_recordings")
    .select("recording_number, youtube_url, title, updated_at")
    .eq("program", program)
    .order("recording_number");
  if (!byProgram.error) return NextResponse.json(byProgram.data ?? []);
  // Sin la migración 20261104000001 (columna program): solo hay grabaciones del en vivo.
  if (program === "ondemand") return NextResponse.json({ error: "migration_missing" }, { status: 501 });

  const first = await ctx.service
    .from("class_recordings")
    .select("recording_number, youtube_url, title, updated_at")
    .order("recording_number");
  let data = first.data;
  // Sin la migración 20261031000001 todavía no existe la columna title.
  if (first.error) {
    ({ data } = await ctx.service
      .from("class_recordings")
      .select("recording_number, youtube_url, updated_at")
      .order("recording_number"));
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { recording_number?: number; youtube_url?: string; title?: string; program?: string };
  const num = Number(body.recording_number);
  const program = body.program === "ondemand" ? "ondemand" : "live";
  const url = String(body.youtube_url ?? "").trim();
  const title = String(body.title ?? "").trim().slice(0, 120);

  // 0 = video introductorio, solo en on demand.
  const min = program === "ondemand" ? 0 : 1;
  if (!Number.isInteger(num) || num < min || num > 4) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // url vacío = limpiar el botón (queda sin link).
  const row = { recording_number: num, youtube_url: url || null, updated_at: new Date().toISOString() };
  let { error } = await ctx.service
    .from("class_recordings")
    .upsert({ ...row, title: title || null, program }, { onConflict: "program,recording_number" });
  // Sin la columna program (migración pendiente): solo se puede guardar el en vivo.
  if (error && /program/i.test(error.message)) {
    if (program === "ondemand") return NextResponse.json({ error: "migration_missing" }, { status: 501 });
    ({ error } = await ctx.service
      .from("class_recordings")
      .upsert({ ...row, title: title || null }, { onConflict: "recording_number" }));
  }
  // Sin la columna title (migración pendiente) → guarda solo el link.
  if (error && /title/i.test(error.message)) {
    ({ error } = await ctx.service.from("class_recordings").upsert(row, { onConflict: "recording_number" }));
  }

  if (error) {
    console.error("[admin/recordings] upsert error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
