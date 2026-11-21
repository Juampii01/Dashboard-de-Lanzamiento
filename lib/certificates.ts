/**
 * Certificado de finalización. Se emite en verify.govbidder.net (otro proyecto,
 * otra base) mediante /api/integration/challenge, autenticado con el secreto
 * compartido CHALLENGE_INTEGRATION_SECRET. Acá solo guardamos el número.
 */
import type { Program } from "@/lib/program";

import type { SupabaseClient } from "@supabase/supabase-js";

export const CERT_NAME_MAX = 45;
/** app_settings: la pestaña Certificado solo la ven los participantes cuando el equipo la habilita. Los admins la ven siempre. */
export const CERT_SETTING = "certificates_enabled";

/** IDs de usuarios con el certificado habilitado antes que el resto (separados por coma). */
export const CERT_EARLY_SETTING = "certificates_early_users";

export async function isCertificatesEnabled(db: SupabaseClient, userId?: string): Promise<boolean> {
  const { data } = await db.from("app_settings").select("key, value").in("key", [CERT_SETTING, CERT_EARLY_SETTING]);
  const rows = (data ?? []) as { key: string; value: string | null }[];
  if (rows.find((r) => r.key === CERT_SETTING)?.value === "true") return true;
  if (!userId) return false;
  const early = rows.find((r) => r.key === CERT_EARLY_SETTING)?.value ?? "";
  return early.split(",").map((x) => x.trim()).includes(userId);
}
/** Fecha de finalización del Challenge en vivo de noviembre (va impresa en el certificado). */
export const LIVE_COMPLETION_DATE = "2026-11-20";

export type VerifyCert = {
  ok: true;
  certificate_number: string;
  full_name: string;
  issue_date: string;
  verify_url: string;
  filename: string;
  pdf_base64: string;
};

export async function callVerify(body: Record<string, unknown>): Promise<VerifyCert | { ok: false; error: string; status: number }> {
  const base = (process.env.CERT_VERIFY_URL || "https://verify.govbidder.net").replace(/\/$/, "");
  const secret = process.env.CHALLENGE_INTEGRATION_SECRET;
  if (!secret) return { ok: false, error: "not_configured", status: 500 };
  try {
    const r = await fetch(`${base}/api/integration/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-integration-secret": secret },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) return { ok: false, error: String(d.error ?? "verify_error"), status: r.status };
    return d as VerifyCert;
  } catch {
    return { ok: false, error: "verify_unreachable", status: 502 };
  }
}

/** Fecha de finalización: en vivo, el cierre del challenge; on demand, el día que completó el Día 4. */
export function completionDate(program: Program, day4CompletedAt: string | null): string {
  if (program === "ondemand" && day4CompletedAt) return day4CompletedAt.slice(0, 10);
  return LIVE_COMPLETION_DATE;
}
