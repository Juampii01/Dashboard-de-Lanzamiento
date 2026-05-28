import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * PUT /api/admin/content/capsule
 * Update editable fields of a video capsule. Admin-only.
 *
 * Body: {
 *   id: string;                    // capsule id (required)
 *   title?: string;
 *   description?: string | null;
 *   youtube_url?: string | null;
 *   podcast_url?: string | null;
 *   video_type?: "normal" | "podcast" | "ad";
 *   orientation?: "horizontal" | "vertical";
 *   duration_seconds?: number | null;
 *   points_reward?: number;
 * }
 */

const bodySchema = z.object({
  id:               z.string().min(1),
  title:            z.string().min(1).max(200).optional(),
  description:      z.string().max(500).nullable().optional(),
  youtube_url:      z.string().url().nullable().optional(),
  podcast_url:      z.string().url().nullable().optional(),
  video_type:       z.enum(["normal", "podcast", "ad"]).optional(),
  orientation:      z.enum(["horizontal", "vertical"]).optional(),
  duration_seconds: z.number().int().positive().nullable().optional(),
  points_reward:    z.number().int().min(0).max(1000).optional(),
});

export async function PUT(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service
    .from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // ── Parse body ────────────────────────────────────────────────────────────────
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;

  // Nothing to update
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  const { data, error } = await service
    .from("video_capsules")
    .update(updates as Record<string, unknown>)
    .eq("id", id)
    .select("id, title, description, youtube_url, podcast_url, video_type, orientation, duration_seconds, points_reward")
    .maybeSingle();

  if (error) {
    console.error("[admin/content/capsule] update error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, capsule: data });
}
