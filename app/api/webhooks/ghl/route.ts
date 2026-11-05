import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { LIVE_PRODUCT, ONDEMAND_PRODUCT, programForProduct } from "@/lib/program";
import { autoClaimByAccountEmail } from "@/lib/access/purchases";
import { isPaidStatus, parseGhlPurchase } from "@/lib/ghl";
import { sendWelcomeEmail } from "@/lib/email/send-welcome-email";
import { sendAccessActivatedEmail } from "@/lib/email/send-access-activated-email";

/**
 * POST /api/webhooks/ghl?product=ondemand|live
 *
 * Webhook del workflow de GoHighLevel (Stripe → GHL → aquí). Por cada compra:
 *
 *   1. Guarda el payload crudo en webhook_logs (siempre, aunque falle algo).
 *   2. Lee email, nombre e id de transacción (lib/ghl.ts, lectura tolerante).
 *   3. Registra la compra en purchases (source "ghl", sin duplicar).
 *   4. Si ya existe una cuenta con ese email (en verificación o vencida) → le
 *      vincula la compra y le avisa que su acceso está activo.
 *      Si no existe → le manda el email de bienvenida con el link de registro.
 *
 * Autenticación: header `x-webhook-secret` (o `?token=` si el workflow no
 * permite headers) igual a GHL_WEBHOOK_SECRET.
 *
 * `product` en la URL: "ondemand" (versión grabada) o "live" (ticket del en
 * vivo actual). El mismo endpoint sirve para los dos.
 *
 * `welcome=0` en la URL: no envía el email de bienvenida a quien todavía no
 * tiene cuenta (para workflows de GHL que ya mandan su propio email con el
 * link de registro). El aviso de "acceso activo" a cuentas en verificación se
 * envía igual.
 *
 * Respuestas: 200 cuando el webhook quedó guardado (aunque no se pudiera leer
 * la compra: queda el error en webhook_logs para revisarlo a mano), 500 solo si
 * no se pudo guardar nada (GHL reintenta).
 */
export const maxDuration = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

const PRODUCTS: Record<string, string> = { ondemand: ONDEMAND_PRODUCT, live: LIVE_PRODUCT };

/** Headers que no se guardan (credenciales / ruido). */
const SKIP_HEADERS = new Set(["x-webhook-secret", "authorization", "cookie", "x-vercel-oidc-token"]);

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  const secret = process.env.GHL_WEBHOOK_SECRET ?? "";
  if (secret.length < 16) {
    console.error("[ghl] GHL_WEBHOOK_SECRET no configurada");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const given = req.headers.get("x-webhook-secret") ?? req.nextUrl.searchParams.get("token") ?? "";
  if (!safeEqual(given, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const productKey = (req.nextUrl.searchParams.get("product") ?? "").toLowerCase();
  const product = PRODUCTS[productKey] ?? null;
  const sendWelcome = req.nextUrl.searchParams.get("welcome") !== "0";

  const raw = await req.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null; // queda en raw_body
  }

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    if (!SKIP_HEADERS.has(k.toLowerCase())) headers[k] = v;
  });

  const db = createServiceClient() as unknown as Db;

  // 1. Guardar siempre el payload crudo.
  const { data: logRow, error: logErr } = await db
    .from("webhook_logs")
    .insert({
      source: "ghl",
      product,
      headers,
      body,
      raw_body: body === null ? raw.slice(0, 100_000) : null,
      error: product ? null : `product inválido: "${productKey}"`,
    })
    .select("id")
    .single();
  if (logErr || !logRow) {
    console.error("[ghl] insert webhook_logs:", logErr?.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  const logId = (logRow as { id: string }).id;
  const finish = async (patch: Record<string, unknown>, res: Record<string, unknown>) => {
    await db.from("webhook_logs").update({ ...patch, processed_at: new Date().toISOString() }).eq("id", logId);
    return NextResponse.json({ ok: true, ...res });
  };

  if (!product) return finish({ processed: false }, { logged: true, processed: false, reason: "invalid_product" });

  // 2. Leer la compra.
  const parsed = parseGhlPurchase(body);
  if ("error" in parsed) {
    return finish({ processed: false, error: parsed.error }, { logged: true, processed: false, reason: "unreadable" });
  }
  if (!isPaidStatus(parsed.status)) {
    return finish(
      { processed: false, email: parsed.email, error: `estado de pago no confirmado: "${parsed.status}"` },
      { logged: true, processed: false, reason: "not_paid" },
    );
  }

  // 3. Registrar la compra (sin duplicar: UNIQUE(product,email) y (source,external_ref)).
  const { error: upErr } = await db
    .from("purchases")
    .upsert(
      {
        email: parsed.email,
        full_name: parsed.fullName,
        source: "ghl",
        external_ref: parsed.externalRef,
        product,
        notes: "Webhook de GoHighLevel",
      },
      { onConflict: "product,email", ignoreDuplicates: true },
    );
  if (upErr && upErr.code !== "23505") {
    console.error("[ghl] upsert purchase:", upErr.message);
    return finish({ processed: false, email: parsed.email, error: `purchases: ${upErr.message}` }, { logged: true, processed: false, reason: "db_error" });
  }
  const { data: purchase } = await db
    .from("purchases")
    .select("id, claimed_by")
    .eq("product", product)
    .eq("email", parsed.email)
    .maybeSingle();
  const p = purchase as { id: string; claimed_by: string | null } | null;

  // 4. ¿Ya tiene cuenta?
  const program = programForProduct(product);
  const { data: account } = await db
    .from("users")
    .select("id, full_name, is_admin")
    .ilike("email", parsed.email)
    .maybeSingle();
  const acc = account as { id: string; full_name: string | null; is_admin: boolean | null } | null;

  type Action = "welcome_sent" | "purchase_recorded" | "access_activated" | "already_active" | "purchase_taken" | "admin_account" | "email_failed";
  let action: Action;
  if (!acc && !sendWelcome) {
    // Sin cuenta, y el workflow de GHL ya manda su propio email de bienvenida.
    action = "purchase_recorded";
  } else if (!acc) {
    // Sin cuenta: email con el link de registro del programa.
    const sent = await sendWelcomeEmail({ to: parsed.email, name: parsed.fullName, program });
    action = sent.ok ? "welcome_sent" : "email_failed";
    if (!sent.ok) console.warn("[ghl] bienvenida no enviada:", sent.error);
  } else if (acc.is_admin) {
    action = "admin_account";
  } else if (p?.claimed_by === acc.id) {
    action = "already_active";
  } else {
    // Cuenta existente (en verificación, vencida o de otro programa): se le
    // vincula la compra y se le avisa.
    const r = await autoClaimByAccountEmail(db, acc.id, parsed.email, [product]);
    if (r === "claimed") {
      const sent = await sendAccessActivatedEmail({ to: parsed.email, name: acc.full_name ?? parsed.fullName, program });
      action = sent.ok ? "access_activated" : "email_failed";
    } else {
      action = r === "already_mine" ? "already_active" : "purchase_taken";
    }
  }

  return finish(
    {
      processed: true,
      email: parsed.email,
      purchase_id: p?.id ?? null,
      error:
        action === "email_failed" ? "compra registrada, pero no se pudo enviar el email"
        : action === "purchase_taken" ? "la compra ya está vinculada a otra cuenta o la cuenta ya tiene una de este producto"
        : null,
    },
    { logged: true, processed: true, action },
  );
}
