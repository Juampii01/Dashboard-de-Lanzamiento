import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/viewer";
import { getUserProgram } from "@/lib/program-server";
import { CERT_NAME_MAX, callVerify, completionDate, isCertificatesEnabled } from "@/lib/certificates";
import { sendCertificateEmail } from "@/lib/email/send-certificate-email";

type Claim = { certificate_number: string; full_name: string; first_name: string | null; last_name: string; issue_date: string; verify_url: string | null; created_at: string };

async function loadState(userId: string) {
  const db = createServiceClient();
  const [{ data: day4 }, { data: claim }, { data: u }] = await Promise.all([
    db.from("day_progress").select("is_completed, completed_at").eq("user_id", userId).eq("day_number", 4).maybeSingle(),
    db.from("certificate_claims").select("certificate_number, full_name, first_name, last_name, issue_date, verify_url, created_at").eq("user_id", userId).maybeSingle(),
    db.from("users").select("full_name, email").eq("id", userId).maybeSingle(),
  ]);
  const d4 = day4 as { is_completed?: boolean; completed_at?: string | null } | null;
  return {
    eligible: d4?.is_completed === true,
    day4CompletedAt: d4?.completed_at ?? null,
    claim: (claim as Claim | null) ?? null,
    user: u as { full_name: string | null; email: string | null } | null,
  };
}

// GET → estado del certificado del participante (o del anfitrión si es viewer).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const actor = await getActor(user.id);
  const s = await loadState(actor.userId);
  return NextResponse.json({ eligible: s.eligible, claim: s.claim, fullName: s.user?.full_name ?? null, isViewer: actor.isViewer });
}

// POST → emite el certificado (una sola vez) en verify.govbidder.net y lo manda por email.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const actor = await getActor(user.id);
  if (actor.isViewer) return NextResponse.json({ error: "viewer_read_only" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { first_name?: string; last_name?: string; full_name?: string };
  const first = String(body.first_name ?? "").replace(/\s+/g, " ").trim();
  const last = String(body.last_name ?? "").replace(/\s+/g, " ").trim();
  const full = String(body.full_name ?? "").replace(/\s+/g, " ").trim();
  if (!first || !last) return NextResponse.json({ error: "missing_names", message: "Escribe tu nombre y tu apellido." }, { status: 400 });
  if (!full || full.length > CERT_NAME_MAX) return NextResponse.json({ error: "bad_full_name", message: `El nombre del certificado tiene que tener entre 1 y ${CERT_NAME_MAX} caracteres.` }, { status: 400 });

  const svc = createServiceClient();
  const { data: me } = await svc.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if ((me as { is_admin?: boolean } | null)?.is_admin !== true && !(await isCertificatesEnabled(svc))) {
    return NextResponse.json({ error: "not_enabled", message: "Los certificados todavía no están habilitados." }, { status: 403 });
  }

  const s = await loadState(actor.userId);
  if (!s.eligible) return NextResponse.json({ error: "not_eligible", message: "Primero completa el Día 4." }, { status: 403 });
  if (s.claim) return NextResponse.json({ ok: true, claim: s.claim });
  const email = (s.user?.email ?? user.email ?? "").toLowerCase();
  if (!email) return NextResponse.json({ error: "no_email" }, { status: 400 });

  const program = await getUserProgram(actor.userId);
  const issued = await callVerify({
    action: "issue", email, first_name: first, last_name: last, full_name: full,
    issue_date: completionDate(program, s.day4CompletedAt),
  });
  if (!issued.ok) {
    console.error("[certificate] verify issue falló:", issued.error);
    return NextResponse.json({ error: "issue_failed", message: "No pudimos emitir tu certificado ahora. Intenta de nuevo en unos minutos." }, { status: 502 });
  }

  const db = createServiceClient();
  const row = {
    user_id: actor.userId,
    certificate_number: issued.certificate_number,
    first_name: first,
    last_name: last,
    full_name: issued.full_name ?? full,
    issue_date: issued.issue_date,
    verify_url: issued.verify_url,
  };
  const { error: insErr } = await db.from("certificate_claims").insert(row);
  if (insErr && insErr.code !== "23505") {
    console.error("[certificate] insert claim:", insErr.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const mail = await sendCertificateEmail({
    to: email, name: row.full_name, certificateNumber: row.certificate_number,
    verifyUrl: issued.verify_url, pdfBase64: issued.pdf_base64, filename: issued.filename,
  });
  if (mail.ok) await db.from("certificate_claims").update({ emailed_at: new Date().toISOString() }).eq("user_id", actor.userId);
  else console.error("[certificate] email:", mail.error);

  return NextResponse.json({ ok: true, claim: { ...row, created_at: new Date().toISOString() }, emailed: mail.ok });
}
