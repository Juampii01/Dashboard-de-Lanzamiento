import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeJSON, sanitizeInput } from "@/lib/claude";
import { checkRateLimit, checkOndemandAiCap } from "@/lib/rate-limit";
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

// Formato válido por tipo — descarta lo que la IA devuelva con un formato imposible.
const CODE_FORMAT: Record<RelatedCode["type"], RegExp> = {
  NAICS: /^\d{6}$/,
  PSC: /^[A-Z0-9]{4}$/,
  SIC: /^\d{4}$/,
  UNSPSC: /^\d{8}$/,
  NIGP: /^\d{3}-\d{2}$/,
};

function cleanCodes(codes: RelatedCode[]): RelatedCode[] {
  const seen = new Set<string>();
  return codes.filter((c) => {
    const code = String(c?.code ?? "").trim().toUpperCase();
    const format = CODE_FORMAT[c?.type];
    if (!format || !format.test(code)) return false;
    const key = `${c.type}:${code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    c.code = code;
    return true;
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // On Demand: tope cada 30 días (el acceso es indefinido).
  const odCap = await checkOndemandAiCap(user.id, "tools");
  if (!odCap.allowed) {
    return NextResponse.json(
      { error: "ondemand_limit", message: "Llegaste al límite de uso de la IA de este mes. Escríbenos si necesitas más.", retry_after_seconds: odCap.retry_after_seconds },
      { status: 429 }
    );
  }

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
          message: `Espera ${rl.retry_after_seconds}s antes de volver a intentar`,
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
          message: 'Llegaste al límite diario de generaciones con IA. Prueba mañana.',
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
Tu tarea es generar el mapa de códigos de una empresa en los 5 formatos que usa el gobierno para comprar lo que esa empresa vende.
Responde SIEMPRE en JSON con esta estructura exacta:
{
  "related_codes": [
    { "code": "string", "description": "título oficial en inglés", "type": "NAICS" | "PSC" | "SIC" | "UNSPSC" | "NIGP" }
  ],
  "keywords_expanded": ["keyword1", "keyword2", ...]
}

REGLA DE ORO — PRECISIÓN ANTES QUE CANTIDAD:
- Cada código debe describir lo que ESTA empresa realmente hace o vende según su nicho. Nada de códigos de otros rubros parecidos (ej: si limpia piscinas, NO incluyas limpieza de oficinas ni janitorial; si da capacitación, NO incluyas limpieza).
- Usa solo códigos que existan de verdad, con su título oficial tal cual. NUNCA adaptes ni inventes la descripción para que encaje con el nicho, y nunca agregues aclaraciones entre paréntesis que no sean parte del título oficial.
- Si no estás seguro de que un código existe o de cuál es su título oficial, NO lo incluyas. Es preferible devolver menos códigos que uno equivocado.
- Antes de responder, revisa código por código: ¿el título oficial corresponde a esta empresa? Si no, sácalo.

CANTIDADES (son máximos, no mínimos):
- NAICS (6 dígitos): el primario + hasta 3 relacionados. Si la empresa además vende productos (equipos, insumos, químicos), incluye el NAICS mayorista que corresponda.
- PSC (4 caracteres; servicios empiezan con letra, productos son 4 dígitos FSC): hasta 6.
- SIC (4 dígitos): hasta 3.
- UNSPSC (8 dígitos): hasta 3.
- NIGP (formato NNN-NN): hasta 2.
- keywords_expanded: 15-20 términos que el gobierno federal y estatal usa para buscar exactamente estos servicios o productos.`,
      `NAICS primario: ${primaryNaics}
${extraNaics.length ? `NAICS adicionales del usuario (incluilos y expandilos también): ${extraNaics.join(", ")}` : ""}
${niche ? `Nicho/servicio: ${niche}` : ""}
${usState ? `Estado de operación: ${usState} — prioriza agencias y contratos activos en ese estado.` : ""}
Keywords del usuario: ${keywords.join(", ")}

Genera el mapa de códigos que correspondan a lo que hace este negocio (solo códigos reales, con su título oficial) y expande las keywords con terminología gubernamental.`
    , 3000);

    return NextResponse.json({
      related_codes: cleanCodes(result.related_codes ?? []),
      keywords_expanded: result.keywords_expanded ?? [],
    });
  } catch (err) {
    console.error("Error en expand-codes:", err);
    return NextResponse.json(
      { error: "Error al expandir códigos. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
