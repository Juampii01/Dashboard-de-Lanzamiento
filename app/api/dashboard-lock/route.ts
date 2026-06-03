import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/dashboard-lock
 * Devuelve el estado de bloqueo del dashboard.
 * Sin caché — los clientes hacen polling cada 20s para detectar cambios.
 */
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("dashboard_lock")
    .select("is_locked, call_url, message, locked_at")
    .eq("id", 1)
    .single();

  if (error || !data) {
    // Si la tabla no existe todavía (staging lag) → no bloquear
    return NextResponse.json(
      { is_locked: false, call_url: null, message: null, locked_at: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      is_locked: data.is_locked,
      call_url: data.call_url ?? null,
      message: data.message ?? null,
      locked_at: (data as { locked_at?: string | null }).locked_at ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
