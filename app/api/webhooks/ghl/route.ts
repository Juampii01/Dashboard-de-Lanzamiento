import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { LIVE_PRODUCT, ONDEMAND_PRODUCT } from "@/lib/program";

/**
 * POST /api/webhooks/ghl?product=ondemand|live
 *
 * Webhook del workflow de GoHighLevel (Stripe → GHL → aquí).
 *
 * ETAPA ACTUAL: solo registra. Guarda el payload crudo en webhook_logs y
 * responde 200. No crea compras todavía: el formato del payload de GHL se
 * mapea cuando llegue la primera compra de prueba real (ver el plan
 * challenge/plan-ondemand-y-challenge-2026-11-02, Fase 3B).
 *
 * Autenticación: header `x-webhook-secret` (o `?token=` si el workflow no
 * permite headers) igual a GHL_WEBHOOK_SECRET.
 *
 * `product` en la URL: "ondemand" (versión grabada) o "live" (ticket del en
 * vivo actual). El mismo endpoint sirve para los dos.
 */
export const maxDuration = 15;

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
  const { error } = await db.from("webhook_logs").insert({
    source: "ghl",
    product,
    headers,
    body,
    raw_body: body === null ? raw.slice(0, 100_000) : null,
    error: product ? null : `product inválido: "${productKey}"`,
  });
  if (error) {
    console.error("[ghl] insert webhook_logs:", error.message);
    // 500 → GHL reintenta y no se pierde la compra.
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, logged: true });
}
