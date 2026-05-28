import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * POST /api/xp/claim-podcast
 * Awards +30 XP once per user per podcast capsule.
 * Idempotent — second call returns { ok: true, alreadyClaimed: true, points: 0 }.
 *
 * Body: { capsuleId: string }
 */

const bodySchema = z.object({
  capsuleId: z.string().min(1),
});

const PODCAST_XP = 30;

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // ── Parse ─────────────────────────────────────────────────────────────────────
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const { capsuleId } = parsed.data;

  const service = createServiceClient();

  // ── Verify capsule is type 'podcast' ──────────────────────────────────────────
  const { data: capsule, error: capErr } = await service
    .from("video_capsules")
    .select("id, video_type, day_number")
    .eq("id", capsuleId)
    .maybeSingle();

  if (capErr || !capsule) {
    return NextResponse.json({ error: "capsule_not_found" }, { status: 404 });
  }
  if (capsule.video_type !== "podcast") {
    return NextResponse.json({ error: "not_a_podcast" }, { status: 400 });
  }

  // ── Day access gate ───────────────────────────────────────────────────────────
  const { data: dayAccess } = await service
    .from("day_progress")
    .select("is_unlocked")
    .eq("user_id", user.id)
    .eq("day_number", capsule.day_number)
    .maybeSingle();

  if (!dayAccess?.is_unlocked) {
    return NextResponse.json({ error: "day_locked" }, { status: 403 });
  }

  // ── Idempotency check ─────────────────────────────────────────────────────────
  const { data: existing } = await service
    .from("podcast_xp_claims")
    .select("id")
    .eq("user_id", user.id)
    .eq("capsule_id", capsuleId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyClaimed: true, points: 0 });
  }

  // ── Record claim ──────────────────────────────────────────────────────────────
  const { error: insertErr } = await service
    .from("podcast_xp_claims")
    .insert({ user_id: user.id, capsule_id: capsuleId, xp_awarded: PODCAST_XP });

  if (insertErr) {
    // Race condition: another request beat us — treat as already claimed
    if (insertErr.code === "23505") {
      return NextResponse.json({ ok: true, alreadyClaimed: true, points: 0 });
    }
    console.error("[xp/claim-podcast] insert error:", insertErr);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // ── Award XP ──────────────────────────────────────────────────────────────────
  const { data: newTotal, error: xpErr } = await service.rpc("add_points", {
    p_user_id: user.id,
    p_delta:   PODCAST_XP,
  });

  if (xpErr) {
    console.error("[xp/claim-podcast] add_points error:", xpErr);
    // Claim is recorded; XP is non-fatal — admin can compensate
    return NextResponse.json({ ok: true, points: PODCAST_XP, total: null });
  }

  return NextResponse.json({ ok: true, points: PODCAST_XP, total: newTotal });
}
