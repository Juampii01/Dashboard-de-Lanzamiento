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

/** GET → respuestas PENDIENTES de la misión activa (reviewed_at null). */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: mission } = await auth.service
    .from("daily_missions").select("id").eq("is_active", true).maybeSingle();
  if (!mission) return NextResponse.json({ ok: true, mission_id: null, submissions: [] });

  const missionId = (mission as { id: string }).id;
  const { data: subs } = await auth.service
    .from("mission_submissions")
    .select("id, user_id, image_url, content_type, content_text, status, points_awarded, created_at")
    .eq("mission_id", missionId)
    .is("reviewed_at", null)
    .order("created_at", { ascending: false });

  const rows = (subs ?? []) as Array<{ id: string; user_id: string; image_url: string | null; content_type: string; content_text: string | null; status: string; points_awarded: number; created_at: string }>;
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const nameMap: Record<string, { full_name: string | null; email: string }> = {};
  if (ids.length) {
    const { data: users } = await auth.service.from("users").select("id, full_name, email").in("id", ids);
    for (const u of (users ?? []) as Array<{ id: string; full_name: string | null; email: string }>) {
      nameMap[u.id] = { full_name: u.full_name, email: u.email };
    }
  }

  return NextResponse.json({
    ok: true,
    mission_id: missionId,
    submissions: rows.map((r) => ({ ...r, ...(nameMap[r.user_id] ?? { full_name: null, email: "" }) })),
  });
}

/**
 * POST → moderar una respuesta. Body: { submission_id, action: "reject" | "approve" }
 * - approve: la deja como cumplida + borra el contenido (storage) + marca revisada.
 * - reject: descuenta los puntos + borra el contenido + borra la fila → el
 *   usuario puede reintentar.
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

  const { data: sub } = await auth.service
    .from("mission_submissions")
    .select("id, user_id, points_awarded, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const s = sub as { user_id: string; points_awarded: number; storage_path: string | null };

  // Borrar el archivo del storage (si había).
  if (s.storage_path) {
    await auth.service.storage.from("avatars").remove([s.storage_path]);
  }

  if (action === "reject") {
    // Descontar los puntos y borrar la fila → el usuario puede reintentar.
    if (s.points_awarded > 0) {
      await auth.service.rpc("add_points", { p_user_id: s.user_id, p_delta: -s.points_awarded });
    }
    await auth.service.from("mission_submissions").delete().eq("id", id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // approve: queda cumplida, se limpia el contenido y se marca revisada.
  await auth.service
    .from("mission_submissions")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), image_url: null, content_text: null, storage_path: null } as Record<string, unknown>)
    .eq("id", id);
  return NextResponse.json({ ok: true, status: "approved" });
}
