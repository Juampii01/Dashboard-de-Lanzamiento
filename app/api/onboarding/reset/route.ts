import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  await supabase
    .from("users")
    .update({ has_seen_onboarding: false })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
