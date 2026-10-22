import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  CURRENT_PRODUCT,
  PURCHASE_SOURCES,
  claimPurchase,
  normalizeEmail,
} from "@/lib/access/purchases";
import { sendAccessActivatedEmail } from "@/lib/email/send-access-activated-email";

/**
 * /api/admin/purchases  (solo admins)
 *
 * GET  → compras del lanzamiento actual + cuentas en verificación
 * POST → { action, ... }
 *   import       { rows: [{ email, full_name?, source?, external_ref? }] }
 *                Carga compras (no duplica). Después vincula solas las cuentas
 *                en verificación cuyo email coincide.
 *   link         { user_id, purchase_id }   vincula una cuenta pendiente a una compra
 *   grant_manual { user_id, note? }         da acceso creando una compra manual
 *   reject       { user_id }                marca "no compró"
 *   reopen       { user_id }                vuelve a "en verificación"
 *   unlink       { purchase_id }            libera una compra y le quita el acceso a la cuenta
 *   delete       { purchase_id }            borra una compra que nadie reclamó
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

async function requireAdmin(): Promise<{ adminId: string; db: Db } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const db = createServiceClient() as unknown as Db;
  const { data } = await db.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return null;
  return { adminId: user.id, db };
}

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { db } = ctx;

  const [purchasesRes, pendingRes, settingRes] = await Promise.all([
    db
      .from("purchases")
      .select("id, email, full_name, source, external_ref, notes, claimed_by, claimed_at, created_at")
      .eq("product", CURRENT_PRODUCT)
      .order("created_at", { ascending: false })
      .limit(5000),
    db
      .from("users")
      .select("id, email, full_name, phone, access_status, purchase_email_claim, verification_note, verification_requested_at, created_at")
      .in("access_status", ["pending", "rejected"])
      .order("created_at", { ascending: true }),
    db.from("app_settings").select("value").eq("key", "launch_access_expires_at").maybeSingle(),
  ]);

  if (purchasesRes.error?.code === "42P01" || pendingRes.error?.code === "42703") {
    return NextResponse.json({ error: "migration_missing" }, { status: 501 });
  }
  if (purchasesRes.error || pendingRes.error) {
    console.error("[admin/purchases GET]", purchasesRes.error?.message, pendingRes.error?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Nombre/email de la cuenta que reclamó cada compra.
  const purchases = (purchasesRes.data ?? []) as Array<{ claimed_by: string | null } & Record<string, unknown>>;
  const ids = [...new Set(purchases.map((p) => p.claimed_by).filter(Boolean))] as string[];
  const owners: Record<string, { email: string; full_name: string | null }> = {};
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from("users").select("id, email, full_name").in("id", ids.slice(i, i + 300));
    for (const u of (data ?? []) as Array<{ id: string; email: string; full_name: string | null }>) owners[u.id] = u;
  }

  return NextResponse.json({
    ok: true,
    purchases: purchases.map((p) => ({ ...p, owner: p.claimed_by ? owners[p.claimed_by] ?? null : null })),
    accounts: pendingRes.data ?? [],
    access_expires_at: (settingRes.data as { value?: string | null } | null)?.value ?? null,
  });
}

const rowSchema = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().max(200).optional().nullable(),
  source: z.enum(PURCHASE_SOURCES).optional(),
  external_ref: z.string().trim().max(200).optional().nullable(),
});

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("import"), rows: z.array(z.unknown()).min(1).max(5000), source: z.enum(PURCHASE_SOURCES).optional() }),
  z.object({ action: z.literal("link"), user_id: z.string().uuid(), purchase_id: z.string().uuid() }),
  z.object({ action: z.literal("grant_manual"), user_id: z.string().uuid(), note: z.string().max(300).optional() }),
  z.object({ action: z.literal("reject"), user_id: z.string().uuid() }),
  z.object({ action: z.literal("reopen"), user_id: z.string().uuid() }),
  z.object({ action: z.literal("unlink"), purchase_id: z.string().uuid() }),
  z.object({ action: z.literal("delete"), purchase_id: z.string().uuid() }),
  z.object({ action: z.literal("set_expiry"), value: z.string().max(40).nullable() }),
]);

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { db, adminId } = ctx;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const body = parsed.data;

  switch (body.action) {
    case "import": {
      const valid: Array<Record<string, unknown>> = [];
      const invalid: string[] = [];
      const seen = new Set<string>();
      for (const raw of body.rows) {
        const r = rowSchema.safeParse(raw);
        if (!r.success) {
          invalid.push(String((raw as { email?: unknown })?.email ?? "(sin email)"));
          continue;
        }
        const email = normalizeEmail(r.data.email);
        if (seen.has(email)) continue;
        seen.add(email);
        valid.push({
          email,
          full_name: r.data.full_name || null,
          source: r.data.source ?? body.source ?? "manual",
          external_ref: r.data.external_ref || null,
          product: CURRENT_PRODUCT,
          created_by: adminId,
        });
      }

      // ¿Cuáles ya estaban cargadas? (para informar, no para fallar)
      const emails = valid.map((v) => v.email as string);
      const existing = new Set<string>();
      for (let i = 0; i < emails.length; i += 300) {
        const { data } = await db.from("purchases").select("email").eq("product", CURRENT_PRODUCT).in("email", emails.slice(i, i + 300));
        for (const r of (data ?? []) as Array<{ email: string }>) existing.add(r.email);
      }
      const toInsert = valid.filter((v) => !existing.has(v.email as string));
      if (toInsert.length) {
        const { error } = await db.from("purchases").upsert(toInsert, { onConflict: "product,email", ignoreDuplicates: true });
        if (error) {
          console.error("[admin/purchases import]", error.message);
          return NextResponse.json({ error: error.code === "42P01" ? "migration_missing" : "internal", detail: error.message }, { status: 500 });
        }
      }

      // Vincular solas las cuentas que ya estaban registradas con ese email
      // (pendientes, o cuentas nuevas sin acceso).
      const linked: string[] = [];
      for (let i = 0; i < emails.length; i += 300) {
        const { data: accounts } = await db
          .from("users")
          .select("id, email, full_name, access_status, hotmart_transaction_id, is_admin, is_student")
          .in("email", emails.slice(i, i + 300))
          .is("hotmart_transaction_id", null);
        for (const a of (accounts ?? []) as Array<{ id: string; email: string; full_name: string | null; access_status: string | null; is_admin: boolean; is_student: boolean }>) {
          if (a.is_admin || a.is_student || a.access_status !== "pending") continue;
          const { data: p } = await db.from("purchases").select("id").eq("product", CURRENT_PRODUCT).eq("email", a.email).is("claimed_by", null).maybeSingle();
          if (!p) continue;
          if (await claimPurchase(db, a.id, (p as { id: string }).id, adminId)) {
            linked.push(a.email);
            await sendAccessActivatedEmail({ to: a.email, name: a.full_name });
          }
        }
      }

      return NextResponse.json({
        ok: true,
        inserted: toInsert.length,
        already: valid.length - toInsert.length,
        invalid,
        linked,
      });
    }

    case "link": {
      const ok = await claimPurchase(db, body.user_id, body.purchase_id, adminId);
      if (!ok) return NextResponse.json({ error: "purchase_taken_or_user_has_one" }, { status: 409 });
      await notify(db, body.user_id);
      return NextResponse.json({ ok: true });
    }

    case "grant_manual": {
      const { data: u } = await db.from("users").select("email, full_name").eq("id", body.user_id).maybeSingle();
      const acc = u as { email: string; full_name: string | null } | null;
      if (!acc) return NextResponse.json({ error: "not_found" }, { status: 404 });
      // Compra manual a nombre del email de la cuenta. Si ya hay una compra con
      // ese email, se usa esa (no se duplica).
      const email = normalizeEmail(acc.email);
      let { data: p } = await db.from("purchases").select("id").eq("product", CURRENT_PRODUCT).eq("email", email).maybeSingle();
      if (!p) {
        const ins = await db
          .from("purchases")
          .insert({ email, full_name: acc.full_name, source: "manual", product: CURRENT_PRODUCT, notes: body.note || "Acceso dado a mano desde el admin", created_by: adminId })
          .select("id")
          .single();
        if (ins.error) return NextResponse.json({ error: "internal", detail: ins.error.message }, { status: 500 });
        p = ins.data;
      }
      const ok = await claimPurchase(db, body.user_id, (p as { id: string }).id, adminId);
      if (!ok) return NextResponse.json({ error: "purchase_taken_or_user_has_one" }, { status: 409 });
      await notify(db, body.user_id);
      return NextResponse.json({ ok: true });
    }

    case "reject":
    case "reopen": {
      const { error } = await db
        .from("users")
        .update({ access_status: body.action === "reject" ? "rejected" : "pending", verified_by: adminId, verified_at: new Date().toISOString() })
        .eq("id", body.user_id)
        .is("hotmart_transaction_id", null);
      if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "unlink": {
      const { data: p } = await db.from("purchases").select("claimed_by").eq("id", body.purchase_id).maybeSingle();
      const owner = (p as { claimed_by: string | null } | null)?.claimed_by;
      if (!owner) return NextResponse.json({ error: "not_claimed" }, { status: 409 });
      await db.from("purchases").update({ claimed_by: null, claimed_at: null }).eq("id", body.purchase_id);
      // La cuenta vuelve a verificación (sin compra = sin acceso).
      await db
        .from("users")
        .update({ hotmart_transaction_id: null, access_status: "pending", verification_requested_at: new Date().toISOString() })
        .eq("id", owner)
        .eq("hotmart_transaction_id", `PUR-${body.purchase_id}`);
      return NextResponse.json({ ok: true });
    }

    case "delete": {
      const { error, count } = await db
        .from("purchases")
        .delete({ count: "exact" })
        .eq("id", body.purchase_id)
        .is("claimed_by", null);
      if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
      if (!count) return NextResponse.json({ error: "claimed" }, { status: 409 });
      return NextResponse.json({ ok: true });
    }

    case "set_expiry": {
      const v = body.value && !Number.isNaN(Date.parse(body.value)) ? new Date(body.value).toISOString() : null;
      const { error } = await db
        .from("app_settings")
        .upsert({ key: "launch_access_expires_at", value: v, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
      return NextResponse.json({ ok: true, value: v });
    }
  }
}

async function notify(db: Db, userId: string) {
  const { data } = await db.from("users").select("email, full_name").eq("id", userId).maybeSingle();
  const u = data as { email: string; full_name: string | null } | null;
  if (u) {
    const r = await sendAccessActivatedEmail({ to: u.email, name: u.full_name });
    if (!r.ok) console.warn("[admin/purchases] aviso no enviado:", r.error);
  }
}
