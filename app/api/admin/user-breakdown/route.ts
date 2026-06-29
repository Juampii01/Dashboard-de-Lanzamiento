import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Desglose de puntos de UN usuario (para el admin): suma de point_events por
// categoría. Devuelve { ok, total, tracked, by_category } igual que el breakdown
// del propio usuario, pero para cualquier userId.

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return null;
  return { service };
}

export async function GET(req: NextRequest) {
  const ctx = await getAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "missing_user" }, { status: 400 });

  const { data: u } = await ctx.service.from("users").select("total_points").eq("id", userId).maybeSingle();
  const total = (u as { total_points?: number } | null)?.total_points ?? 0;

  // Traer todos los point_events del usuario (paginado) y agregar por categoría.
  const rows: { category: string | null; delta: number }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await ctx.service
      .from("point_events")
      .select("category, delta")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (error) break;
    rows.push(...((data ?? []) as { category: string | null; delta: number }[]));
    if (!data || data.length < 1000) break;
    from += 1000;
  }

  const by_category: Record<string, number> = {};
  let tracked = 0;
  for (const e of rows) {
    const c = e.category || "other";
    by_category[c] = (by_category[c] ?? 0) + e.delta;
    tracked += e.delta;
  }

  return NextResponse.json({ ok: true, total, tracked, by_category });
}
