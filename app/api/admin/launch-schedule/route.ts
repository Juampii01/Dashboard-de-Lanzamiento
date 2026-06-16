import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Programación de lanzamiento por día (overlay de contador para NO-admins).
 *
 * GET  → devuelve [{ day_number, scheduled_unlock_at, is_globally_unlocked }]
 * POST → { day_number: 1..4, unlock_at: string|null }
 *        Guarda admin_toggles.scheduled_unlock_at (UTC ISO). null = sin fecha
 *        (cae al default hardcodeado en lib/launch.ts).
 *
 * Solo admins. El bloqueo nunca aplica a admins.
 */

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };

  const service = createServiceClient();
  const { data: profile } = await service
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return { error: "forbidden" as const, status: 403 };
  return { service };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.service
    .from("admin_toggles")
    .select("day_number, scheduled_unlock_at, is_globally_unlocked")
    .order("day_number");

  if (error) {
    console.error("[launch-schedule] GET error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, schedule: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { day_number?: number; unlock_at?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const day = Number(body.day_number);
  if (!Number.isInteger(day) || day < 1 || day > 4) {
    return NextResponse.json({ error: "day_number must be 1..4" }, { status: 400 });
  }

  // Normalizar a UTC ISO. null/"" → limpiar (usa default).
  let unlockAt: string | null = null;
  if (body.unlock_at) {
    const ms = Date.parse(body.unlock_at);
    if (Number.isNaN(ms)) {
      return NextResponse.json({ error: "invalid_date" }, { status: 400 });
    }
    unlockAt = new Date(ms).toISOString();
  }

  const { data, error } = await auth.service
    .from("admin_toggles")
    .update({ scheduled_unlock_at: unlockAt, updated_at: new Date().toISOString() })
    .eq("day_number", day)
    .select("day_number, scheduled_unlock_at, is_globally_unlocked")
    .single();

  if (error) {
    console.error("[launch-schedule] POST error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, row: data });
}
