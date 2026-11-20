import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { MENTORIA_BUTTONS, MENTORIA_SETTING } from "@/lib/mentoria-popup";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  return (data as { is_admin?: boolean } | null)?.is_admin ? service : null;
}

type Click = { user_id: string; button: string; clicked_at: string };

/**
 * GET  → estado de la ventana de la mentoría + quién respondió qué.
 * POST { enabled } → la activa o la desactiva.
 */
export async function GET() {
  const service = await requireAdmin();
  if (!service) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [{ data: setting }, { data: clicks }] = await Promise.all([
    service.from("app_settings").select("value").eq("key", MENTORIA_SETTING).maybeSingle(),
    service.from("proximo_paso_clicks").select("user_id, button, clicked_at")
      .in("button", MENTORIA_BUTTONS as unknown as string[]).order("clicked_at", { ascending: true }).limit(5000),
  ]);
  const rows = (clicks ?? []) as Click[];

  // Por persona: cuándo la vio y su respuesta (la última, si tocó más de una).
  const byUser = new Map<string, { seen_at: string | null; answer: string | null; answered_at: string | null }>();
  for (const c of rows) {
    const cur = byUser.get(c.user_id) ?? { seen_at: null, answer: null, answered_at: null };
    if (c.button === "mentoria_visto") cur.seen_at = cur.seen_at ?? c.clicked_at;
    else { cur.answer = c.button; cur.answered_at = c.clicked_at; }
    byUser.set(c.user_id, cur);
  }

  const ids = [...byUser.keys()];
  const users: Record<string, { full_name: string | null; email: string; total_points: number | string }> = {};
  const phones: Record<string, string | null> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const slice = ids.slice(i, i + 200);
    const [{ data: us }, { data: cps }] = await Promise.all([
      service.from("users").select("id, full_name, email, total_points").in("id", slice),
      service.from("company_profiles").select("user_id, phone").in("user_id", slice),
    ]);
    for (const u of (us ?? []) as { id: string; full_name: string | null; email: string; total_points: number | string }[]) users[u.id] = u;
    for (const c of (cps ?? []) as { user_id: string; phone: string | null }[]) phones[c.user_id] = c.phone;
  }

  const people = ids.map((id) => ({
    user_id: id,
    full_name: users[id]?.full_name ?? null,
    email: users[id]?.email ?? "",
    phone: phones[id] ?? null,
    points: Number(users[id]?.total_points ?? 0),
    ...byUser.get(id)!,
  })).sort((a, b) => (b.answered_at ?? b.seen_at ?? "").localeCompare(a.answered_at ?? a.seen_at ?? ""));

  return NextResponse.json({
    ok: true,
    enabled: (setting as { value?: string } | null)?.value === "true",
    totals: {
      seen: people.length,
      pagar: people.filter((p) => p.answer === "mentoria_pagar").length,
      hablar: people.filter((p) => p.answer === "mentoria_hablar").length,
      no: people.filter((p) => p.answer === "mentoria_no").length,
      sin_respuesta: people.filter((p) => !p.answer).length,
    },
    people,
  });
}

export async function POST(req: NextRequest) {
  const service = await requireAdmin();
  if (!service) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
  const { error } = await service.from("app_settings").upsert(
    { key: MENTORIA_SETTING, value: body.enabled ? "true" : "false", updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
  return NextResponse.json({ ok: true, enabled: body.enabled === true });
}
