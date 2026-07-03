import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** GET → últimos clicks en los botones de "Tu Próximo Paso", con nombre/email del usuario. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: me } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await service
    .from("proximo_paso_clicks")
    .select("id, user_id, button, clicked_at")
    .order("clicked_at", { ascending: false })
    .limit(200);

  if (error?.code === "42P01") {
    return NextResponse.json({ ok: true, clicks: [] });
  }
  if (error) {
    console.error("[admin/proximo-paso-clicks GET]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{ id: string; user_id: string; button: string; clicked_at: string }>;
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const nameMap: Record<string, { full_name: string | null; email: string }> = {};
  if (userIds.length) {
    const { data: users } = await service.from("users").select("id, full_name, email").in("id", userIds);
    for (const u of (users ?? []) as Array<{ id: string; full_name: string | null; email: string }>) {
      nameMap[u.id] = { full_name: u.full_name, email: u.email };
    }
  }

  const clicks = rows.map((r) => ({ ...r, ...(nameMap[r.user_id] ?? { full_name: null, email: "" }) }));
  return NextResponse.json({ ok: true, clicks });
}
