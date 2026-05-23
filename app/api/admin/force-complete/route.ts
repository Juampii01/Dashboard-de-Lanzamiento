import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const POINTS_PER_DAY = 50;

// Admin: descompletar un día
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service
    .from("users")
    .select("is_admin, total_points")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { day } = await req.json();
  if (!day || day < 1 || day > 4) {
    return NextResponse.json({ ok: false, error: "invalid_day" }, { status: 400 });
  }

  // Marcar como no completado (mantiene is_unlocked para no bloquear acceso)
  await service
    .from("day_progress")
    .update({ is_completed: false, completed_at: null })
    .eq("user_id", user.id)
    .eq("day_number", day);

  // Descontar XP si el total lo permite
  const newTotal = Math.max(0, (profile.total_points ?? 0) - POINTS_PER_DAY);
  await service
    .from("users")
    .update({ total_points: newTotal })
    .eq("id", user.id);

  return NextResponse.json({ ok: true, pointsRemoved: POINTS_PER_DAY, total: newTotal });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  // Admin-only endpoint
  const service = createServiceClient();
  const { data: profile } = await service
    .from("users")
    .select("is_admin, total_points")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { day } = await req.json();
  if (!day || day < 1 || day > 4) {
    return NextResponse.json({ ok: false, error: "invalid_day" }, { status: 400 });
  }

  // Check if already completed
  const { data: progress } = await service
    .from("day_progress")
    .select("is_completed")
    .eq("user_id", user.id)
    .eq("day_number", day)
    .maybeSingle();

  const alreadyDone = progress?.is_completed ?? false;

  // Force complete regardless of form state
  await service
    .from("day_progress")
    .upsert(
      {
        user_id: user.id,
        day_number: day,
        is_completed: true,
        is_unlocked: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day_number" }
    );

  if (alreadyDone) {
    return NextResponse.json({ ok: true, pointsAwarded: 0, alreadyCompleted: true });
  }

  // Award XP
  const newTotal = (profile.total_points ?? 0) + POINTS_PER_DAY;
  await service
    .from("users")
    .update({ total_points: newTotal })
    .eq("id", user.id);

  return NextResponse.json({ ok: true, pointsAwarded: POINTS_PER_DAY, total: newTotal });
}
