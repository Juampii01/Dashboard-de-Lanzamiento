import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/register-viewer  (público, con token de invitación)
 *
 * Crea una cuenta de solo lectura (viewer) para quien recibió la invitación.
 * El email sale de la invitación, no del formulario. La cuenta queda con
 * users.viewer_of y app_metadata.viewer_of = anfitrión: el middleware lee el
 * JWT y bloquea cualquier escritura.
 */
export const maxDuration = 30;

const schema = z.object({
  token: z.string().min(10).max(200),
  full_name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(72),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return NextResponse.json({ error: field === "password" ? "weak_password" : "invalid_data" }, { status: 400 });
  }
  const { token, full_name, password } = parsed.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as unknown as SupabaseClient<any, any, any>;

  const { data: invRow } = await db
    .from("viewer_invites")
    .select("id, host_id, email, accepted_at, revoked_at")
    .eq("token", token)
    .maybeSingle();
  const inv = invRow as { id: string; host_id: string; email: string; accepted_at: string | null; revoked_at: string | null } | null;
  if (!inv || inv.revoked_at) return NextResponse.json({ error: "invalid_invite" }, { status: 404 });
  if (inv.accepted_at) return NextResponse.json({ error: "already_used" }, { status: 409 });

  const { data: hostRow } = await db.from("users").select("id, program, viewer_of").eq("id", inv.host_id).maybeSingle();
  const host = hostRow as { id: string; program: string | null; viewer_of: string | null } | null;
  if (!host || host.viewer_of) return NextResponse.json({ error: "invalid_invite" }, { status: 404 });

  const email = inv.email.trim().toLowerCase();
  const { data: existing } = await db.from("users").select("id").ilike("email", email).maybeSingle();
  if (existing) return NextResponse.json({ error: "email_exists" }, { status: 409 });

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: full_name, full_name },
    app_metadata: { viewer_of: host.id },
  });
  if (createError || !created?.user) {
    const msg = createError?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) return NextResponse.json({ error: "email_exists" }, { status: 409 });
    if (msg.includes("password")) return NextResponse.json({ error: "weak_password" }, { status: 400 });
    console.error("[auth/register-viewer] createUser:", createError?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  const userId = created.user.id;

  // El trigger handle_new_user ya creó la fila en public.users.
  const { error: updErr } = await db
    .from("users")
    .update({ full_name, viewer_of: host.id, program: host.program ?? "live", has_seen_onboarding: true })
    .eq("id", userId);
  if (updErr) {
    await db.auth.admin.deleteUser(userId);
    console.error("[auth/register-viewer] update:", updErr.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  await db
    .from("viewer_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_user_id: userId })
    .eq("id", inv.id);

  return NextResponse.json({ ok: true, email });
}
