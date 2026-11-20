import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getRank, RANKS } from "@/lib/ranks";
import { canJoinRifa, RIFA_SETTING } from "@/lib/rifa";

export const dynamic = "force-dynamic";

/**
 * Rifa en vivo — panel admin (/admin/sorteo).
 *
 * Pool de cada premio: quienes tocaron "¡Quiero participar!" (rifa_participants),
 * siguen siendo elegibles (en vivo, no admin/estudiante/viewer, con compra),
 * no están en rifa_excluded (pueden anotarse pero tienen 0% de chances),
 * todavía no ganaron nada en la rifa, y cuyo rango ACTUAL es el del premio.
 * Elevate y Prime sortean ponderado por puntos (más puntos = más chances,
 * nadie con 0); Legacy y Expert, todos con la misma chance. Se sortea de a un
 * ganador por vez hasta completar los lugares del rango (lib/ranks.ts).
 */

const WEIGHTED = new Set(["elevate", "prime"]);

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return { error: "forbidden" as const, status: 403 };
  return { service, adminId: user.id };
}

type Svc = ReturnType<typeof createServiceClient>;
type UserRow = {
  id: string; full_name: string | null; email: string; total_points: number | string;
  program: string | null; is_admin: boolean | null; is_student: boolean | null;
  viewer_of: string | null; hotmart_transaction_id: string | null;
};

async function loadState(service: Svc) {
  const [{ data: setting }, { data: parts }, { data: winners }, { data: mentors }, { data: excludedRows }] = await Promise.all([
    service.from("app_settings").select("value").eq("key", RIFA_SETTING).maybeSingle(),
    service.from("rifa_participants").select("user_id, joined_at"),
    service.from("rifa_winners").select("rank_key, position, user_id, points_at_draw, drawn_at").order("position"),
    service.from("sorteo_mentorship_buyers").select("email"),
    service.from("rifa_excluded").select("email, reason, created_at").order("created_at", { ascending: false }),
  ]);
  const participantRows = (parts ?? []) as { user_id: string; joined_at: string }[];
  const winnerRows = (winners ?? []) as { rank_key: string; position: number; user_id: string; points_at_draw: number | string | null; drawn_at: string }[];
  const ids = [...new Set([...participantRows.map((p) => p.user_id), ...winnerRows.map((w) => w.user_id)])];

  const users: Record<string, UserRow> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await service
      .from("users")
      .select("id, full_name, email, total_points, program, is_admin, is_student, viewer_of, hotmart_transaction_id")
      .in("id", ids.slice(i, i + 200));
    for (const u of (data ?? []) as UserRow[]) users[u.id] = u;
  }
  const mentorEmails = new Set(((mentors ?? []) as { email: string }[]).map((m) => m.email.toLowerCase()));
  const excluded = (excludedRows ?? []) as { email: string; reason: string | null; created_at: string }[];
  const excludedEmails = new Set(excluded.map((e) => e.email.toLowerCase()));
  const wonIds = new Set(winnerRows.map((w) => w.user_id));

  const participants = participantRows
    .map((p) => {
      const u = users[p.user_id];
      if (!u) return null;
      const points = Number(u.total_points ?? 0);
      const email = (u.email || "").toLowerCase();
      const isExcluded = excludedEmails.has(email);
      const eligible = canJoinRifa(u) && !mentorEmails.has(email) && !isExcluded;
      return { id: u.id, full_name: u.full_name, email: u.email, points, rank: getRank(points).key, joined_at: p.joined_at, eligible, excluded: isExcluded, won: wonIds.has(u.id) };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.points - a.points);

  return { enabled: (setting as { value?: string } | null)?.value === "true", participants, winnerRows, users, excluded };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { enabled, participants, winnerRows, users, excluded } = await loadState(auth.service);

  // Nombre de cada excluido (si tiene cuenta) para mostrarlo en el panel.
  const exEmails = excluded.map((e) => e.email);
  const names: Record<string, string | null> = {};
  if (exEmails.length) {
    const { data } = await auth.service.from("users").select("email, full_name").in("email", exEmails);
    for (const u of (data ?? []) as { email: string; full_name: string | null }[]) names[u.email.toLowerCase()] = u.full_name;
  }
  const excludedOut = excluded.map((e) => ({ ...e, full_name: names[e.email.toLowerCase()] ?? null }));

  const ranks = RANKS.map((r) => ({
    key: r.key,
    name: r.short,
    emoji: r.emoji,
    color: r.color,
    prize: r.prize,
    target: r.winners,
    pool: participants.filter((p) => p.eligible && !p.won && p.rank === r.key).length,
    winners: winnerRows
      .filter((w) => w.rank_key === r.key)
      .map((w) => ({
        position: w.position,
        full_name: users[w.user_id]?.full_name ?? null,
        email: users[w.user_id]?.email ?? "",
        points: Number(w.points_at_draw ?? users[w.user_id]?.total_points ?? 0),
        drawn_at: w.drawn_at,
      })),
  }));

  return NextResponse.json({ ok: true, enabled, participants, ranks, excluded: excludedOut });
}

function weightedPick(pool: { id: string; points: number }[], weighted: boolean): string {
  if (!weighted) return pool[Math.floor(Math.random() * pool.length)].id;
  // A-Res: key = U^(1/peso); gana la key más alta. Peso mínimo 1.
  let best = pool[0].id;
  let bestKey = -1;
  for (const p of pool) {
    const k = Math.pow(Math.random(), 1 / Math.max(1, p.points));
    if (k > bestKey) { bestKey = k; best = p.id; }
  }
  return best;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await req.json().catch(() => ({}))) as { action?: string; enabled?: boolean; rankKey?: string; email?: string; reason?: string };

  if (body.action === "exclude" || body.action === "unexclude") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "bad_email", message: "Email inválido." }, { status: 400 });
    if (body.action === "unexclude") {
      const { error } = await auth.service.from("rifa_excluded").delete().eq("email", email);
      if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    const { data: u } = await auth.service.from("users").select("full_name").ilike("email", email).maybeSingle();
    const { error } = await auth.service.from("rifa_excluded").upsert(
      { email, reason: String(body.reason ?? "").trim().slice(0, 200) || null, created_by: auth.adminId },
      { onConflict: "email" },
    );
    if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
    return NextResponse.json({ ok: true, full_name: (u as { full_name?: string } | null)?.full_name ?? null, has_account: !!u });
  }

  if (body.action === "toggle") {
    const value = body.enabled ? "true" : "false";
    const { error } = await auth.service
      .from("app_settings")
      .upsert({ key: RIFA_SETTING, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
    return NextResponse.json({ ok: true, enabled: body.enabled === true });
  }

  if (body.action === "reset") {
    // Para el simulacro: borra participantes y ganadores y apaga el banner.
    const a = await auth.service.from("rifa_winners").delete().not("id", "is", null);
    const b = await auth.service.from("rifa_participants").delete().not("user_id", "is", null);
    const c = await auth.service.from("app_settings").upsert({ key: RIFA_SETTING, value: "false", updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (a.error || b.error || c.error) return NextResponse.json({ error: "internal" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "draw") {
    const rank = RANKS.find((r) => r.key === body.rankKey);
    if (!rank) return NextResponse.json({ error: "bad_rank" }, { status: 400 });

    const { participants, winnerRows } = await loadState(auth.service);
    const already = winnerRows.filter((w) => w.rank_key === rank.key).length;
    if (already >= rank.winners) {
      return NextResponse.json({ error: "complete", message: `Ya están los ${rank.winners} ganadores de ${rank.short}.` }, { status: 409 });
    }
    const pool = participants.filter((p) => p.eligible && !p.won && p.rank === rank.key);
    if (pool.length === 0) {
      return NextResponse.json({ error: "empty", message: `No quedan participantes en ${rank.short}.` }, { status: 409 });
    }

    const winnerId = weightedPick(pool, WEIGHTED.has(rank.key));
    const winner = pool.find((p) => p.id === winnerId)!;
    const position = already + 1;
    const { error } = await auth.service.from("rifa_winners").insert({
      rank_key: rank.key, position, user_id: winnerId, points_at_draw: winner.points, drawn_by: auth.adminId,
    });
    if (error) {
      // 23505: doble click / dos admins a la vez → no se duplica nada.
      if (error.code === "23505") return NextResponse.json({ error: "conflict", message: "Ese lugar ya se sorteó. Actualiza la página." }, { status: 409 });
      console.error("[admin/rifa draw]", error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, position, winner: { full_name: winner.full_name, email: winner.email, points: winner.points } });
  }

  return NextResponse.json({ error: "bad_action" }, { status: 400 });
}
