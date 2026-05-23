import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const POINTS = 30;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ awarded: false }, { status: 401 });

  const { day } = await req.json();
  if (!day || day < 1 || day > 4) {
    return NextResponse.json({ awarded: false, error: "invalid_day" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", user.id)
    .single();

  const newTotal = (profile?.total_points ?? 0) + POINTS;
  await supabase.from("users").update({ total_points: newTotal }).eq("id", user.id);

  return NextResponse.json({ awarded: true, points: POINTS, total: newTotal });
}
