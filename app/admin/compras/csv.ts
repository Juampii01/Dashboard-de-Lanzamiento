/**
 * Lector de CSV tolerante para listas de compradores exportadas de Hotmart,
 * Stripe, SEM o GHL. Detecta el separador (, ; o tab) y las columnas por el
 * encabezado; si no hay encabezado, toma como email la columna que tenga "@".
 */
export interface ParsedRow {
  email: string;
  full_name: string | null;
  external_ref: string | null;
}

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const H_EMAIL = ["email", "e-mail", "correo", "buyer email", "comprador email", "customer email"];
const H_NAME = ["nombre", "name", "full name", "full_name", "comprador", "buyer", "buyer name", "cliente", "customer", "customer name"];
const H_FIRST = ["first name", "first_name", "nombre de pila"];
const H_LAST = ["last name", "last_name", "apellido"];
const H_REF = ["transaccion", "transacción", "transaction", "transaction id", "referencia", "ref", "id de transacción", "order id", "payment id", "id"];

export function parsePurchasesCsv(text: string): { rows: ParsedRow[]; skipped: number } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], skipped: 0 };

  const first = lines[0];
  const sep = [",", ";", "\t"].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const head = splitLine(first, sep).map((h) => h.toLowerCase().replace(/\s+/g, " ").trim());
  const find = (names: string[]) => head.findIndex((h) => names.includes(h));

  let iEmail = find(H_EMAIL);
  const hasHeader = iEmail >= 0 || head.some((h) => H_NAME.includes(h));
  if (iEmail < 0) iEmail = head.findIndex((h) => h.includes("email") || h.includes("correo"));
  const iName = find(H_NAME);
  const iFirst = find(H_FIRST);
  const iLast = find(H_LAST);
  const iRef = find(H_REF);

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const line of hasHeader ? lines.slice(1) : lines) {
    const cols = splitLine(line, sep);
    let email = (iEmail >= 0 ? cols[iEmail] : cols.find((c) => EMAIL_RE.test(c))) ?? "";
    email = email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { skipped++; continue; }

    let name: string | null = null;
    if (iName >= 0) name = cols[iName] || null;
    else if (iFirst >= 0) name = [cols[iFirst], iLast >= 0 ? cols[iLast] : ""].filter(Boolean).join(" ") || null;
    else if (!hasHeader) name = cols.find((c) => c && !EMAIL_RE.test(c)) ?? null;

    rows.push({ email, full_name: name, external_ref: iRef >= 0 ? cols[iRef] || null : null });
  }
  return { rows, skipped };
}
