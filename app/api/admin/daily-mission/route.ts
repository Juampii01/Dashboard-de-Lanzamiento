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
  const { count } = await auth.service.from("daily_missions").select("id", { count: "exact", head: true });
  return NextResponse.json({ ok: true, mission: data ?? null, hasRows: (count ?? 0) > 0 });
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

  // "remove" → Volver a "Próximamente": borra TODAS las misiones (y respuestas)
  // para que la tabla quede vacía y el estado vacío sea "Próximamente".
  if (body.action === "remove") {
    const { data: allM } = await auth.service.from("daily_missions").select("id");
    const allIds = ((allM ?? []) as Array<{ id: string }>).map((m) => m.id);
    if (allIds.length) {
      const { data: rsubs } = await auth.service.from("mission_submissions").select("storage_path").in("mission_id", allIds);
      const rpaths = ((rsubs ?? []) as Array<{ storage_path: string | null }>).map((s) => s.storage_path).filter(Boolean) as string[];
      if (rpaths.length) await auth.service.storage.from("avatars").remove(rpaths);
      await auth.service.from("mission_submissions").delete().in("mission_id", allIds);
      await auth.service.from("daily_missions").delete().in("id", allIds);
    }
    return NextResponse.json({ ok: true, mission: null });
  }

  // Reset de la misión anterior: borrar sus respuestas (storage + filas) al
  // cambiar/quitar la misión. Las pendientes quedan validadas por defecto (los
  // puntos ya acreditados se mantienen; no se descuenta nada). Así la DB no
  // acumula 200 capturas por día.
  const { data: active } = await auth.service.from("daily_missions").select("id").eq("is_active", true);
  const activeIds = ((active ?? []) as Array<{ id: string }>).map((m) => m.id);
  if (activeIds.length) {
    const { data: subs } = await auth.service
      .from("mission_submissions").select("storage_path").in("mission_id", activeIds);
    const paths = ((subs ?? []) as Array<{ storage_path: string | null }>).map((s) => s.storage_path).filter(Boolean) as string[];
    if (paths.length) await auth.service.storage.from("avatars").remove(paths);
    await auth.service.from("mission_submissions").delete().in("mission_id", activeIds);
  }

  // Apagar la(s) misión(es) activa(s).
  await auth.service.from("daily_missions").update({ is_active: false }).eq("is_active", true);

  if (body.action === "clear") {
    // Cerrar como "La misión caducó": la fila queda inactiva (NO se borra), así
    // el estado vacío muestra "caducó" en vez de "Próximamente".
    return NextResponse.json({ ok: true, mission: null });
  }

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
