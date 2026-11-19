import { NextResponse } from "next/server";
import type { createServiceClient } from "@/lib/supabase/server";

/**
 * Revisión de misiones que modera el equipo (ráfagas y misión del día).
 *
 * Los puntos se suman AL APROBAR y nunca antes: el envío queda 'pending'.
 * Toda la lógica de puntos vive en la función SQL review_mission_submissions
 * (migración 20261119000001), que es atómica e idempotente: aprobar dos veces
 * no suma dos veces y rechazar solo descuenta lo que se había sumado.
 */
export type ReviewKind = "rafaga" | "mission";
export type ReviewAction = "approve" | "reject";

const MAX_BULK = 200;

/** Lee { submission_id } o { submission_ids: [] } + action del body. */
export function parseReviewBody(body: unknown):
  | { ok: true; ids: string[]; action: ReviewAction }
  | { ok: false } {
  const b = (body ?? {}) as { submission_id?: unknown; submission_ids?: unknown; action?: unknown };
  const action = b.action;
  if (action !== "approve" && action !== "reject") return { ok: false };
  const raw = Array.isArray(b.submission_ids) ? b.submission_ids : b.submission_id ? [b.submission_id] : [];
  const ids = [...new Set(raw.map((x) => String(x)).filter((x) => /^[0-9a-f-]{36}$/i.test(x)))];
  if (ids.length === 0 || ids.length > MAX_BULK) return { ok: false };
  return { ok: true, ids, action };
}

export async function reviewSubmissions(
  service: ReturnType<typeof createServiceClient>,
  kind: ReviewKind,
  ids: string[],
  action: ReviewAction
) {
  const { data, error } = await service.rpc("review_mission_submissions", {
    p_kind: kind,
    p_ids: ids,
    p_action: action,
  });
  if (error) {
    if (/points_paused/.test(error.message)) {
      return NextResponse.json({ error: "points_paused" }, { status: 409 });
    }
    console.error(`[admin/review ${kind}] error:`, error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  const rows = (data ?? []) as Array<{ submission_id: string; delta: number }>;
  if (rows.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    status: action === "approve" ? "approved" : "rejected",
    processed: rows.length,
    delta: rows.reduce((acc, r) => acc + Number(r.delta ?? 0), 0),
  });
}
