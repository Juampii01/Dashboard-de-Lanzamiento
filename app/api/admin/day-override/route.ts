import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/day-override
 * Body: { user_id: string, day_number: number, unlock: boolean }
 *
 * Sobreescribe is_unlocked en day_progress para un usuario específico.
 * Solo admins pueden llamar este endpoint.
 */
export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Parse body
  let body: { user_id: string; day_number: number; unlock: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof body.user_id !== "string" ||
    typeof body.day_number !== "number" ||
    typeof body.unlock !== "boolean"
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { error } = await service
    .from("day_progress")
    .update({ is_unlocked: body.unlock } as Record<string, unknown>)
    .eq("user_id", body.user_id)
    .eq("day_number", body.day_number);

  if (error) {
    console.error("[day-override] update error:", error);
    return NextResponse.json({ error: "internal", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
