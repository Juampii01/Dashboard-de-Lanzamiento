import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { callClaude, sanitizeInput } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserProgressSummary } from "@/lib/assistant";

/**
 * POST /api/ai/story-copy
 * Genera el texto para que el participante comparta su avance del día en una
 * historia de Instagram, etiquetando a las cuentas de GovBidder. Lo usa la
 * tarjeta "Historia Diaria" (components/story-upload.tsx).
 *
 * Configurable desde /admin/comunicaciones (app_settings):
 *   - instagram_handles  → cuentas a etiquetar, ej. "@govbidder @santocontratos"
 *   - story_copy_example → texto de referencia (lo arma Stefany) para el estilo
 */
const DEFAULT_HANDLES = "@govbidder";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "story-copy", 5, 300);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Generaste varios textos seguidos. Espera unos minutos y vuelve a intentarlo." },
      { status: 429 },
    );
  }

  const service = createServiceClient();
  const [summary, { data: settings }, { data: company }] = await Promise.all([
    getUserProgressSummary(user.id),
    service.from("app_settings").select("key, value").in("key", ["instagram_handles", "story_copy_example"]),
    service.from("company_profiles").select("niche").eq("user_id", user.id).maybeSingle(),
  ]);

  const map: Record<string, string> = {};
  for (const r of (settings ?? []) as { key: string; value: string | null }[]) map[r.key] = (r.value ?? "").trim();
  const handles = map.instagram_handles || DEFAULT_HANDLES;
  const example = map.story_copy_example ? sanitizeInput(map.story_copy_example) : "";
  const niche = sanitizeInput(((company as { niche?: string | null } | null)?.niche ?? "").trim());

  const completed = summary.days.filter((d) => d.isCompleted).map((d) => d.day);
  const lastDone = completed.length ? Math.max(...completed) : 0;
  const progress = lastDone
    ? `Ya completó el Día ${lastDone} de 4 del challenge (días completos: ${completed.join(", ")}).`
    : "Está empezando el challenge (todavía no completó ningún día).";

  const system = `Escribes textos cortos para historias de Instagram de participantes del "Tu Primer Contrato Challenge" de GovBidder, un programa de 4 días donde dueños de negocios latinos en Estados Unidos aprenden a venderle al gobierno de USA.

Escribe UN texto en primera persona, como si lo escribiera el participante, para acompañar su historia de hoy:
- Máximo 280 caracteres, 2 a 4 líneas cortas, tono entusiasta y auténtico, sin exagerar.
- Menciona su avance real en el challenge y, si hay rubro, su tipo de negocio.
- Invita a otros dueños de negocio a sumarse al challenge.
- Incluye exactamente estas cuentas para etiquetar: ${handles}
- Puedes usar 1 o 2 emojis. Sin hashtags inventados de marcas.
- No prometas contratos, dinero ni resultados.
${example ? `\nUsa este texto de referencia SOLO como guía de estilo (no lo copies):\n"""${example}"""` : ""}

Responde SOLO con el texto final, sin comillas ni explicaciones.`;

  const userPrompt = `${progress}\nRubro: ${niche || "no indicado"}\nNombre: ${summary.fullName ?? "no indicado"}`;

  try {
    const copy = (await callClaude(system, userPrompt, 400)).trim().replace(/^"|"$/g, "");
    if (!copy) throw new Error("empty");
    return NextResponse.json({ ok: true, copy, handles });
  } catch (err) {
    console.error("[ai/story-copy]", err);
    return NextResponse.json({ error: "internal", message: "No pudimos generar el texto. Intenta de nuevo." }, { status: 500 });
  }
}
