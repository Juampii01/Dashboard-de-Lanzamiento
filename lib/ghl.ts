/**
 * Lectura del payload del webhook de GoHighLevel (workflow Stripe → GHL).
 *
 * GHL arma el body según cómo se configure la acción "Webhook" del workflow:
 * los datos del contacto suelen venir arriba (email, first_name, full_name,
 * contact_id…) y lo de la compra en objetos anidados (order, payment,
 * customData…). Como el formato exacto depende del workflow de Santo, la
 * lectura es tolerante: busca los campos por nombre en todo el objeto.
 *
 * Si algo no se puede leer, el webhook igual queda guardado en webhook_logs
 * con el error, y la compra se puede cargar a mano desde /admin/compras.
 */

export interface GhlPurchase {
  email: string;
  fullName: string | null;
  externalRef: string | null;
  status: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Claves del email, en orden de preferencia (el comprador primero). */
const EMAIL_KEYS = ["email", "customer_email", "contact_email", "buyer_email", "billing_email"];
/** Claves del id de la transacción (para no cargar dos veces la misma compra). */
const REF_KEYS = [
  "transaction_id", "transactionId", "payment_intent", "payment_intent_id", "paymentIntentId",
  "charge_id", "chargeId", "invoice_id", "invoiceId", "order_id", "orderId", "payment_id", "paymentId",
];
const STATUS_KEYS = ["payment_status", "paymentStatus", "status"];

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Recorre el objeto (en anchura, máx. 4 niveles) y devuelve el primer valor de una de las claves. */
function findKey(root: unknown, keys: string[], accept: (v: unknown) => boolean): unknown {
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  let level: unknown[] = [root];
  for (let depth = 0; depth < 5 && level.length; depth++) {
    const next: unknown[] = [];
    // Respeta el orden de preferencia de las claves dentro de cada nivel.
    for (const key of keys) {
      for (const node of level) {
        if (!isObj(node)) continue;
        for (const [k, v] of Object.entries(node)) {
          if (k.toLowerCase() === key.toLowerCase() && accept(v)) return v;
        }
      }
    }
    for (const node of level) {
      if (isObj(node)) {
        for (const [k, v] of Object.entries(node)) if (!wanted.has(k.toLowerCase()) && (isObj(v) || Array.isArray(v))) next.push(...(Array.isArray(v) ? v : [v]));
      }
    }
    level = next;
  }
  return undefined;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

export function parseGhlPurchase(body: unknown): GhlPurchase | { error: string } {
  if (!isObj(body)) return { error: "el body no es un objeto JSON" };

  const email = str(findKey(body, EMAIL_KEYS, (v) => typeof v === "string" && EMAIL_RE.test(v.trim()))).toLowerCase();
  if (!email) return { error: "no se encontró un email válido en el payload" };

  const full = str(findKey(body, ["full_name", "fullName", "name", "contact_name"], (v) => typeof v === "string" && !!v.trim()));
  const first = str(findKey(body, ["first_name", "firstName"], (v) => typeof v === "string"));
  const last = str(findKey(body, ["last_name", "lastName"], (v) => typeof v === "string"));
  const fullName = (full || `${first} ${last}`.trim()) || null;

  const externalRef = str(findKey(body, REF_KEYS, (v) => (typeof v === "string" && !!v.trim()) || typeof v === "number")) || null;
  const status = str(findKey(body, STATUS_KEYS, (v) => typeof v === "string")).toLowerCase() || null;

  return { email, fullName: fullName ? fullName.slice(0, 200) : null, externalRef: externalRef ? externalRef.slice(0, 200) : null, status };
}

/** Estados que NO son un pago confirmado (no dan acceso). */
const NOT_PAID = ["failed", "refunded", "canceled", "cancelled", "declined", "pending", "unpaid", "void", "incomplete"];

export function isPaidStatus(status: string | null): boolean {
  if (!status) return true; // sin estado → el workflow solo dispara en pagos exitosos
  return !NOT_PAID.some((s) => status.includes(s));
}
