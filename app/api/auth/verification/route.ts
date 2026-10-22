import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/access/purchases";

/**
 * POST /api/auth/verification  (participante con sesión, cuenta en verificación)
 * Guarda el email con el que dice haber comprado y un comentario, para que el
 * equipo lo encuentre rápido. NO da acceso: eso lo decide el equipo en
 * /admin/compras (si lo hiciera solo, cualquiera podría tomar la compra de
 * otra persona escribiendo su email).
 */
const schema = z.object({
  purchase_email: z.string().trim().email().max(255).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_data" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as unknown as SupabaseClient<any, any, any>;
  const { data: me } = await db.from("users").select("access_status").eq("id", user.id).maybeSingle();
  if ((me as { access_status?: string | null } | null)?.access_status !== "pending") {
    return NextResponse.json({ error: "not_pending" }, { status: 409 });
  }

  const { error } = await db
    .from("users")
    .update({
      purchase_email_claim: parsed.data.purchase_email ? normalizeEmail(parsed.data.purchase_email) : null,
      verification_note: parsed.data.note || null,
      verification_requested_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
