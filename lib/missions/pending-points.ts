import type { createServiceClient } from "@/lib/supabase/server";

/**
 * Puntos "en revisión": misiones que revisa el equipo (ráfagas y misión del
 * día). Los puntos se suman recién al aprobarse, así que el participante ve
 * acá qué mandó, qué está esperando revisión y qué se le acreditó.
 */
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewItem {
  id: string;
  kind: "rafaga" | "mission";
  title: string;
  status: ReviewStatus;
  /** Puntos que suma la misión al aprobarse (la mitad sobre 10.000 pts). */
  reward: number;
  /** Puntos que se sumaron de verdad (0 si no se sumaron). */
  credited: number;
  submitted_at: string;
  reviewed_at: string | null;
  /** El participante ya vio el resultado de la revisión. */
  seen: boolean;
}

export interface ReviewSummary {
  pending_points: number;
  pending_count: number;
  items: ReviewItem[];
  /** Resultados revisados que el participante todavía no vio. */
  unseen: {
    credited_points: number;
    credited_count: number;
    rejected_points: number;
    rejected_count: number;
  };
}

type Db = ReturnType<typeof createServiceClient>;

export async function getReviewSummary(db: Db, userId: string): Promise<ReviewSummary> {
  const [raf, mis, me] = await Promise.all([
    db.from("rafaga_submissions")
      .select("id, rafaga_id, status, points_earned, credited_points, submitted_at, reviewed_at, seen_at")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(100),
    db.from("mission_submissions")
      .select("id, mission_id, status, points_awarded, credited_points, created_at, reviewed_at, seen_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("users").select("total_points").eq("id", userId).maybeSingle(),
  ]);
  // Sobre 10.000 pts cada misión suma la mitad: lo pendiente se muestra con el
  // valor que realmente va a sumar.
  const over10k = Number((me.data as { total_points?: number } | null)?.total_points ?? 0) >= 10000;
  const expected = (reward: number) => (over10k ? Math.floor(reward / 2) : reward);

  const rafRows = (raf.data ?? []) as Array<{
    id: string; rafaga_id: string; status: string; points_earned: number;
    credited_points: number | null; submitted_at: string; reviewed_at: string | null; seen_at: string | null;
  }>;
  const misRows = (mis.data ?? []) as Array<{
    id: string; mission_id: string; status: string; points_awarded: number;
    credited_points: number | null; created_at: string; reviewed_at: string | null; seen_at: string | null;
  }>;

  const rafIds = [...new Set(rafRows.map((r) => r.rafaga_id))];
  const misIds = [...new Set(misRows.map((r) => r.mission_id))];
  const [rafTitles, misTitles] = await Promise.all([
    rafIds.length ? db.from("rafaga_missions").select("id, title").in("id", rafIds) : Promise.resolve({ data: [] }),
    misIds.length ? db.from("daily_missions").select("id, title").in("id", misIds) : Promise.resolve({ data: [] }),
  ]);
  const titleOf = new Map<string, string>();
  for (const t of ((rafTitles.data ?? []) as Array<{ id: string; title: string }>)) titleOf.set(t.id, t.title);
  for (const t of ((misTitles.data ?? []) as Array<{ id: string; title: string }>)) titleOf.set(t.id, t.title);

  const norm = (s: string): ReviewStatus => (s === "pending" || s === "rejected" ? s : "approved");

  const items: ReviewItem[] = [
    ...rafRows.map((r) => ({
      id: r.id, kind: "rafaga" as const, title: titleOf.get(r.rafaga_id) ?? "Misión relámpago",
      status: norm(r.status), reward: expected(Number(r.points_earned ?? 0)),
      credited: norm(r.status) === "approved" ? Number(r.credited_points ?? r.points_earned ?? 0) : 0,
      submitted_at: r.submitted_at, reviewed_at: r.reviewed_at, seen: !!r.seen_at,
    })),
    ...misRows.map((r) => ({
      id: r.id, kind: "mission" as const, title: titleOf.get(r.mission_id) ?? "Misión del día",
      status: norm(r.status), reward: expected(Number(r.points_awarded ?? 0)),
      credited: norm(r.status) === "approved" ? Number(r.credited_points ?? r.points_awarded ?? 0) : 0,
      submitted_at: r.created_at, reviewed_at: r.reviewed_at, seen: !!r.seen_at,
    })),
  ].sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));

  const pending = items.filter((i) => i.status === "pending");
  const unseenReviewed = items.filter((i) => i.status !== "pending" && !i.seen);
  const unseenCredited = unseenReviewed.filter((i) => i.status === "approved");
  const unseenRejected = unseenReviewed.filter((i) => i.status === "rejected");

  return {
    pending_points: pending.reduce((a, i) => a + i.reward, 0),
    pending_count: pending.length,
    items,
    unseen: {
      credited_points: unseenCredited.reduce((a, i) => a + i.credited, 0),
      credited_count: unseenCredited.length,
      rejected_points: unseenRejected.reduce((a, i) => a + i.reward, 0),
      rejected_count: unseenRejected.length,
    },
  };
}

/** Marca como vistos los resultados ya revisados del usuario. */
export async function markReviewSeen(db: Db, userId: string) {
  const now = new Date().toISOString();
  await Promise.all([
    db.from("rafaga_submissions").update({ seen_at: now }).eq("user_id", userId).is("seen_at", null).neq("status", "pending"),
    db.from("mission_submissions").update({ seen_at: now }).eq("user_id", userId).is("seen_at", null).neq("status", "pending"),
  ]);
}
