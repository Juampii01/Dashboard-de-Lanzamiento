import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/day-toggle
 * Body: { day_number: number, value: boolean }
 *
 * Actualiza is_globally_unlocked en admin_toggles.
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
  let body: { day_number: number; value: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.day_number !== "number" || typeof body.value !== "boolean") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { error } = await service
    .from("admin_toggles")
    .update({
      is_globally_unlocked: body.value,
      unlocked_at: body.value ? new Date().toISOString() : null,
    } as Record<string, unknown>)
    .eq("day_number", body.day_number);

  if (error) {
    console.error("[day-toggle] update error:", error);
    return NextResponse.json({ error: "internal", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
