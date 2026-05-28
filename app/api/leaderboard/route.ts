import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// The RPC now returns user-specific data (my_rank, in_top, me).
// Cache must be private — cannot be shared across users at the CDN layer.
// Browser-level 30 s cache is kept so rapid navigations don't re-hit the DB.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { top: [], me: null, my_rank: null, in_top: false, total: 0 },
      { status: 401 }
    );
  }

  const { data, error } = await supabase.rpc("get_leaderboard");
  if (error) {
    console.error("[leaderboard] rpc error:", error);
    return NextResponse.json(
      { top: [], me: null, my_rank: null, in_top: false, total: 0 },
      { status: 500 }
    );
  }

  // data is the raw json object returned by the RPC
  return NextResponse.json(data, {
    headers: {
      // private: browser-level 30 s cache, no CDN sharing between users
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}
