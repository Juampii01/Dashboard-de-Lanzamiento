import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeJSON, sanitizeInput } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  primaryNaics: z.string(),
  keywords: z.array(z.string()),
  niche: z.string().optional(),
  usState: z.string().optional(),
});

interface RelatedCode {
  code: string;
  description: string;
  type: "NAICS" | "PSC" | "SIC";
}

interface ExpandCodesResult {
  related_codes: RelatedCode[];
  keywords_expanded: string[];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limiting — admin bypass
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    const rl = await checkRateLimit(user.id, 'expand-codes', 5, 60)
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: `Esperá ${rl.retry_after_seconds}s antes de volver a intentar`,
          retry_after_seconds: rl.retry_after_seconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retry_after_seconds) },
        }
      )
    }

    const globalRl = await checkRateLimit(user.id, 'ai-global-daily', 50, 86400)
    if (!globalRl.allowed) {
      return NextResponse.json(
        {
          error: 'daily_limit_reached',
          message: 'Llegaste al límite diario de generaciones con IA. Probá mañana.',
        },
        { status: 429 }
      )
    }
  }

  const raw = await request.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // A6: sanitize user-supplied strings
  const primaryNaics = sanitizeInput(parsed.data.primaryNaics);
  const keywords     = parsed.data.keywords.map(sanitizeInput);
  const niche        = parsed.data.niche ? sanitizeInput(parsed.data.niche) : undefined;
  const usState      = parsed.data.usState ? sanitizeInput(parsed.data.usState) : undefined;

  try {
    const result = await callClaudeJSON<ExpandCodesResult>(
      `Eres un experto en contratación federal de EEUU especializado en codes de clasificación: NAICS, PSC (Product Service Codes) y SIC.
Tu tarea es expandir el mapa de códigos de una empresa para maximizar sus oportunidades de licitación.
Responde SIEMPRE en JSON con esta estructura exacta:
{
  "related_codes": [
    { "code": "string", "description": "descripción oficial en inglés", "type": "NAICS" | "PSC" | "SIC" }
  ],
  "keywords_expanded": ["keyword1", "keyword2", ...]
}
Incluye al menos 3 NAICS relacionados, 4-6 PSC codes relevantes, y 2-3 SIC codes.
Para keywords_expanded incluye 15-20 términos que el gobierno federal usa para buscar estos servicios.`,
      `NAICS primario: ${primaryNaics}
${niche ? `Nicho/servicio: ${niche}` : ""}
${usState ? `Estado de operación: ${usState} — priorizá agencias y contratos activos en ese estado.` : ""}
Keywords del usuario: ${keywords.join(", ")}

Genera el mapa completo de códigos relacionados y expande las keywords con terminología gubernamental.`
    , 3000);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error en expand-codes:", err);
    return NextResponse.json(
      { error: "Error al expandir códigos. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
