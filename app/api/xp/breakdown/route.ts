import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/xp/breakdown
 * Devuelve el desglose de puntos del usuario autenticado, agregado por origen:
 *   { ok, total, tracked, by_category: { time, video, day, ... } }
 * `total` = total_points (fuente de verdad). `tracked` = suma del ledger.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data, error } = await supabase.rpc("get_points_breakdown");
  if (error) {
    console.error("[xp/breakdown] error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const d = (data as { total?: number; tracked?: number; by_category?: Record<string, number> }) ?? {};
  return NextResponse.json({
    ok: true,
    total: d.total ?? 0,
    tracked: d.tracked ?? 0,
    by_category: d.by_category ?? {},
  });
}
