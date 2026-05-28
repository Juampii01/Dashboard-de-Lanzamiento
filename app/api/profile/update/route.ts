import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * POST /api/profile/update
 * Body: { full_name: string }
 *
 * Updates the authenticated user's display name.
 * Email and phone are ALWAYS READ-ONLY — they are never written by this endpoint,
 * even if provided in the request body.
 */

const bodySchema = z.object({
  // Only full_name is accepted. Any other fields (email, phone, etc.) are silently ignored.
  full_name: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres")
    .trim(),
});

export async function POST(request: Request) {
  // Verify the user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Parse body
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { full_name } = parsed.data;

  // Use service client for the write (user identity already verified above)
  const service = createServiceClient();
  const { error: updateError } = await service
    .from("users")
    .update({ full_name })
    .eq("id", user.id);

  if (updateError) {
    console.error("[profile/update] DB error:", updateError.message);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, full_name });
}
