import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/proximo-paso/click
 * Body: { button: "pagar_ahora" | "whatsapp" | "banner_inicio" | "quiero_cupo" | "quiero_cupo_visto" }
 *
 * Solo tracking — registra que el usuario tocó uno de los botones de
 * "Tu Próximo Paso" o el banner de la mentoría en Inicio ("banner_inicio").
 * "quiero_cupo" / "quiero_cupo_visto": ventana "¡Quiero mi cupo!" (tocó el
 * botón / la cerró). Cualquiera de los dos hace que no se vuelva a mostrar.
 * "mentoria_*": ventana de la mentoría (lib/mentoria-popup.ts).
 * No otorga puntos ni cambia ningún estado.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { button?: string };
  const ALLOWED = new Set([
    "whatsapp", "pagar_ahora", "banner_inicio", "quiero_cupo", "quiero_cupo_visto",
    "mentoria_visto", "mentoria_pagar", "mentoria_hablar", "mentoria_no",
  ]);
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
