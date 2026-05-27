import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeJSON, sanitizeInput } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  niche: z.string(),
  problemSolved: z.string(),
  targetAvatar: z.string().optional(),
  primaryNaics: z.string().optional(),
  relatedCodes: z.array(z.object({
    code: z.string(),
    description: z.string(),
    type: z.string(),
  })).optional(),
  keywordsExpanded: z.array(z.string()).optional(),
  yearFounded: z.number().optional(),
  employeeCount: z.number().optional(),
});

export interface CapabilityStatementData {
  company_overview: string;
  core_competencies: string[];
  differentiators: string[];
  past_performance: string;
  contact_placeholder: string;
  naics_codes: string[];
  psc_codes: string[];
  tagline: string;
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
    const rl = await checkRateLimit(user.id, 'generate-cs', 3, 300)
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

  // A6: sanitize all user-supplied text fields
  const data = {
    ...parsed.data,
    companyName:   sanitizeInput(parsed.data.companyName),
    niche:         sanitizeInput(parsed.data.niche),
    problemSolved: sanitizeInput(parsed.data.problemSolved),
    targetAvatar:  parsed.data.targetAvatar ? sanitizeInput(parsed.data.targetAvatar) : undefined,
  };
  const naicsCodes = [data.primaryNaics, ...(data.relatedCodes?.filter(c => c.type === "NAICS").map(c => c.code) ?? [])].filter(Boolean);
  const pscCodes = data.relatedCodes?.filter(c => c.type === "PSC").map(c => c.code) ?? [];

  try {
    const result = await callClaudeJSON<CapabilityStatementData>(
      `Eres un experto en redacción de Capability Statements para empresas que buscan contratos federales en EEUU.
Un Capability Statement es un documento de una sola página que presenta la empresa ante oficiales de compras del gobierno.
Debe ser profesional, directo y resaltar las fortalezas únicas de la empresa.
Responde SIEMPRE en JSON con esta estructura exacta:
{
  "company_overview": "párrafo de 2-3 oraciones en inglés describiendo la empresa",
  "core_competencies": ["competencia 1", "competencia 2", "competencia 3", "competencia 4", "competencia 5"],
  "differentiators": ["diferenciador 1", "diferenciador 2", "diferenciador 3"],
  "past_performance": "placeholder en inglés: 'Available upon request. References from satisfied clients provided on demand.'",
  "contact_placeholder": "Contact us at: [Phone] | [Email] | [Website]",
  "naics_codes": ["código1", "código2"],
  "psc_codes": ["código1", "código2"],
  "tagline": "slogan corto en inglés (máximo 10 palabras)"
}
Escribe todo en INGLÉS (es el idioma del gobierno federal de EEUU).`,
      `Empresa: ${data.companyName}
${data.yearFounded ? `Año de fundación: ${data.yearFounded}` : ""}
${data.employeeCount ? `Empleados: ${data.employeeCount}` : ""}
Qué vende/hace: ${data.niche}
Problema que resuelve: ${data.problemSolved}
${data.targetAvatar ? `Cliente objetivo: ${data.targetAvatar}` : ""}
NAICS codes: ${naicsCodes.join(", ")}
PSC codes: ${pscCodes.join(", ")}

Genera el Capability Statement completo para esta empresa.`
    , 3000);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error en generate-capability-statement:", err);
    return NextResponse.json(
      { error: "Error al generar Capability Statement. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
