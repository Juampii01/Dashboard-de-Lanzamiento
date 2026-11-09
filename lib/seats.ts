/**
 * Perfil adicional por cotización (seat_requests). Ver las migraciones
 * 20261107000003 y 20261109000001.
 *
 * requested → (equipo aprueba con precio y link) approved → (pago) paid
 *           ↘ rejected            ↘ canceled (el participante la cancela)
 *
 * El precio nunca se muestra a todos: cada participante solo ve el de SU
 * solicitud, y solo después de que el equipo la aprueba.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { autoClaimByAccountEmail } from "@/lib/access/purchases";
import { programForProduct } from "@/lib/program";
import { sendWelcomeEmail } from "@/lib/email/send-welcome-email";
import { sendAccessActivatedEmail } from "@/lib/email/send-access-activated-email";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export const MAX_OPEN_SEAT_REQUESTS = 5;

export const SEAT_STATUSES = ["requested", "approved", "rejected", "paid", "canceled"] as const;
export type SeatStatus = (typeof SEAT_STATUSES)[number];

export type SeatRequestRow = {
  id: string;
  host_id: string;
  product: string;
  partner_name: string;
  partner_email: string;
  company_name: string | null;
  message: string | null;
  status: SeatStatus;
  price_label: string | null;
  payment_url: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  paid_at: string | null;
  purchase_id: string | null;
};

export const SEAT_COLUMNS =
  "id, host_id, product, partner_name, partner_email, company_name, message, status, price_label, payment_url, admin_note, created_at, reviewed_at, paid_at, purchase_id";

/** Link de pago por defecto que el admin ve precargado al aprobar (app_settings.seat_payment_url). */
export async function getDefaultSeatPaymentUrl(db: Db): Promise<string | null> {
  const { data } = await db.from("app_settings").select("value").eq("key", "seat_payment_url").maybeSingle();
  const url = ((data as { value?: string | null } | null)?.value ?? "").trim();
  return /^https:\/\//.test(url) ? url : null;
}

/**
 * Link de pago de una solicitud aprobada. Agrega client_reference_id = seat_<id>
 * para que el webhook encuentre la solicitud (Stripe Payment Links lo acepta;
 * en otros links es un parámetro que se ignora).
 */
export function seatCheckoutUrl(paymentUrl: string, requestId: string): string {
  try {
    const u = new URL(paymentUrl);
    u.searchParams.set("client_reference_id", `seat_${requestId}`);
    return u.toString();
  } catch {
    return paymentUrl;
  }
}

/**
 * Marca la solicitud como pagada: crea la compra a nombre de la persona
 * adicional y le manda el email (registro, o "acceso activo" si ya tenía cuenta).
 * La usan el webhook de GHL y el botón "Marcar pagado" del admin.
 */
export async function fulfillSeatRequest(
  db: Db,
  seat: Pick<SeatRequestRow, "id" | "product" | "partner_name" | "partner_email">,
  opts: { payerEmail?: string | null; externalRef?: string | null; source?: string; createdBy?: string | null } = {},
): Promise<{ ok: boolean; purchaseId: string | null; action: string; error?: string }> {
  const { product } = seat;
  const { error: upErr } = await db.from("purchases").upsert(
    {
      email: seat.partner_email,
      full_name: seat.partner_name,
      source: opts.source ?? "ghl",
      external_ref: opts.externalRef ?? null,
      product,
      notes: opts.payerEmail ? `Perfil adicional (pagó ${opts.payerEmail})` : "Perfil adicional",
      ...(opts.createdBy ? { created_by: opts.createdBy } : {}),
    },
    { onConflict: "product,email", ignoreDuplicates: true },
  );
  if (upErr && upErr.code !== "23505") return { ok: false, purchaseId: null, action: "db_error", error: upErr.message };

  const { data: sp } = await db.from("purchases").select("id").eq("product", product).eq("email", seat.partner_email).maybeSingle();
  const purchaseId = (sp as { id: string } | null)?.id ?? null;
  await db
    .from("seat_requests")
    .update({ status: "paid", paid_at: new Date().toISOString(), purchase_id: purchaseId })
    .eq("id", seat.id);

  const program = programForProduct(product);
  const { data: acc } = await db.from("users").select("id, full_name").ilike("email", seat.partner_email).maybeSingle();
  const pa = acc as { id: string; full_name: string | null } | null;
  if (pa) {
    const r = await autoClaimByAccountEmail(db, pa.id, seat.partner_email, [product]);
    if (r === "claimed") await sendAccessActivatedEmail({ to: seat.partner_email, name: pa.full_name ?? seat.partner_name, program });
    return { ok: true, purchaseId, action: r === "claimed" ? "seat_access_activated" : `seat_${r}` };
  }
  const sent = await sendWelcomeEmail({ to: seat.partner_email, name: seat.partner_name, program });
  return sent.ok
    ? { ok: true, purchaseId, action: "seat_welcome_sent" }
    : { ok: true, purchaseId, action: "seat_email_failed", error: "compra registrada, pero no se pudo enviar el email" };
}
