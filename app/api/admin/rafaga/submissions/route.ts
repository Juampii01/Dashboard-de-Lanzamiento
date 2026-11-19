import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { parseReviewBody, reviewSubmissions } from "@/lib/missions/review";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return { error: "forbidden" as const, status: 403 };
  return { service };
}

async function withNamesAndTitles(
  service: ReturnType<typeof createServiceClient>,
  rows: Array<Record<string, unknown>>
) {
  const userIds = [...new Set(rows.map((r) => String(r.user_id)))];
  const rafagaIds = [...new Set(rows.map((r) => String(r.rafaga_id)))];

  const nameMap: Record<string, { full_name: string | null; email: string }> = {};
  const titleMap: Record<string, string> = {};
  if (userIds.length) {
    const { data: users } = await service.from("users").select("id, full_name, email").in("id", userIds);
    for (const u of (users ?? []) as Array<{ id: string; full_name: string | null; email: string }>) {
      nameMap[u.id] = { full_name: u.full_name, email: u.email };
    }
  }
  if (rafagaIds.length) {
    const { data: rms } = await service.from("rafaga_missions").select("id, title").in("id", rafagaIds);
    for (const m of (rms ?? []) as Array<{ id: string; title: string }>) titleMap[m.id] = m.title;
  }

  return rows.map((r) => ({
    id: String(r.id),
    user_id: String(r.user_id),
    rafaga_title: titleMap[String(r.rafaga_id)] ?? "",
    content_type: (r.content_type as string) ?? "text",
    content_text: (r.content_text as string | null) ?? null,
    image_url: (r.image_url as string | null) ?? null,
    points_earned: Number(r.points_earned ?? 0),
    status: (r.status as string | undefined) ?? "approved",
    reviewed_at: (r.reviewed_at as string | null) ?? null,
    submitted_at: String(r.submitted_at ?? ""),
    ...(nameMap[String(r.user_id)] ?? { full_name: null, email: "" }),
  }));
}

/**
 * GET → respuestas de ráfaga.
 * ?scope=history → ya revisadas (aceptadas/rechazadas), de TODAS las ráfagas
 *   (nada se borra al desactivar una ráfaga, así que quedan disponibles para
 *   seguir revisándolas cuando quieras).
 * default (pending) → sin revisar (reviewed_at null), con contenido.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const scope = new URL(req.url).searchParams.get("scope");

  let query = auth.service
    .from("rafaga_submissions")
    .select("*")
    .order(scope === "history" ? "reviewed_at" : "submitted_at", { ascending: false })
    .limit(scope === "history" ? 300 : 500);
  query = scope === "history" ? query.not("reviewed_at", "is", null) : query.is("reviewed_at", null);
  const { data: subs } = await query;

  const rows = ((subs ?? []) as Array<Record<string, unknown>>)
    .filter((r) => r.content_text || r.image_url); // solo las que tienen prueba

  return NextResponse.json({ ok: true, submissions: await withNamesAndTitles(auth.service, rows) });
}

/**
 * POST → moderar respuestas de ráfaga.
 * Body: { submission_id } o { submission_ids: [...] } (aprobar/rechazar en
 * bloque) + { action: "approve" | "reject" }.
 * - approve: suma los puntos (si todavía no se sumaron) y marca revisada.
 * - reject: no suma nada; si se habían sumado (flujo viejo), los descuenta.
 * Nunca borra la foto/texto: queda como historial. El índice único parcial
 * (migración 20260701000003) permite reintentar tras un rechazo.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const parsed = parseReviewBody(body);
  if (!parsed.ok) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  return reviewSubmissions(auth.service, "rafaga", parsed.ids, parsed.action);
}

/**
 * DELETE → borrado explícito y definitivo de una respuesta (foto + fila).
 * Es la ÚNICA acción que borra de verdad — aceptar/rechazar ya NO lo hacen.
 * Body: { submission_id }
 */
export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { submission_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const id = String(body.submission_id ?? "");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { data: sub } = await auth.service.from("rafaga_submissions").select("storage_path").eq("id", id).maybeSingle();
  const storagePath = (sub as { storage_path?: string | null } | null)?.storage_path;
  if (storagePath) {
    await auth.service.storage.from("stories").remove([storagePath]);
  }
  await auth.service.from("rafaga_submissions").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
