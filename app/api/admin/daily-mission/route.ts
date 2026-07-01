import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getDailyMissionCloseState } from "@/lib/daily-mission";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return { error: "forbidden" as const, status: 403 };
  return { service, userId: user.id };
}

/** GET → misión activa actual (admin) + cómo quedó la última al cerrarse. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data } = await auth.service
    .from("daily_missions")
    .select("id, title, description, points_reward, is_active, created_at")
    .eq("is_active", true)
    .maybeSingle();
  const missionState = await getDailyMissionCloseState(auth.service);
  return NextResponse.json({ ok: true, mission: data ?? null, missionState });
}

/**
 * Apaga la(s) misión(es) activa(s) marcando cómo quedó cerrada, SIN borrar la
 * fila ni sus respuestas — las misiones y sus fotos se conservan como
 * historial (ver migración 20260701000003_mission_history.sql). Resiliente:
 * si la columna `closed_as` aún no existe, reintenta sin ella.
 */
async function deactivateActive(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: ReturnType<typeof createServiceClient>,
  closedAs: "expired" | "removed"
) {
  const first = await service
    .from("daily_missions")
    .update({ is_active: false, closed_as: closedAs } as Record<string, unknown>)
    .eq("is_active", true);
  if (first.error && /closed_as/i.test(first.error.message)) {
    await service.from("daily_missions").update({ is_active: false }).eq("is_active", true);
  }
}

/**
 * POST → setea o apaga la misión activa.
 * Body: { action: "set", title, description?, points_reward? } | { action: "clear" } | { action: "remove" }
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { action?: string; title?: string; description?: string; points_reward?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  // "remove" → Volver a "Próximamente": apaga la misión activa (si hay), pero
  // la fila y sus respuestas quedan en la base como historial.
  if (body.action === "remove") {
    await deactivateActive(auth.service, "removed");
    return NextResponse.json({ ok: true, mission: null });
  }

  // "clear" → Cerrar como "La misión caducó": misma idea, no se borra nada.
  if (body.action === "clear") {
    await deactivateActive(auth.service, "expired");
    return NextResponse.json({ ok: true, mission: null });
  }

  // "set" → publicar una misión nueva: apagar la(s) activa(s) (sin borrar) y
  // crear la nueva.
  await auth.service.from("daily_missions").update({ is_active: false }).eq("is_active", true);

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });
  // Puntos configurables desde el admin (default 1.000), acotado 0–100.000.
  const points = Math.min(100000, Math.max(0, Math.round(Number(body.points_reward) || 1000)));

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
