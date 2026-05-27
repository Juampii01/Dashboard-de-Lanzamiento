/**
 * GET /api/social-proof
 *
 * A2 fix: replaces the broken direct-RPC call in the SocialProof client
 * component.  get_day_completion_counts() was revoked from anon and
 * authenticated in Día 2 — only service_role can call it now.
 *
 * This route runs server-side with service_role and exposes an
 * unauthenticated-friendly endpoint (the data is aggregate counts,
 * not personally identifiable).
 */
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface DayCount {
  day_number: number;
  completed_today: number;
  completed_total: number;
}

// Cache for 30 seconds — reduces DB hits without sacrificing freshness
export const revalidate = 30;

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("get_day_completion_counts");

  if (error) {
    console.error("[social-proof] RPC error:", error);
    return NextResponse.json({ counts: [] }, { status: 500 });
  }

  return NextResponse.json(
    { counts: (data ?? []) as DayCount[] },
    {
      headers: {
        // Allow edge cache (Vercel CDN) to serve stale for up to 60s
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
