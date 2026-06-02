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
  usState: z.string().optional(),
  legalStructure: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  hasGovernmentContracts: z.boolean().optional(),
});

interface CodeWithDesc {
  code: string;
  description: string;
}

export interface CapabilityStatementData {
  tagline: string;
  service_categories: string[];          // header pills, e.g. ["JANITORIAL", "FACILITY MAINTENANCE"]
  company_overview: string;
  core_competencies: string[];
  differentiators: string[];
  quality_commitment: string;
  past_performance: string;
  primary_markets: string[];             // e.g. ["Federal", "State", "Local", "Commercial"]
  naics_with_desc: CodeWithDesc[];
  psc_with_desc: CodeWithDesc[];
  // Legacy fields kept for back-compat with previously saved statements + preview
  naics_codes: string[];
  psc_codes: string[];
  contact_placeholder: string;
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
    usState:       parsed.data.usState ? sanitizeInput(parsed.data.usState) : undefined,
    legalStructure: parsed.data.legalStructure ? sanitizeInput(parsed.data.legalStructure) : undefined,
  };
  const naicsCodes = [data.primaryNaics, ...(data.relatedCodes?.filter(c => c.type === "NAICS").map(c => c.code) ?? [])].filter(Boolean);
  const pscCodes = data.relatedCodes?.filter(c => c.type === "PSC").map(c => c.code) ?? [];
  // Pass codes WITH descriptions so the AI can echo them back accurately
  const naicsRef = data.relatedCodes?.filter(c => c.type === "NAICS") ?? [];
  const pscRef   = data.relatedCodes?.filter(c => c.type === "PSC") ?? [];
  const certs = data.certifications ?? [];
  const hasGovContracts = data.hasGovernmentContracts === true;

  try {
    const result = await callClaudeJSON<CapabilityStatementData>(
      `Eres un consultor experto en government contracting de EEUU que redacta Capability Statements de nivel profesional — el documento de una página que un Contracting Officer lee en 60 segundos para decidir si trabaja con una empresa.

Tu output debe ser RICO y COMPLETO, al nivel de un Capability Statement preparado por un consultor de $1,000. Todo en INGLÉS profesional de procurement.

Responde SIEMPRE en JSON válido con esta estructura EXACTA:
{
  "tagline": "tagline corto y potente (máx 8 palabras), ej: 'Federal-Grade Facility Solutions, Delivered'",
  "service_categories": ["3-4 categorías de servicio en MAYÚSCULAS para el header, ej: JANITORIAL", "FACILITY MAINTENANCE", "CUSTODIAL"],
  "company_overview": "párrafo sólido de 3-4 oraciones. Quién es la empresa, qué hace, para quién, y su foco. Incluí estructura legal y años si están disponibles.",
  "core_competencies": ["6 competencias en lenguaje de procurement, cada una con un qualifier federal cuando aplique (OSHA-compliant, GSA-ready, etc.)"],
  "differentiators": ["4 diferenciadores que atacan los riesgos que evalúa un CO (performance, compliance, disponibilidad). Cada uno con evidencia concreta."],
  "quality_commitment": "párrafo de 2-3 oraciones sobre el compromiso de calidad y los procesos de control (QA, documentación, follow-through).",
  "past_performance": "${hasGovContracts ? "instrucción: la empresa SÍ tiene experiencia con gobierno; redactá un párrafo que invite a solicitar referencias documentadas de contratos previos." : "instrucción: la empresa es NUEVA en gobierno; usá 'bridge mode' — redactá un párrafo que referencie su experiencia comercial transferible (clientes del sector privado en entornos regulados) y mencione que las referencias comerciales están disponibles. NO escribas solo 'available upon request'."}",
  "primary_markets": ["niveles de gobierno + comercial que la empresa puede servir, ej: Federal", "State", "Local", "Commercial"],
  "naics_with_desc": [{"code": "561720", "description": "Janitorial Services"}],
  "psc_with_desc": [{"code": "S201", "description": "Custodial/Janitorial Services"}],
  "naics_codes": ["561720", "561210"],
  "psc_codes": ["S201"],
  "contact_placeholder": "Contact information block"
}

REGLAS DE LONGITUD (el documento DEBE entrar en 1 sola página — sé conciso):
- company_overview: máximo 50 palabras. Denso pero compacto.
- core_competencies: exactamente 6 items, frases nominales de máximo 8 palabras cada una (NO oraciones).
- differentiators: exactamente 4 items, máximo 16 palabras cada uno. Directos, con evidencia, sin relleno.
- quality_commitment: máximo 28 palabras.
- past_performance: máximo 32 palabras.
- service_categories: 3-4 categorías en MAYÚSCULAS, derivadas de lo que hace la empresa.
- naics_with_desc: máximo 5 códigos. psc_with_desc: máximo 4 códigos. Usá los provistos abajo CON su descripción real (acortala a máximo 5 palabras). Si no hay PSC, inferí 3 relevantes.
- primary_markets: máximo 4.
- Todo en inglés profesional de procurement. Cada línea debe sonar a una empresa real y seria, sin relleno genérico.`,
      `Empresa: ${data.companyName}
${data.legalStructure ? `Estructura legal: ${data.legalStructure}` : ""}
${data.yearFounded ? `Año de fundación: ${data.yearFounded}` : ""}
${data.employeeCount ? `Empleados: ${data.employeeCount}` : ""}
${data.usState ? `Estado de operación: ${data.usState}` : ""}
Qué vende/hace: ${data.niche}
Problema que resuelve: ${data.problemSolved}
${data.targetAvatar ? `Cliente objetivo: ${data.targetAvatar}` : ""}
${certs.length ? `Certificaciones / set-asides que ya tiene: ${certs.join(", ")}` : "Sin certificaciones formales todavía."}
Experiencia con contratos gubernamentales previos: ${hasGovContracts ? "Sí" : "No (empresa nueva en el mercado gubernamental)"}

NAICS codes con descripción:
${naicsRef.length ? naicsRef.map(c => `- ${c.code}: ${c.description}`).join("\n") : `- ${data.primaryNaics ?? "(inferir)"}`}

PSC codes con descripción:
${pscRef.length ? pscRef.map(c => `- ${c.code}: ${c.description}`).join("\n") : "(inferir 2-3 PSC relevantes)"}

Generá el Capability Statement completo, rico y profesional para esta empresa.`
    , 4000);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error en generate-capability-statement:", err);
    return NextResponse.json(
      { error: "Error al generar Capability Statement. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
