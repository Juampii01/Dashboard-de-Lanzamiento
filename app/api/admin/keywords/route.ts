import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return null;
  return { user, service };
}

export async function GET() {
  const ctx = await getAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await ctx.service
    .from("call_keywords")
    .select("day_number, keyword, points_reward, updated_at")
    .order("day_number");

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getAdmin();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as { day_number?: number; keyword?: string };
  const day = Number(body.day_number);
  const keyword = String(body.keyword ?? "").trim();

  if (!day || day < 1 || day > 4 || !keyword) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { error } = await ctx.service
    .from("call_keywords")
    .upsert({ day_number: day, keyword, updated_at: new Date().toISOString() }, { onConflict: "day_number" });

  if (error) {
    console.error("[admin/keywords] upsert error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
