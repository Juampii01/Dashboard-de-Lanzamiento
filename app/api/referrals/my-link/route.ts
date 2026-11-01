import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOrCreateReferralCode, referralLink } from "@/lib/referrals";

/** GET /api/referrals/my-link → link de referido del usuario (lo usa "Mi perfil"). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const code = await getOrCreateReferralCode(createServiceClient(), user.id).catch(() => null);
  if (!code) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true, link: referralLink(code) });
}
