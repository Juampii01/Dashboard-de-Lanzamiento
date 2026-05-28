import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/ads/claim
 * Otorga +20 XP por haber visto un anuncio.
 * El cooldown de 10 min se valida en la RPC claim_ad_xp() con FOR UPDATE.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ awarded: false, reason: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("claim_ad_xp", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("[ads/claim] rpc error:", error);
    return NextResponse.json({ awarded: false, reason: "internal" }, { status: 500 });
  }

  // data: { awarded, xp?, new_total?, reason?, next_in_seconds? }
  return NextResponse.json(data);
}
