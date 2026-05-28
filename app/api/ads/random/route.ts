import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/ads/random
 * Devuelve un ad_video activo al azar.
 * También retorna cuánto cooldown le queda al usuario (si corresponde).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Leer cooldown del usuario en paralelo con el ad
  const [{ data: ads }, { data: profile }] = await Promise.all([
    supabase
      .from("ad_videos")
      .select("id, video_url, title, duration_seconds")
      .eq("is_active", true),
    supabase
      .from("users")
      .select("last_ad_watched_at")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!ads || ads.length === 0) {
    return NextResponse.json({ error: "no_ads" }, { status: 404 });
  }

  // Seleccionar uno al azar
  const ad = ads[Math.floor(Math.random() * ads.length)];

  // Calcular cooldown restante
  const COOLDOWN_MS = 10 * 60 * 1000;
  let nextInSeconds: number | null = null;

  if (profile?.last_ad_watched_at) {
    const elapsed = Date.now() - new Date(profile.last_ad_watched_at).getTime();
    if (elapsed < COOLDOWN_MS) {
      nextInSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    }
  }

  return NextResponse.json({
    ad,
    cooldown: nextInSeconds !== null,
    next_in_seconds: nextInSeconds,
  });
}
