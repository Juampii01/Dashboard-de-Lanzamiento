import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canJoinRifa, hasJoinedRifa, isRifaEnabled } from "@/lib/rifa";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data } = await service
    .from("users")
    .select("program, is_admin, is_student, viewer_of, hotmart_transaction_id")
    .eq("id", user.id)
    .maybeSingle();
  return { id: user.id, service, profile: data as Parameters<typeof canJoinRifa>[0] };
}

/** GET → { enabled, joined, eligible } para el banner del participante. */
export async function GET() {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const eligible = canJoinRifa(u.profile);
  if (!eligible) return NextResponse.json({ enabled: false, joined: false, eligible: false });
  const [enabled, joined] = await Promise.all([isRifaEnabled(u.service), hasJoinedRifa(u.service, u.id)]);
  return NextResponse.json({ enabled, joined, eligible: true });
}

/** POST → se anota en la rifa (solo con el banner activo). Idempotente. */
export async function POST() {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canJoinRifa(u.profile)) return NextResponse.json({ error: "not_eligible" }, { status: 403 });
  if (!(await isRifaEnabled(u.service))) {
    return NextResponse.json({ error: "closed", message: "La rifa no está abierta en este momento." }, { status: 409 });
  }
  const { error } = await u.service
    .from("rifa_participants")
    .upsert({ user_id: u.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) {
    console.error("[rifa join]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, joined: true });
}
