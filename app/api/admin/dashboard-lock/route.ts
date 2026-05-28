import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/dashboard-lock
 * Body: { lock: boolean, call_url?: string, message?: string }
 *
 * Sólo admins pueden llamar este endpoint.
 * Devuelve el nuevo estado del lock.
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
  let body: { lock: boolean; call_url?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.lock !== "boolean") {
    return NextResponse.json({ error: "lock must be boolean" }, { status: 400 });
  }

  // Update the single row
  const updatePayload: Record<string, unknown> = {
    is_locked: body.lock,
    updated_at: new Date().toISOString(),
  };

  if (body.lock) {
    updatePayload.locked_at = new Date().toISOString();
    updatePayload.locked_by = user.id;
  } else {
    updatePayload.locked_at = null;
    updatePayload.locked_by = null;
  }

  if (body.call_url !== undefined) {
    updatePayload.call_url = body.call_url || null;
  }

  if (body.message !== undefined && body.message.trim()) {
    updatePayload.message = body.message.trim();
  }

  const { data: updated, error } = await service
    .from("dashboard_lock")
    .update(updatePayload)
    .eq("id", 1)
    .select("is_locked, call_url, message, locked_at")
    .single();

  if (error) {
    console.error("[dashboard-lock] update error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: updated });
}

/**
 * GET /api/admin/dashboard-lock
 * Devuelve el estado completo (incluye locked_by, locked_at) para el panel admin.
 */
export async function GET() {
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

  const { data, error } = await service
    .from("dashboard_lock")
    .select("is_locked, call_url, message, locked_at, locked_by")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { is_locked: false, call_url: null, message: null, locked_at: null }
    );
  }

  return NextResponse.json(data);
}
