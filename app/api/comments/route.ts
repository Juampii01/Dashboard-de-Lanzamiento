import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/comments   — listado (requiere sesión para saber qué "hidden" mostrar)
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
 *
 * Hilos de respuesta (migración 20260702000001_comments_replies.sql):
 * alter table program_comments add column if not exists parent_id uuid
 *   references program_comments(id) on delete cascade;
 *
 * Reglas de respuesta: un admin puede responder CUALQUIER comentario (todos lo
 * ven); un usuario normal solo puede responder SU PROPIO comentario. Las
 * respuestas no otorgan puntos (solo el comentario original, primeras 3 veces).
 *
 * Shadow-ban de datos de contacto (migración 20260702000002_comments_shadow_ban.sql):
 * alter table program_comments add column if not exists hidden boolean not null default false;
 * Si el contenido tiene teléfono/email/link, se publica igual (el autor lo ve
 * como cualquier otro) pero queda oculto para el resto — así cree que nadie le
 * respondió, en vez de que "lo bloquearon".
 */

// Teléfono, email, o link/página web dentro del texto → se oculta para todos
// menos el propio autor (y los admins, para moderar).
function looksLikeContactInfo(text: string): boolean {
  // Email
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return true;
  // URL explícita o con "www."
  if (/https?:\/\/\S+/i.test(text)) return true;
  if (/\bwww\.[a-z0-9-]+\.[a-z]{2,}/i.test(text)) return true;
  // Dominio "pelado" (ej. instagram.com/algo, miweb.com)
  if (/\b[a-z0-9-]+\.(com|net|org|io|co|us|mx|es|ar|info|biz|me|app|dev|net\.co)\b/i.test(text)) return true;
  // Teléfono: corrida de 7+ dígitos con separadores típicos (+, espacios, guiones, paréntesis)
  const phoneLike = text.match(/(\+?\d[\d\s().-]{6,}\d)/g) ?? [];
  for (const m of phoneLike) {
    if (m.replace(/[^\d]/g, "").length >= 7) return true;
  }
  return false;
}

// GET — all comments (+ replies), newest first. Filtra los "hidden" salvo que
// sean del propio usuario que pregunta, o el que pregunta sea admin.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const service = createServiceClient();

  let { data, error } = await service
    .from("program_comments")
    .select("id, user_id, display_name, content, created_at, parent_id, hidden")
    .order("created_at", { ascending: false });

  // Columnas nuevas todavía no existen (falta correr alguna migración) →
  // reintenta sin ellas para no romper el listado.
  if (error && /(parent_id|hidden)/i.test(error.message)) {
    const retry = await service
      .from("program_comments")
      .select("id, user_id, display_name, content, created_at")
      .order("created_at", { ascending: false });
    data = (retry.data ?? []).map((c) => ({ ...c, parent_id: null, hidden: false })) as typeof data;
    error = retry.error;
  }

  // Table doesn't exist yet → graceful 501
  if (error?.code === "42P01") {
    return NextResponse.json({ error: "table_not_found" }, { status: 501 });
  }
  if (error) {
    console.error("[comments GET]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{ user_id: string; hidden?: boolean; [k: string]: unknown }>;

  // Marcar qué autores son admin (badge "Equipo") y si quien pregunta es admin.
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const adminSet = new Set<string>();
  if (userIds.length) {
    const { data: admins } = await service.from("users").select("id, is_admin").in("id", userIds);
    for (const u of (admins ?? []) as Array<{ id: string; is_admin?: boolean }>) {
      if (u.is_admin) adminSet.add(u.id);
    }
  }
  const callerIsAdmin = !!user && adminSet.has(user.id);

  const visible = rows.filter((r) => !r.hidden || r.user_id === user?.id || callerIsAdmin);
  const comments = visible.map((r) => ({ ...r, author_is_admin: adminSet.has(r.user_id) }));

  // Ya vienen ordenados del más nuevo al más viejo (created_at desc); el
  // frontend los pinta tal cual, de arriba hacia abajo.
  return NextResponse.json({ comments });
}

// POST — insert a new comment or a reply
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { content?: string; parent_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const content = body.content?.trim() ?? "";
  if (!content || content.length > 500) {
    return NextResponse.json({ error: "invalid_content" }, { status: 400 });
  }
  const parentId = body.parent_id ? String(body.parent_id).trim() : null;

  const service = createServiceClient();
  const { data: profile } = await service
    .from("users")
    .select("full_name, total_points, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin === true;

  // Si es una respuesta: admin puede responder cualquier comentario; un usuario
  // normal solo puede responder EL SUYO PROPIO.
  if (parentId) {
    const { data: parent } = await service
      .from("program_comments")
      .select("id, user_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent) {
      return NextResponse.json({ error: "parent_not_found" }, { status: 404 });
    }
    const p = parent as { user_id: string };
    if (!isAdmin && p.user_id !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const displayName =
    (profile?.full_name as string | null | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Participante";

  // Sobre 10.000 pts, add_points acredita la mitad. Replicamos la regla para que
  // el delta devuelto (y el toast) reflejen lo realmente acreditado, no el bruto.
  const priorTotal = Number((profile as { total_points?: number | null } | null)?.total_points ?? 0);

  // Shadow-ban: si trae teléfono/email/link, se guarda igual pero oculto para
  // todos menos el autor — la respuesta al frontend es IDÉNTICA a la normal
  // (nada delata que fue detectado), así el autor cree que se publicó bien.
  const shouldHide = !isAdmin && looksLikeContactInfo(content);

  const basePayload: Record<string, unknown> = {
    user_id: user.id,
    display_name: displayName,
    content,
    ...(shouldHide ? { hidden: true } : {}),
  };

  let insErr = (
    await service.from("program_comments").insert(
      parentId ? { ...basePayload, parent_id: parentId } : basePayload
    )
  ).error;

  // Columna parent_id todavía no existe → si era una respuesta, no hay forma de
  // guardar el hilo correctamente; avisamos en vez de publicarla como comentario
  // suelto (perdería el contexto de a quién respondía).
  if (insErr && parentId && /parent_id/i.test(insErr.message)) {
    return NextResponse.json({ error: "replies_not_ready" }, { status: 501 });
  }
  // Columna hidden todavía no existe → reintenta sin marcar (queda visible para
  // todos hasta que se corra la migración; mejor eso que romper el POST).
  if (insErr && shouldHide && /hidden/i.test(insErr.message)) {
    insErr = (
      await service.from("program_comments").insert(
        parentId ? { user_id: user.id, display_name: displayName, content, parent_id: parentId } : { user_id: user.id, display_name: displayName, content }
      )
    ).error;
  }

  if (insErr?.code === "42P01") {
    return NextResponse.json({ error: "table_not_found" }, { status: 501 });
  }
  if (insErr) {
    console.error("[comments POST]", insErr.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Las respuestas y los comentarios ocultos NO otorgan puntos — solo el
  // comentario original de primer nivel y visible, hasta 3 veces.
  let awarded = false;
  let delta = 0;
  let total: number | null = null;

  if (!parentId && !shouldHide) {
    const MAX_REWARDED = 3;
    const REWARD = 200;

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
        delta = priorTotal >= 10000 ? Math.floor(REWARD / 2) : REWARD;
        total = newTotal as number;
      }
    }
  }

  return NextResponse.json({ ok: true, awarded, delta, total });
}
