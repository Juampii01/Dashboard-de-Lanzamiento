import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ top: [] }, { status: 401 });

  const { data, error } = await supabase.rpc("get_leaderboard");
  if (error) return NextResponse.json({ top: [] }, { status: 500 });

  return NextResponse.json({ top: data ?? [] });
}
