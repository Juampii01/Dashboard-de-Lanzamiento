import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/users/type  (solo admins)
 * { user_id | email, is_student } → pasa una cuenta a gratuita (alumno) o a pago.
 *
 * Gratuito: no suma puntos ni compite por premios. La marca de acceso queda
 * igual que en /registro/gratis (FREE-<id>). No toca compras vinculadas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

const schema = z
  .object({
    user_id: z.string().uuid().optional(),
    email: z.string().email().optional(),
    is_student: z.boolean(),
  })
  .refine((b) => b.user_id || b.email, "user_id o email");

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createServiceClient() as unknown as Db;
  const { data: me } = await db.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  const { user_id, email, is_student } = parsed.data;

  const q = db.from("users").select("id, email, is_admin, viewer_of, hotmart_transaction_id");
  const { data: row } = user_id ? await q.eq("id", user_id).maybeSingle() : await q.ilike("email", email!.trim()).maybeSingle();
  const target = row as { id: string; email: string; is_admin: boolean | null; viewer_of: string | null; hotmart_transaction_id: string | null } | null;
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (target.is_admin || target.viewer_of) return NextResponse.json({ error: "not_allowed" }, { status: 409 });

  const tx = target.hotmart_transaction_id;
  const update: Record<string, unknown> = { is_student };
  if (is_student && (!tx || tx.startsWith("MANUAL-"))) update.hotmart_transaction_id = `FREE-${target.id}`;
  if (!is_student && tx?.startsWith("FREE-")) update.hotmart_transaction_id = `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { error } = await db.from("users").update(update).eq("id", target.id);
  if (error) {
    console.error("[admin/users/type]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, user_id: target.id, email: target.email, is_student });
}
