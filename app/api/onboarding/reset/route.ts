import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  // Solo admins pueden reiniciar el onboarding (según contrato documentado).
  const service = createServiceClient();
  const { data: profile } = await service
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  await supabase
    .from("users")
    .update({ has_seen_onboarding: false })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
