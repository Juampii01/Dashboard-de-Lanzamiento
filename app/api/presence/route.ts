import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Ping de presencia: marca al usuario como "conectado ahora" refrescando
// last_seen_at. Lo llama el XpEngine cada ~60s mientras la pestaña está visible.
// Liviano: una sola escritura.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const service = createServiceClient();
  await service
    .from("users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
