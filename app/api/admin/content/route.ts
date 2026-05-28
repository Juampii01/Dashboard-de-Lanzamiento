import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/content
 * Returns all video capsules grouped by day, each with their quiz questions.
 * Admin-only.
 *
 * Response shape:
 * {
 *   days: {
 *     day_number: number;
 *     capsules: {
 *       id: string; title: string; description: string | null;
 *       youtube_url: string; podcast_url: string | null;
 *       video_type: string; orientation: string;
 *       duration_seconds: number | null; points_reward: number; sort_order: number;
 *       quizzes: {
 *         id: string; question: string; options: string[];
 *         correct_option_index: number; xp_reward: number; question_order: number;
 *       }[];
 *     }[];
 *   }[];
 * }
 */
export async function GET() {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service
    .from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // ── Fetch capsules ────────────────────────────────────────────────────────────
  const { data: capsules, error: capErr } = await service
    .from("video_capsules")
    .select("id, day_number, title, description, youtube_url, podcast_url, video_type, orientation, duration_seconds, points_reward, sort_order")
    .order("day_number", { ascending: true })
    .order("sort_order",  { ascending: true });

  if (capErr) {
    console.error("[admin/content] fetch capsules:", capErr);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // ── Fetch quiz questions ──────────────────────────────────────────────────────
  const { data: quizzes, error: qErr } = await service
    .from("video_quizzes")
    .select("id, capsule_id, question, options, correct_option_index, xp_reward, question_order")
    .order("capsule_id",     { ascending: true })
    .order("question_order", { ascending: true });

  if (qErr) {
    console.error("[admin/content] fetch quizzes:", qErr);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // ── Group quizzes by capsule_id ───────────────────────────────────────────────
  type QuizRow  = { id: string; capsule_id: string; question: string; options: string[]; correct_option_index: number; xp_reward: number; question_order: number };
  type CapRow   = { id: string; day_number: number; title: string; description: string | null; youtube_url: string; podcast_url: string | null; video_type: string; orientation: string; duration_seconds: number | null; points_reward: number; sort_order: number };

  const typedQuizzes   = (quizzes   ?? []) as unknown as QuizRow[];
  const typedCapsules  = (capsules  ?? []) as unknown as CapRow[];

  const quizByCapsule: Record<string, QuizRow[]> = {};
  for (const q of typedQuizzes) {
    if (!quizByCapsule[q.capsule_id]) quizByCapsule[q.capsule_id] = [];
    quizByCapsule[q.capsule_id]!.push(q);
  }

  // ── Group capsules by day_number ──────────────────────────────────────────────
  const dayMap: Record<number, CapRow[]> = {};
  for (const c of typedCapsules) {
    if (!dayMap[c.day_number]) dayMap[c.day_number] = [];
    dayMap[c.day_number]!.push(c);
  }

  const days = Object.entries(dayMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([dayStr, caps]) => ({
      day_number: Number(dayStr),
      capsules: (caps ?? []).map((c) => ({
        ...c,
        quizzes: quizByCapsule[c.id] ?? [],
      })),
    }));

  return NextResponse.json({ days });
}
