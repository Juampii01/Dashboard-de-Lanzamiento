import type { SupabaseClient } from "@supabase/supabase-js";

// ── Configuración (un único lugar) ──────────────────────────────────────────
/** XP que gana el referidor por cada lead verificado. Santo la calibra. */
export const REFERRAL_LEAD_XP = 25;
/** Tope de referidos que suman al ranking por referidor. 0 = sin límite. */
export const REFERRAL_CAP = 0;

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin 0/O, 1/I/L

export function generateReferralCode(len = 8): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Link de referido del usuario. La landing de GHL se configura por env var. */
export function referralLink(code: string): string {
  const base = (process.env.NEXT_PUBLIC_LANDING_URL || "https://govbidder.net").replace(/\/+$/, "");
  return `${base}/?ref=${code}`;
}

/**
 * Devuelve el referral_code del usuario; si no tiene (usuario nuevo creado
 * después de la migración), lo genera y persiste de forma idempotente.
 * Usar con cliente service-role.
 */
export async function getOrCreateReferralCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: SupabaseClient<any>,
  userId: string
): Promise<string | null> {
  const { data } = await service
    .from("users")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle();
  const existing = (data as { referral_code?: string | null } | null)?.referral_code;
  if (existing) return existing;

  for (let i = 0; i < 6; i++) {
    const code = generateReferralCode();
    // Solo setea si sigue null (evita pisar un código asignado en paralelo).
    const { error } = await service
      .from("users")
      .update({ referral_code: code } as Record<string, unknown>)
      .eq("id", userId)
      .is("referral_code", null);
    if (!error) {
      const { data: re } = await service
        .from("users")
        .select("referral_code")
        .eq("id", userId)
        .maybeSingle();
      const c = (re as { referral_code?: string | null } | null)?.referral_code;
      if (c) return c;
    }
    // colisión de código (23505) → reintenta con otro
  }
  return null;
}
