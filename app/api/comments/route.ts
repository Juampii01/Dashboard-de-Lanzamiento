import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/comments   — public listing (no auth required)
 * POST /api/comments  — authenticated users only
 *
 * Requires `program_comments` table. Returns 501 gracefully if table
 * doesn't exist yet so the UI can show a "coming soon" fallback.
 *
 * Migration SQL (run once in Supabase > SQL Editor):
 *
 * create table if not exists program_comments (
 *   id           uuid default gen_random_uuid() primary key,
 *   user_id      uuid not null,
 *   display_name text not null,
 *   content      text not null check (char_length(content) between 1 and 500),
 *   created_at   timestamptz default now() not null
 * );
 * alter table program_comments enable row level security;
 * create policy "public read"      on program_comments for select using (true);
 * create policy "users can insert" on program_comments for insert
 *   with check (auth.uid() = user_id);
 */

// GET — last 30 comments, newest first
export async function GET() {
  const service = createServiceClient();

  const { data, error } = await service
    .from("program_comments")
    .select("id, display_name, content, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  // Table doesn't exist yet → graceful 501
  if (error?.code === "42P01") {
    return NextResponse.json({ error: "table_not_found" }, { status: 501 });
  }
  if (error) {
    console.error("[comments GET]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ comments: (data ?? []).reverse() });
}

// POST — insert a new comment
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const content = body.content?.trim() ?? "";
  if (!content || content.length > 500) {
    return NextResponse.json({ error: "invalid_content" }, { status: 400 });
  }

  // Fetch display name from users table
  const service = createServiceClient();
  const { data: profile } = await service
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    (profile?.full_name as string | null | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Participante";

  const { error } = await service.from("program_comments").insert({
    user_id: user.id,
    display_name: displayName,
    content,
  } as Record<string, unknown>);

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "table_not_found" }, { status: 501 });
  }
  if (error) {
    console.error("[comments POST]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // +200 pts por participar en la comunidad — hasta 3 veces. Los comentarios
  // siguientes se publican igual, pero ya no suman puntos.
  const MAX_REWARDED = 3;
  const REWARD = 200;
  let awarded = false;
  let delta = 0;
  let total: number | null = null;

  const { count: priorAwards } = await service
    .from("point_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("category", "community");

  if ((priorAwards ?? 0) < MAX_REWARDED) {
    const { data: newTotal, error: rpcErr } = await service.rpc("add_points", {
      p_user_id: user.id,
      p_delta: REWARD,
      p_category: "community",
    });
    if (rpcErr) {
      console.error("[comments POST] add_points error:", rpcErr.message);
    } else {
      awarded = true;
      delta = REWARD;
      total = newTotal as number;
    }
  }

  return NextResponse.json({ ok: true, awarded, delta, total });
}
