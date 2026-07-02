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

/** GET → reportes de "página no quedó bien" (pendientes primero, resueltos después). */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.service
    .from("web_issue_reports")
    .select("id, user_id, message, status, created_at, resolved_at")
    .order("status", { ascending: true }) // "pending" < "resolved" alfabéticamente
    .order("created_at", { ascending: false });

  if (error?.code === "42P01") {
    return NextResponse.json({ ok: true, reports: [] });
  }
  if (error) {
    console.error("[admin/web-reports GET]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{ user_id: string; [k: string]: unknown }>;
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const nameMap: Record<string, { full_name: string | null; email: string }> = {};
  if (userIds.length) {
    const { data: users } = await auth.service.from("users").select("id, full_name, email").in("id", userIds);
    for (const u of (users ?? []) as Array<{ id: string; full_name: string | null; email: string }>) {
      nameMap[u.id] = { full_name: u.full_name, email: u.email };
    }
  }

  const reports = rows.map((r) => ({ ...r, ...(nameMap[r.user_id] ?? { full_name: null, email: "" }) }));
  return NextResponse.json({ ok: true, reports });
}

/** POST → marcar un reporte como resuelto. Body: { id } */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { error } = await auth.service
    .from("web_issue_reports")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[admin/web-reports POST]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
