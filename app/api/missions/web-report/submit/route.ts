import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/missions/web-report/submit
 * Body: { message: string }
 *
 * "Mi página del Día 3 no quedó bien" — el usuario ya puede regenerar
 * libremente (no hay ningún gate técnico); esto solo avisa al admin.
 * Requiere web_issue_reports (migración 20260702000003_web_issue_reports.sql).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { message?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const message = (body.message ?? "").trim();
  if (!message || message.length > 500) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.from("web_issue_reports").insert({
    user_id: user.id,
    message,
  });

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "table_not_found" }, { status: 501 });
  }
  if (error) {
    console.error("[web-report/submit]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
