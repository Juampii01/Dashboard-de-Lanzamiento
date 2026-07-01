import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return { error: "forbidden" as const, status: 403 };
  return { service };
}

/** GET → respuestas de ráfaga PENDIENTES de revisar (reviewed_at null) con contenido. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // select * para tolerar que las columnas de contenido aún no existan (pre-migración).
  const { data: subs } = await auth.service
    .from("rafaga_submissions")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(200);

  const rows = ((subs ?? []) as Array<Record<string, unknown>>)
    .filter((r) => !r.reviewed_at)
    .filter((r) => r.content_text || r.image_url); // solo las que tienen prueba para revisar

  const userIds = [...new Set(rows.map((r) => String(r.user_id)))];
  const rafagaIds = [...new Set(rows.map((r) => String(r.rafaga_id)))];

  const nameMap: Record<string, { full_name: string | null; email: string }> = {};
  const titleMap: Record<string, string> = {};
  if (userIds.length) {
    const { data: users } = await auth.service.from("users").select("id, full_name, email").in("id", userIds);
    for (const u of (users ?? []) as Array<{ id: string; full_name: string | null; email: string }>) {
      nameMap[u.id] = { full_name: u.full_name, email: u.email };
    }
  }
  if (rafagaIds.length) {
    const { data: rms } = await auth.service.from("rafaga_missions").select("id, title").in("id", rafagaIds);
    for (const m of (rms ?? []) as Array<{ id: string; title: string }>) titleMap[m.id] = m.title;
  }

  return NextResponse.json({
    ok: true,
    submissions: rows.map((r) => ({
      id: String(r.id),
      user_id: String(r.user_id),
      rafaga_title: titleMap[String(r.rafaga_id)] ?? "",
      content_type: (r.content_type as string) ?? "text",
      content_text: (r.content_text as string | null) ?? null,
      image_url: (r.image_url as string | null) ?? null,
      points_earned: Number(r.points_earned ?? 0),
      submitted_at: String(r.submitted_at ?? ""),
      ...(nameMap[String(r.user_id)] ?? { full_name: null, email: "" }),
    })),
  });
}

/**
 * POST → moderar una respuesta de ráfaga. Body: { submission_id, action: "reject" | "approve" }
 * - approve: la deja cumplida, limpia el contenido y marca revisada.
 * - reject: descuenta los puntos + borra el contenido + borra la fila → el usuario puede reintentar.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { submission_id?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const id = String(body.submission_id ?? "");
  const action = body.action;
  if (!id || (action !== "reject" && action !== "approve")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data: sub } = await auth.service.from("rafaga_submissions").select("*").eq("id", id).maybeSingle();
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const s = sub as Record<string, unknown>;

  if (s.storage_path) {
    await auth.service.storage.from("stories").remove([String(s.storage_path)]);
  }

  if (action === "reject") {
    const pts = Number(s.points_earned ?? 0);
    if (pts > 0) {
      await auth.service.rpc("add_points", { p_user_id: String(s.user_id), p_delta: -pts, p_category: "rafaga" });
    }
    await auth.service.from("rafaga_submissions").delete().eq("id", id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  await auth.service
    .from("rafaga_submissions")
    .update({ reviewed_at: new Date().toISOString(), image_url: null, content_text: null, storage_path: null } as Record<string, unknown>)
    .eq("id", id);
  return NextResponse.json({ ok: true, status: "approved" });
}
