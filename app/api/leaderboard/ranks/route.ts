import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Devuelve todos los participantes (vía get_full_leaderboard) para armar las
// tablas por rango en el cliente. Cache privada (datos por usuario).
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ all: [], my_global_rank: null, total: 0 }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_full_leaderboard");
  if (error) {
    console.error("[leaderboard/ranks] rpc error:", error);
    return NextResponse.json({ all: [], my_global_rank: null, total: 0 }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}
