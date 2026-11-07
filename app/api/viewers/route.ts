import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/access/purchases";
import { baseUrlForProgram, isProgram } from "@/lib/program";
import { MAX_VIEWERS_PER_USER } from "@/lib/viewer";
import { sendViewerInviteEmail } from "@/lib/email/send-viewer-invite-email";

/**
 * Invitaciones de viewers (cuentas de solo lectura) del participante logueado.
 *
 * GET    → { invites: [{ id, email, status }], max }
 * POST   { email } → crea la invitación y manda el email con el link de registro.
 * DELETE ?id=…     → quita la invitación; si ya se registró, borra su cuenta.
 */
type Host = { id: string; full_name: string | null; email: string | null; program: string | null };

async function getHost() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const db = createServiceClient();
  const { data } = await db
    .from("users")
    .select("id, full_name, email, program, viewer_of, is_admin, is_student, hotmart_transaction_id")
    .eq("id", user.id)
    .maybeSingle();
  const u = data as (Host & { viewer_of: string | null; is_admin: boolean | null; is_student: boolean | null; hotmart_transaction_id: string | null }) | null;
  if (!u || u.viewer_of) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  // Solo quien tiene acceso a la plataforma puede invitar.
  if (!u.is_admin && !u.is_student && !u.hotmart_transaction_id) {
    return { error: NextResponse.json({ error: "no_access" }, { status: 403 }) };
  }
  return { db, host: u as Host };
}

type InviteRow = { id: string; email: string; accepted_at: string | null; created_at: string };

export async function GET() {
  const auth = await getHost();
  if ("error" in auth) return auth.error;
  const { data } = await auth.db
    .from("viewer_invites")
    .select("id, email, accepted_at, created_at")
    .eq("host_id", auth.host.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: true });
  const invites = ((data ?? []) as InviteRow[]).map((r) => ({
    id: r.id,
    email: r.email,
    status: r.accepted_at ? "active" : "pending",
  }));
  return NextResponse.json({ ok: true, invites, max: MAX_VIEWERS_PER_USER });
}

const postSchema = z.object({ email: z.string().trim().email().max(255) });

export async function POST(req: NextRequest) {
  const auth = await getHost();
  if ("error" in auth) return auth.error;
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  const email = normalizeEmail(parsed.data.email);
  const { db, host } = auth;

  if (host.email && normalizeEmail(host.email) === email) {
    return NextResponse.json({ error: "own_email" }, { status: 400 });
  }

  const { count } = await db
    .from("viewer_invites")
    .select("id", { count: "exact", head: true })
    .eq("host_id", host.id)
    .is("revoked_at", null);
  if ((count ?? 0) >= MAX_VIEWERS_PER_USER) return NextResponse.json({ error: "limit" }, { status: 409 });

  // El email no puede tener cuenta (ni estar invitado por otra persona).
  const { data: existingUser } = await db.from("users").select("id").ilike("email", email).maybeSingle();
  if (existingUser) return NextResponse.json({ error: "email_has_account" }, { status: 409 });
  const { data: existingInvite } = await db
    .from("viewer_invites")
    .select("id")
    .ilike("email", email)
    .is("revoked_at", null)
    .maybeSingle();
  if (existingInvite) return NextResponse.json({ error: "already_invited" }, { status: 409 });

  const token = randomBytes(24).toString("base64url");
  const { data: inv, error } = await db
    .from("viewer_invites")
    .insert({ host_id: host.id, email, token })
    .select("id")
    .single();
  if (error) {
    console.error("[viewers] insert:", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const program = isProgram(host.program) ? host.program : "live";
  const inviteUrl = `${baseUrlForProgram(program)}/registro/invitado?token=${token}`;
  const sent = await sendViewerInviteEmail({ to: email, hostName: host.full_name, inviteUrl });
  if (!sent.ok) {
    // Sin email no sirve la invitación: se deshace para que pueda reintentar.
    await db.from("viewer_invites").delete().eq("id", (inv as { id: string }).id);
    console.error("[viewers] email:", sent.error);
    return NextResponse.json({ error: "email_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await getHost();
  if ("error" in auth) return auth.error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { db, host } = auth;

  const { data } = await db
    .from("viewer_invites")
    .select("id, accepted_user_id")
    .eq("id", id)
    .eq("host_id", host.id)
    .is("revoked_at", null)
    .maybeSingle();
  const inv = data as { id: string; accepted_user_id: string | null } | null;
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.from("viewer_invites").update({ revoked_at: new Date().toISOString() }).eq("id", inv.id);
  if (inv.accepted_user_id) {
    // Solo se borra si de verdad es un viewer de este anfitrión.
    const { data: v } = await db.from("users").select("viewer_of").eq("id", inv.accepted_user_id).maybeSingle();
    if ((v as { viewer_of?: string | null } | null)?.viewer_of === host.id) {
      await db.auth.admin.deleteUser(inv.accepted_user_id); // borra también public.users (cascade)
    }
  }
  return NextResponse.json({ ok: true });
}
