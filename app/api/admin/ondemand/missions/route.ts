import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isMigrationMissing, requireAdmin } from "@/lib/ondemand-server";

/**
 * /api/admin/ondemand/missions  (solo admins)
 *
 * GET  → misiones fijas + respuestas recientes
 * POST → { action, ... }
 *   save    { id?, day_number, title, description, action_url, proof, points_reward, sort_order, is_active }
 *   delete  { id }               (solo si nadie respondió; si no, desactivar)
 *   reject  { submission_id }    rechaza una respuesta y descuenta los puntos
 */
const saveSchema = z.object({
  action: z.literal("save"),
  id: z.string().uuid().optional(),
  day_number: z.number().int().min(1).max(4).nullable(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  action_url: z.string().trim().max(500).nullable().optional(),
  proof: z.enum(["image", "link", "text", "none"]),
  points_reward: z.number().int().min(0).max(100000),
  sort_order: z.number().int().min(0).max(1000).default(0),
  is_active: z.boolean().default(true),
});
const bodySchema = z.discriminatedUnion("action", [
  saveSchema,
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
  z.object({ action: z.literal("reject"), submission_id: z.string().uuid() }),
]);

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { db } = auth;

  const { data: missions, error } = await db
    .from("ondemand_missions")
    .select("id, day_number, title, description, action_url, proof, points_reward, sort_order, is_active, created_at")
    .order("day_number", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true });
  if (isMigrationMissing(error)) return NextResponse.json({ error: "migration_missing" }, { status: 501 });
  if (error) return NextResponse.json({ error: "internal" }, { status: 500 });

  const { data: subs } = await db
    .from("ondemand_mission_submissions")
    .select("id, user_id, mission_id, content_type, content_text, image_url, status, points_awarded, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (subs ?? []) as Array<{ user_id: string } & Record<string, unknown>>;
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const users: Record<string, { email: string; full_name: string | null }> = {};
  if (ids.length) {
    const { data } = await db.from("users").select("id, email, full_name").in("id", ids);
    for (const u of (data ?? []) as Array<{ id: string; email: string; full_name: string | null }>) users[u.id] = u;
  }

  return NextResponse.json({
    missions: missions ?? [],
    submissions: rows.map((r) => ({ ...r, user: users[r.user_id] ?? null })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { db } = auth;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload", detail: parsed.error.issues[0]?.message }, { status: 400 });
  const body = parsed.data;

  switch (body.action) {
    case "save": {
      const row = {
        day_number: body.day_number,
        title: body.title,
        description: body.description || null,
        action_url: body.action_url || null,
        proof: body.proof,
        points_reward: body.points_reward,
        sort_order: body.sort_order,
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      };
      const res = body.id
        ? await db.from("ondemand_missions").update(row).eq("id", body.id).select("id").single()
        : await db.from("ondemand_missions").insert(row).select("id").single();
      if (res.error) return NextResponse.json({ error: "internal", detail: res.error.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: (res.data as { id: string }).id });
    }

    case "delete": {
      const { count } = await db
        .from("ondemand_mission_submissions")
        .select("id", { count: "exact", head: true })
        .eq("mission_id", body.id);
      if ((count ?? 0) > 0) return NextResponse.json({ error: "has_submissions" }, { status: 409 });
      const { error } = await db.from("ondemand_missions").delete().eq("id", body.id);
      if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "reject": {
      const { data: sub } = await db
        .from("ondemand_mission_submissions")
        .select("id, user_id, status, points_awarded")
        .eq("id", body.submission_id)
        .maybeSingle();
      const s = sub as { id: string; user_id: string; status: string; points_awarded: number } | null;
      if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
      if (s.status === "rejected") return NextResponse.json({ ok: true, already: true });
      const { error } = await db
        .from("ondemand_mission_submissions")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", s.id)
        .eq("status", "approved");
      if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
      if (s.points_awarded > 0) {
        await db.rpc("add_points", { p_user_id: s.user_id, p_delta: -s.points_awarded, p_category: "mission" });
      }
      return NextResponse.json({ ok: true });
    }
  }
}
