import { NextResponse } from "next/server";
import {
  verifyHotmartSignature,
  validateHotmartTimestamp,
  type HotmartWebhookPayload,
} from "@/lib/hotmart";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { CURRENT_PRODUCT, autoClaimByAccountEmail, normalizeEmail } from "@/lib/access/purchases";
import { sendAccessActivatedEmail } from "@/lib/email/send-access-activated-email";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-hotmart-webhook-token");

  // ── C7: HMAC verification ────────────────────────────────────────────────
  if (!verifyHotmartSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: HotmartWebhookPayload;
  try {
    body = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── C7: Timestamp / replay-attack prevention ─────────────────────────────
  if (!validateHotmartTimestamp(body)) {
    console.warn("[hotmart] Webhook rejected: timestamp outside ±5 min window");
    return NextResponse.json(
      { error: "Timestamp out of allowed window" },
      { status: 401 }
    );
  }

  // Solo procesar compras aprobadas
  if (
    body.event !== "PURCHASE_APPROVED" &&
    body.event !== "PURCHASE_COMPLETE"
  ) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { name } = body.data.buyer;
  const email = normalizeEmail(body.data.buyer.email);
  const { transaction } = body.data.purchase;

  // Ahora el webhook solo REGISTRA LA COMPRA. La cuenta la crea el comprador
  // en /registro con email y contraseña; si se registra con este mismo email,
  // el acceso se activa solo. Si ya se había registrado y estaba en
  // verificación, se vincula ahora.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as unknown as SupabaseClient<any, any, any>;

  const { error: insErr } = await db
    .from("purchases")
    .upsert(
      { email, full_name: name ?? null, source: "hotmart", external_ref: transaction ?? null, product: CURRENT_PRODUCT },
      { onConflict: "product,email", ignoreDuplicates: true }
    );
  if (insErr) {
    console.error("[hotmart] insert purchase:", insErr.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const { data: account } = await db
    .from("users")
    .select("id, full_name, access_status, hotmart_transaction_id")
    .eq("email", email)
    .maybeSingle();
  const acc = account as { id: string; full_name: string | null; access_status: string | null; hotmart_transaction_id: string | null } | null;
  if (acc && !acc.hotmart_transaction_id && acc.access_status === "pending") {
    const r = await autoClaimByAccountEmail(db, acc.id, email);
    if (r === "claimed") await sendAccessActivatedEmail({ to: email, name: acc.full_name });
  }

  return NextResponse.json({ ok: true });
}
