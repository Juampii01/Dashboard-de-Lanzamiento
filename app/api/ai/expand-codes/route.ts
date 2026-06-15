import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeJSON, sanitizeInput } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  primaryNaics: z.string(),
  extraNaics: z.array(z.string()).optional(),
  keywords: z.array(z.string()),
  niche: z.string().optional(),
  usState: z.string().optional(),
});

interface RelatedCode {
  code: string;
  description: string;
  type: "NAICS" | "PSC" | "SIC" | "UNSPSC" | "NIGP";
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
  const extraNaics   = (parsed.data.extraNaics ?? []).map(sanitizeInput).filter(Boolean).slice(0, 8);
  const keywords     = parsed.data.keywords.map(sanitizeInput);
  const niche        = parsed.data.niche ? sanitizeInput(parsed.data.niche) : undefined;
  const usState      = parsed.data.usState ? sanitizeInput(parsed.data.usState) : undefined;

  try {
    const result = await callClaudeJSON<ExpandCodesResult>(
      `Eres un experto en contratación gubernamental de EEUU especializado en todos los sistemas de clasificación: NAICS, PSC (Product Service Codes), SIC, UNSPSC y NIGP.
Tu tarea es generar el mapa COMPLETO de códigos de una empresa en los 5 formatos que usa el gobierno para comprar servicios.
Responde SIEMPRE en JSON con esta estructura exacta:
{
  "related_codes": [
    { "code": "string", "description": "descripción oficial en inglés", "type": "NAICS" | "PSC" | "SIC" | "UNSPSC" | "NIGP" }
  ],
  "keywords_expanded": ["keyword1", "keyword2", ...]
}

REGLAS:
- NAICS: incluí el código primario + 2-3 relacionados (6 dígitos)
- PSC: 4-6 códigos de Product & Service Code usados por DoD y agencias federales (formato alfanumérico, ej: S201)
- SIC: 2-3 códigos legacy de 4 dígitos que algunos sistemas todavía usan
- UNSPSC: 2-3 códigos UN Standard Products & Services Code (formato XXXXXXXX, ej: 76111501)
- NIGP: 1-2 códigos del National Institute of Governmental Purchasing usados por estados/counties/school districts (formato NNN-NN, ej: 910-39)
- keywords_expanded: 15-20 términos que el gobierno federal y estatal usa para buscar estos servicios`,
      `NAICS primario: ${primaryNaics}
${extraNaics.length ? `NAICS adicionales del usuario (incluilos y expandilos también): ${extraNaics.join(", ")}` : ""}
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
