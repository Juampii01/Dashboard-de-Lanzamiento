import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/proximo-paso/click
 * Body: { button: "pagar_ahora" | "whatsapp" | "banner_inicio" }
 *
 * Solo tracking — registra que el usuario tocó uno de los botones de
 * "Tu Próximo Paso" o el banner de la mentoría en Inicio ("banner_inicio").
 * No otorga puntos ni cambia ningún estado.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { button?: string };
  const ALLOWED = new Set(["whatsapp", "pagar_ahora", "banner_inicio"]);
  const button = ALLOWED.has(body.button ?? "") ? (body.button as string) : null;
  if (!button) return NextResponse.json({ error: "bad_button" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.from("proximo_paso_clicks").insert({ user_id: user.id, button });

  if (error?.code === "42P01") {
    return NextResponse.json({ ok: true, tracked: false });
  }
  if (error) {
    console.error("[proximo-paso/click]", error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tracked: true });
}
