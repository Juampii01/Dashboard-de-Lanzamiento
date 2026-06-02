import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const bodySchema = z.object({
  quiz_id: z.string().uuid(),
  selected_option_index: z.number().int().min(0).max(4),
});

/**
 * POST /api/quiz/submit
 * Body: { quiz_id: string (uuid), selected_option_index: number 0-3 }
 *
 * Response:
 *   { correct: true,  xp_awarded: number, total_points: number }  — right answer
 *   { correct: false, xp_awarded: 0 }                             — wrong answer
 *   { correct: true,  xp_awarded: 0, already_correct: true }      — already answered correctly
 */
export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Input validation ────────────────────────────────────────────────────────
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const { quiz_id, selected_option_index } = parsed.data;

  // ── Fetch quiz (service client — correct_option_index is not in the public view) ──
  const service = createServiceClient();
  const { data: quizRaw, error: quizErr } = await service
    .from("video_quizzes")
    .select("id, correct_option_index, xp_reward, capsule_id, explanation")
    .eq("id", quiz_id)
    .maybeSingle();
  const quiz = quizRaw as {
    id: string;
    correct_option_index: number;
    xp_reward: number;
    capsule_id: string;
    explanation: string | null;
  } | null;

  if (quizErr) {
    console.error("[quiz/submit] fetch quiz error:", quizErr);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // ── Day-unlock gate ─────────────────────────────────────────────────────────
  // Derive day_number from the capsule, then verify the user has that day unlocked.
  // One extra query per submit — acceptable; prevents XP farming on locked days.
  const { data: capsuleRaw, error: capsuleErr } = await service
    .from("video_capsules")
    .select("day_number")
    .eq("id", quiz.capsule_id)
    .maybeSingle();
  const capsule = capsuleRaw as { day_number: number } | null;

  if (capsuleErr || !capsule) {
    console.error("[quiz/submit] fetch capsule error:", capsuleErr);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const { data: dayAccessRaw, error: dayErr } = await service
    .from("day_progress")
    .select("is_unlocked")
    .eq("user_id", user.id)
    .eq("day_number", capsule.day_number)
    .maybeSingle();
  const dayAccess = dayAccessRaw as { is_unlocked: boolean } | null;

  if (dayErr) {
    console.error("[quiz/submit] fetch day_progress error:", dayErr);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (!dayAccess?.is_unlocked) {
    // Fallback 1: day globally unlocked via admin toggle
    const { data: toggleRaw } = await service
      .from("admin_toggles")
      .select("is_globally_unlocked")
      .eq("day_number", capsule.day_number)
      .maybeSingle();
    const toggle = toggleRaw as { is_globally_unlocked: boolean } | null;

    // Fallback 2: user is admin
    const { data: profileRaw } = await service
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    const profile = profileRaw as { is_admin: boolean } | null;

    if (!toggle?.is_globally_unlocked && !profile?.is_admin) {
      return NextResponse.json({ error: "day_locked" }, { status: 403 });
    }
  }
  // ───────────────────────────────────────────────────────────────────────────

  const is_correct = selected_option_index === quiz.correct_option_index;

  // ── Check if user already answered correctly ─────────────────────────────────
  const { data: prevCorrect } = await service
    .from("video_quiz_attempts")
    .select("id, xp_awarded")
    .eq("user_id", user.id)
    .eq("quiz_id", quiz_id)
    .eq("is_correct", true)
    .maybeSingle();

  if (prevCorrect) {
    // Already answered correctly in a previous attempt — no XP awarded again.
    // Still record this attempt so analytics are complete.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service.from("video_quiz_attempts") as any).insert({
      user_id: user.id,
      quiz_id,
      selected_option_index,
      is_correct: true,
      xp_awarded: 0,
    });
    return NextResponse.json({
      correct: true,
      xp_awarded: 0,
      already_correct: true,
      correct_option_index: quiz.correct_option_index,
      explanation: quiz.explanation ?? null,
    });
  }

  // ── Record the attempt ───────────────────────────────────────────────────────
  const xp_to_award = is_correct ? quiz.xp_reward : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertErr } = await (service.from("video_quiz_attempts") as any).insert({
    user_id: user.id,
    quiz_id,
    selected_option_index,
    is_correct,
    xp_awarded: xp_to_award,
  });

  if (insertErr) {
    console.error("[quiz/submit] insert attempt error:", insertErr);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  // ── Award XP atomically if correct ──────────────────────────────────────────
  if (!is_correct) {
    return NextResponse.json({
      correct: false,
      xp_awarded: 0,
      correct_option_index: quiz.correct_option_index,
      explanation: quiz.explanation ?? null,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newTotal, error: xpErr } = await (service as any).rpc("add_points", {
    p_user_id: user.id,
    p_delta: quiz.xp_reward,
  });

  if (xpErr) {
    console.error("[quiz/submit] add_points error:", xpErr);
    // XP insert failed but attempt is recorded; non-fatal — admin can compensate
    return NextResponse.json({ correct: true, xp_awarded: 0, total_points: null });
  }

  return NextResponse.json({
    correct: true,
    xp_awarded: quiz.xp_reward,
    total_points: newTotal,
    correct_option_index: quiz.correct_option_index,
    explanation: quiz.explanation ?? null,
  });
}
