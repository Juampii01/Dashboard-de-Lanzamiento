import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const bodySchema = z.object({
  quiz_id: z.string().uuid(),
  selected_option_index: z.number().int().min(0).max(3),
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
  const { data: quiz, error: quizErr } = await service
    .from("video_quizzes")
    .select("id, correct_option_index, xp_reward")
    .eq("id", quiz_id)
    .maybeSingle();

  if (quizErr) {
    console.error("[quiz/submit] fetch quiz error:", quizErr);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

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
    await service.from("video_quiz_attempts").insert({
      user_id: user.id,
      quiz_id,
      selected_option_index,
      is_correct: true,
      xp_awarded: 0,
    });
    return NextResponse.json({ correct: true, xp_awarded: 0, already_correct: true });
  }

  // ── Record the attempt ───────────────────────────────────────────────────────
  const xp_to_award = is_correct ? quiz.xp_reward : 0;

  const { error: insertErr } = await service.from("video_quiz_attempts").insert({
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
    return NextResponse.json({ correct: false, xp_awarded: 0 });
  }

  const { data: newTotal, error: xpErr } = await service.rpc("add_points", {
    p_user_id: user.id,
    p_delta: quiz.xp_reward,
  });

  if (xpErr) {
    console.error("[quiz/submit] add_points error:", xpErr);
    // XP insert failed but attempt is recorded; non-fatal — admin can compensate
    return NextResponse.json({ correct: true, xp_awarded: 0, total_points: null });
  }

  // Broadcast XP event so PointsHUD updates without a page reload
  return NextResponse.json({
    correct: true,
    xp_awarded: quiz.xp_reward,
    total_points: newTotal,
  });
}
