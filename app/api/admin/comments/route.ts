import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return { error: "forbidden" as const, status: 403 };
  return { service };
}

/** GET → todos los comentarios de primer nivel (actuales y archivados). */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.service
    .from("program_comments")
    .select("id, user_id, display_name, content, created_at, hidden, archived_at, featured, parent_id")
    .is("parent_id", null)
    .order("created_at", { ascending: false });

  if (error?.code === "42703") {
    return NextResponse.json({ error: "migration_missing" }, { status: 501 });
  }
  if (error) {
    console.error("[admin/comments GET]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, comments: data ?? [] });
}

/**
 * POST
 *  { action: "feature", id, featured: boolean } → marca/desmarca un destacado
 *  { action: "archive_current" }                → archiva todos los comentarios
 *                                                 actuales (no borra nada)
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { action?: string; id?: string; featured?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.action === "feature") {
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const { error } = await auth.service
      .from("program_comments")
      .update({ featured: body.featured === true } as never)
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "archive_current") {
    const { data, error } = await auth.service
      .from("program_comments")
      .update({ archived_at: new Date().toISOString() } as never)
      .is("archived_at", null)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, archived: (data ?? []).length });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
