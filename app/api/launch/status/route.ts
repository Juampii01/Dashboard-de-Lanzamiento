import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/launch/status?day=N
 *   day 0 = Inicio (dashboard), 1..4 = días del challenge.
 *
 * Devuelve { unlocked } para que el contador del cliente recargue la página
 * cuando el admin desbloquea manualmente (o desbloquea antes de la hora). No
 * revela nada sensible: solo el estado de apertura para el usuario que pregunta.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ unlocked: false });

  const day = Number(new URL(req.url).searchParams.get("day"));
  if (!Number.isInteger(day) || day < 0 || day > 4) {
    return NextResponse.json({ unlocked: false });
  }

  const service = createServiceClient();

  // Admin siempre ve desbloqueado.
  const { data: profile } = await service
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if ((profile as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ unlocked: true });
  }

  // Toggle global del día/Inicio (lo que abre el admin).
  const { data: toggle } = await service
    .from("admin_toggles")
    .select("is_globally_unlocked")
    .eq("day_number", day)
    .maybeSingle();
  if ((toggle as { is_globally_unlocked?: boolean } | null)?.is_globally_unlocked) {
    return NextResponse.json({ unlocked: true });
  }

  // El desbloqueo es 100% manual (toggle global del admin). El progreso
  // por-usuario NO desbloquea: así el Día 1 (unlocked por defecto) queda
  // bloqueado hasta que el equipo lo abra.
  return NextResponse.json({ unlocked: false });
}
