import crypto from "crypto";

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

export interface HotmartWebhookPayload {
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
