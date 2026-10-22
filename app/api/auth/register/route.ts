import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { autoClaimByAccountEmail, getLaunchExpiry, markPending, normalizeEmail } from "@/lib/access/purchases";

/**
 * POST /api/auth/register  (público)
 *
 * Crea la cuenta con email y contraseña. Después:
 *   - modo "buyer" (por defecto): busca una compra con ese mismo email.
 *       · la encuentra libre      → acceso inmediato          → { status: "active" }
 *       · no hay / ya está tomada → cuenta en verificación    → { status: "pending" }
 *   - modo "free": usuario gratuito (is_student), acceso inmediato sin compra.
 *
 * La cuenta se crea con el email ya confirmado para que pueda iniciar sesión
 * en el momento, sin depender de que llegue ningún email.
 *
 * El cliente inicia sesión con signInWithPassword después de esta llamada.
 */
export const maxDuration = 30;

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  phone: z.string().trim().max(40).optional().nullable(),
  mode: z.enum(["buyer", "free"]).default("buyer"),
  website: z.string().optional(), // honeypot: debe venir vacío
});

// Rate-limit best-effort en memoria (se reinicia en cold start).
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 8;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return NextResponse.json({ error: field === "password" ? "weak_password" : "invalid_data" }, { status: 400 });
  }
  const { full_name, password, mode, website } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  const phone = parsed.data.phone || null;

  // Bot: fingimos éxito sin crear nada.
  if (website?.trim()) return NextResponse.json({ ok: true, status: "pending" });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as unknown as SupabaseClient<any, any, any>;

  // ¿Ya existe una cuenta con ese email? (también cubre participantes de
  // lanzamientos anteriores que entraban con link y no tienen contraseña).
  const { data: existing } = await db.from("users").select("id").ilike("email", email).maybeSingle();
  if (existing) return NextResponse.json({ error: "email_exists" }, { status: 409 });

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: full_name, full_name },
  });
  if (createError || !created?.user) {
    const msg = createError?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json({ error: "email_exists" }, { status: 409 });
    }
    if (msg.includes("password")) return NextResponse.json({ error: "weak_password" }, { status: 400 });
    console.error("[auth/register] createUser:", createError?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  const userId = created.user.id;

  // El trigger handle_new_user ya creó la fila en public.users y day_progress.
  const profile: Record<string, unknown> = { full_name, phone };
  if (mode === "free") {
    Object.assign(profile, {
      is_student: true, // gratuito: suma puntos, no compite por premios
      hotmart_transaction_id: `FREE-${userId}`,
      access_starts_at: new Date().toISOString(),
      access_expires_at: await getLaunchExpiry(db),
    });
  }
  const { error: updErr } = await db.from("users").update(profile).eq("id", userId);
  if (updErr) {
    await db.auth.admin.deleteUser(userId);
    console.error("[auth/register] update profile:", updErr.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  if (mode === "free") {
    await db.from("day_progress").update({ is_unlocked: true }).eq("user_id", userId).eq("day_number", 1);
    return NextResponse.json({ ok: true, status: "active" });
  }

  const result = await autoClaimByAccountEmail(db, userId, email);
  if (result === "claimed") return NextResponse.json({ ok: true, status: "active" });

  await markPending(db, userId);
  return NextResponse.json({ ok: true, status: "pending", reason: result });
}
