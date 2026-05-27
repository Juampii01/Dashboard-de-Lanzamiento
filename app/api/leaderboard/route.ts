import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// M8: Cache leaderboard responses at the CDN edge for 30 s.
// The component polls every 60 s, so a 30 s CDN TTL collapses N concurrent
// user requests into ~2 DB calls per minute instead of N.
// get_leaderboard() returns anonymized data — safe to serve from CDN cache.
export const revalidate = 30;

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ top: [] }, { status: 401 });

  const { data, error } = await supabase.rpc("get_leaderboard");
  if (error) return NextResponse.json({ top: [] }, { status: 500 });

  return NextResponse.json(
    { top: data ?? [] },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
