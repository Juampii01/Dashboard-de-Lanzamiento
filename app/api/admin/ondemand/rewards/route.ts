import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isMigrationMissing, requireAdmin } from "@/lib/ondemand-server";

/**
 * /api/admin/ondemand/rewards  (solo admins)
 *
 * GET  → niveles de premios + solicitudes (con nombre y email)
 * POST → { action, ... }
 *   save_tier    { id?, points, title, description, sort_order, is_active }
 *   delete_tier  { id }      (solo si nadie lo pidió; si no, desactivar)
 *   review       { claim_id, status: "approved" | "rejected" | "pending", note? }
 */
const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save_tier"),
    id: z.string().uuid().optional(),
    points: z.number().int().min(1).max(10_000_000),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1000).nullable().optional(),
    sort_order: z.number().int().min(0).max(1000).default(0),
    is_active: z.boolean().default(true),
  }),
  z.object({ action: z.literal("delete_tier"), id: z.string().uuid() }),
  z.object({
    action: z.literal("review"),
    claim_id: z.string().uuid(),
    status: z.enum(["approved", "rejected", "pending"]),
    note: z.string().trim().max(500).nullable().optional(),
  }),
]);

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { db } = auth;

  const { data: tiers, error } = await db
    .from("reward_tiers")
    .select("id, program, points, title, description, sort_order, is_active, created_at")
    .eq("program", "ondemand")
    .order("points", { ascending: true });
  if (isMigrationMissing(error)) return NextResponse.json({ error: "migration_missing" }, { status: 501 });
  if (error) return NextResponse.json({ error: "internal" }, { status: 500 });

  const { data: claims } = await db
    .from("reward_claims")
    .select("id, user_id, tier_id, points_at_request, status, note, reviewed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (claims ?? []) as Array<{ user_id: string } & Record<string, unknown>>;
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const users: Record<string, { email: string; full_name: string | null; total_points: number }> = {};
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from("users").select("id, email, full_name, total_points").in("id", ids.slice(i, i + 300));
    for (const u of (data ?? []) as Array<{ id: string; email: string; full_name: string | null; total_points: number }>) users[u.id] = u;
  }

  return NextResponse.json({
    tiers: tiers ?? [],
    claims: rows.map((r) => ({ ...r, user: users[r.user_id] ?? null })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { db, adminId } = auth;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload", detail: parsed.error.issues[0]?.message }, { status: 400 });
  const body = parsed.data;

  switch (body.action) {
    case "save_tier": {
      const row = {
        program: "ondemand",
        points: body.points,
        title: body.title,
        description: body.description || null,
        sort_order: body.sort_order,
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      };
      const res = body.id
        ? await db.from("reward_tiers").update(row).eq("id", body.id).select("id").single()
        : await db.from("reward_tiers").insert(row).select("id").single();
      if (res.error) return NextResponse.json({ error: "internal", detail: res.error.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: (res.data as { id: string }).id });
    }

    case "delete_tier": {
      const { count } = await db.from("reward_claims").select("id", { count: "exact", head: true }).eq("tier_id", body.id);
      if ((count ?? 0) > 0) return NextResponse.json({ error: "has_claims" }, { status: 409 });
      const { error } = await db.from("reward_tiers").delete().eq("id", body.id);
      if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "review": {
      const { error } = await db
        .from("reward_claims")
        .update({
          status: body.status,
          note: body.note ?? null,
          reviewed_by: body.status === "pending" ? null : adminId,
          reviewed_at: body.status === "pending" ? null : new Date().toISOString(),
        })
        .eq("id", body.claim_id);
      if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
  }
}
