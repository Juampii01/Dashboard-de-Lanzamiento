import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * POST   /api/admin/content/quiz — create a new quiz question for a capsule
 * PUT    /api/admin/content/quiz — update an existing quiz question
 * DELETE /api/admin/content/quiz — delete a quiz question
 *
 * Admin-only.
 */

const createSchema = z.object({
  capsule_id:           z.string().min(1),
  question:             z.string().min(5).max(500),
  options:              z.array(z.string().min(1).max(300)).min(2).max(5),
  correct_option_index: z.number().int().min(0).max(4),
  xp_reward:            z.number().int().min(0).max(100).default(10),
  question_order:       z.number().int().min(1).default(1),
});

const updateSchema = z.object({
  id:                   z.string().uuid(),
  question:             z.string().min(5).max(500).optional(),
  options:              z.array(z.string().min(1).max(300)).min(2).max(5).optional(),
  correct_option_index: z.number().int().min(0).max(4).optional(),
  xp_reward:            z.number().int().min(0).max(100).optional(),
  question_order:       z.number().int().min(1).optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

// ── Shared auth helper ────────────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: profile } = await service
    .from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return null;

  return service;
}

// ── POST — create ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const service = await requireAdmin();
  if (!service) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }

  const { data, error } = await service
    .from("video_quizzes")
    .insert({
      capsule_id:           parsed.data.capsule_id,
      question:             parsed.data.question,
      options:              parsed.data.options,
      correct_option_index: parsed.data.correct_option_index,
      xp_reward:            parsed.data.xp_reward,
      question_order:       parsed.data.question_order,
    })
    .select("id, capsule_id, question, options, correct_option_index, xp_reward, question_order")
    .maybeSingle();

  if (error) {
    console.error("[admin/content/quiz] create error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, quiz: data }, { status: 201 });
}

// ── PUT — update ──────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const service = await requireAdmin();
  if (!service) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const { data, error } = await service
    .from("video_quizzes")
    .update(updates as Record<string, unknown>)
    .eq("id", id)
    .select("id, capsule_id, question, options, correct_option_index, xp_reward, question_order")
    .maybeSingle();

  if (error) {
    console.error("[admin/content/quiz] update error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true, quiz: data });
}

// ── DELETE — remove ───────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const service = await requireAdmin();
  if (!service) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }

  const { error } = await service
    .from("video_quizzes")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[admin/content/quiz] delete error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
