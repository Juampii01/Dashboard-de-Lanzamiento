import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as { day_number?: number; keyword?: string };
  const day = Number(body.day_number);
  const keyword = String(body.keyword ?? "").trim();

  if (!day || day < 1 || day > 4 || !keyword) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const service = createServiceClient();

  // Fetch the keyword for that day (without revealing it to the client in the response)
  const { data: kw } = await service
    .from("call_keywords")
    .select("keyword, points_reward")
    .eq("day_number", day)
    .maybeSingle();

  if (!kw) {
    return NextResponse.json({ error: "no_keyword" }, { status: 404 });
  }

  // Comparación tolerante: ignora mayúsculas, espacios y ACENTOS. Así "CÓDIGOS",
  // "codigos" y "Codigos" cuentan igual (la gente tipea sin tilde lo que escucha
  // en la llamada). Normaliza NFD y borra los diacríticos.
  const norm = (s: string) =>
    s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (norm(keyword) !== norm((kw as { keyword: string }).keyword)) {
    return NextResponse.json({ ok: false, error: "wrong_keyword" }, { status: 422 });
  }

  const reward = (kw as { points_reward: number }).points_reward ?? 1000;

  // Register (idempotent via UNIQUE user_id+day_number)
  const { error: insErr } = await service.from("keyword_submissions").insert({
    user_id: user.id,
    day_number: day,
    points_earned: reward,
  });

  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: true, awarded: false, reason: "already_claimed" });
    }
    console.error("[keywords/submit] insert error:", insErr);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Award XP. Si falla, hacemos rollback de la fila para que el reintento
  // pueda volver a acreditar (insert + RPC no son atómicos).
  const { data: total, error: rpcErr } = await service.rpc("add_points", {
    p_user_id: user.id,
    p_delta: reward,
    p_category: "keyword",
  });

  if (rpcErr) {
    console.error("[keywords/submit] add_points error:", rpcErr);
    await service.from("keyword_submissions").delete().eq("user_id", user.id).eq("day_number", day);
    return NextResponse.json({ ok: false, error: "award_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, awarded: true, delta: reward, total });
}
