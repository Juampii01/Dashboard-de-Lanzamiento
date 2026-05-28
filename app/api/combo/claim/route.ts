import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/combo/claim
 *
 * Cobra el bonus de combo (50 XP) cuando la barra llegó al 100%.
 * El cooldown y la validación se hacen en la RPC claim_combo() con FOR UPDATE.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ claimed: false, reason: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("claim_combo", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("[combo/claim] rpc error:", error);
    return NextResponse.json({ claimed: false, reason: "internal" }, { status: 500 });
  }

  // data: { claimed, bonus?, new_total?, reason? }
  return NextResponse.json(data);
}
