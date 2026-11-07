/**
 * Segundo participante pago (seat_requests). Ver la migración 20261107000003.
 * El sector aparece en el perfil solo si app_settings.seat_payment_url tiene un link.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export const MAX_OPEN_SEAT_REQUESTS = 5;

export type SeatSettings = { paymentUrl: string | null; priceLabel: string | null };

export async function getSeatSettings(db: Db): Promise<SeatSettings> {
  const { data } = await db.from("app_settings").select("key, value").in("key", ["seat_payment_url", "seat_price_label"]);
  const map = new Map(((data ?? []) as { key: string; value: string | null }[]).map((r) => [r.key, r.value]));
  const url = (map.get("seat_payment_url") ?? "").trim();
  return {
    paymentUrl: /^https:\/\//.test(url) ? url : null,
    priceLabel: (map.get("seat_price_label") ?? "").trim() || null,
  };
}

/** Link de pago con el email del socio ya cargado (Stripe Payment Links acepta estos parámetros). */
export function seatCheckoutUrl(paymentUrl: string, requestId: string, partnerEmail: string): string {
  const u = new URL(paymentUrl);
  u.searchParams.set("prefilled_email", partnerEmail);
  u.searchParams.set("client_reference_id", `seat_${requestId}`);
  return u.toString();
}
