import crypto from "crypto";

/**
 * Verifies the Hotmart webhook signature.
 *
 * Hotmart sends `X-Hotmart-Webhook-Token` as a static pre-shared token.
 * We compare it with the HOTMART_WEBHOOK_SECRET env var using constant-time
 * comparison to prevent timing attacks.
 */
export function verifyHotmartSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature) return false;

  const secret = process.env.HOTMART_WEBHOOK_SECRET;
  if (!secret) {
    console.error("HOTMART_WEBHOOK_SECRET no configurado");
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  let receivedBuf: Buffer;
  try {
    receivedBuf = Buffer.from(signature.replace("sha256=", ""), "hex");
  } catch {
    return false;
  }

  // timingSafeEqual throws if buffers have different lengths — check first
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * C7 fix: Replay-attack prevention via timestamp window.
 *
 * Hotmart includes `creation_date` (Unix timestamp in ms) in the webhook body.
 * We reject any payload whose timestamp is older than 5 minutes or dated in
 * the future by more than 5 minutes (clock skew tolerance).
 *
 * If the field is absent we allow the request — backward compatible with
 * Hotmart sandbox events that omit the field.
 */
export function validateHotmartTimestamp(body: HotmartWebhookPayload): boolean {
  const creationDate = (body as { creation_date?: number }).creation_date;
  if (creationDate === undefined || creationDate === null) {
    // Field absent — allow (sandbox / legacy event format)
    return true;
  }

  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  const diff = Math.abs(Date.now() - creationDate);
  return diff <= FIVE_MINUTES_MS;
}

export interface HotmartWebhookPayload {
  /** Unix timestamp in milliseconds — used for replay-attack prevention */
  creation_date?: number;
  event: string;
  data: {
    buyer: {
      email: string;
      name: string;
    };
    purchase: {
      transaction: string;
      status: string;
    };
    product: {
      id: number;
    };
  };
}
