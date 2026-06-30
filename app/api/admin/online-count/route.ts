import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// "Conectados ahora": cuenta usuarios cuyo last_seen_at es reciente. El XpEngine
// pingea /api/presence cada 60s mientras la pestaña está visible, así que una
// ventana de ~2,5 min tolera un ping perdido sin marcar a alguien como offline.
// Excluye admins (cuentas de equipo/prueba); incluye alumnos (también están viendo).
const WINDOW_MS = 150_000;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: me } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await service
    .from("users")
    .select("id", { count: "exact", head: true })
    .gte("last_seen_at", since)
    .eq("is_admin", false);

  return NextResponse.json({ online: count ?? 0 });
}
