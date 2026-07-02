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
  yearFounded: z.number().nullable().optional(),
  employeeCount: z.number().nullable().optional(),
  usState: z.string().nullable().optional(),
  legalStructure: z.string().nullable().optional(),
  certifications: z.array(z.string()).nullable().optional(),
  hasGovernmentContracts: z.boolean().nullable().optional(),
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
  image_keywords: string[];              // 2-3 visual search terms for the sector (Unsplash)
  key_promises: string[];                // 3 punchy value props for the cover page
  value_proposition: string;             // one strong sentence for the cover
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
  "tagline": "tagline corto y potente (máx 8 palabras), específico al rubro REAL de la empresa (NO copies un rubro de ejemplo — derivalo de 'Qué vende/hace' abajo)",
  "service_categories": ["3-4 categorías de servicio en MAYÚSCULAS para el header, derivadas EXCLUSIVAMENTE del rubro real de la empresa descrito abajo"],
  "company_overview": "párrafo sólido de 3-4 oraciones. Quién es la empresa, qué hace, para quién, y su foco. Incluí estructura legal y años si están disponibles.",
  "core_competencies": ["6 competencias en lenguaje de procurement, específicas al negocio descrito abajo"],
  "differentiators": ["4 diferenciadores que atacan los riesgos que evalúa un CO (performance, compliance, disponibilidad), redactados con lenguaje seguro y concreto pero SIN métricas o certificaciones inventadas."],
  "quality_commitment": "párrafo de 2-3 oraciones sobre el compromiso de calidad y los procesos de control (QA, documentación, follow-through).",
  "past_performance": "${hasGovContracts ? "instrucción: la empresa SÍ tiene experiencia con gobierno; redactá un párrafo que invite a solicitar referencias documentadas de contratos previos." : "instrucción: la empresa es NUEVA en gobierno; usá 'bridge mode' — redactá un párrafo genérico sobre su compromiso de calidad y su capacidad de escalar hacia el sector público, basado ÚNICAMENTE en el rubro/problema que resuelve descritos abajo. NO inventes clientes, sectores regulados, ni experiencia comercial específica que la empresa no mencionó explícitamente — si no dio detalles de clientes previos, no los inventes. Mencioná que hay referencias comerciales disponibles a pedido, sin escribir solo 'available upon request'."}",
  "primary_markets": ["niveles de gobierno + comercial que la empresa puede servir, de esta lista fija: Federal", "State", "Local", "Commercial"],
  "naics_with_desc": [{"code": "el código NAICS REAL provisto abajo (nunca inventado)", "description": "su descripción oficial real, máx 5 palabras"}],
  "psc_with_desc": [{"code": "el código PSC REAL provisto abajo, o inferido del NAICS/rubro real si no hay ninguno provisto", "description": "su descripción oficial real, máx 5 palabras"}],
  "image_keywords": ["2-3 términos visuales en inglés que describan EXACTAMENTE el rubro real de la empresa (no copies un rubro distinto al de abajo)"],
  "key_promises": ["3 promesas/beneficios CORTOS para la portada, en MAYÚSCULAS, 2-4 palabras, basadas en lo que la empresa realmente ofrece — NO afirmes compliance/certificaciones que no estén en la lista de certificaciones reales de abajo"],
  "value_proposition": "una sola oración potente para la portada que resuma por qué una agencia debería elegir a esta empresa (máx 20 palabras)",
  "naics_codes": ["los mismos códigos NAICS reales de naics_with_desc, solo el código"],
  "psc_codes": ["los mismos códigos PSC reales de psc_with_desc, solo el código"],
  "contact_placeholder": "Contact information block"
}

REGLAS DE LONGITUD (el documento DEBE entrar en 1 sola página — sé conciso):
- company_overview: máximo 50 palabras. Denso pero compacto.
- core_competencies: exactamente 6 items, frases nominales de máximo 8 palabras cada una (NO oraciones).
- differentiators: exactamente 4 items, máximo 16 palabras cada uno. Directos, con evidencia, sin relleno.
- quality_commitment: máximo 28 palabras.
- past_performance: máximo 32 palabras.
- service_categories: 3-4 categorías en MAYÚSCULAS, derivadas de lo que hace la empresa.
- naics_with_desc: máximo 5 códigos. psc_with_desc: máximo 4 códigos. Usá SOLO los códigos NAICS/PSC provistos explícitamente abajo, CON su descripción real (acortala a máximo 5 palabras). Si no hay ningún PSC provisto, podés sugerir hasta 3 PSC habituales para ese NAICS/rubro — pero basate en el NAICS y el rubro reales, nunca en un rubro genérico o inventado.
- primary_markets: máximo 4.
- PROHIBIDO INVENTAR: no le asignes a la empresa certificaciones (OSHA-compliant, GSA-ready, ISO, etc.), premios, métricas específicas (%, años exactos, cantidad de contratos/clientes) ni historial que no esté explícitamente en los datos provistos abajo. Si un dato no está provisto, no lo reemplaces por una afirmación inventada — usá lenguaje cualitativo (confiabilidad, calidad, cumplimiento) en su lugar. Las únicas certificaciones que podés mencionar son las listadas en "Certificaciones / set-asides que ya tiene" abajo; si dice "Sin certificaciones formales todavía", no menciones ninguna certificación específica.
- image_keywords: exactamente 2-3 términos de búsqueda en INGLÉS que devuelvan fotos profesionales y limpias del sector de la empresa (no logos, no texto). Pensá en qué foto representa visualmente el trabajo (ej. limpieza → "commercial cleaning", "office janitorial"; IT → "data center", "server room"; construcción → "construction site", "commercial building").
- key_promises: exactamente 3 promesas en MAYÚSCULAS, 2-4 palabras cada una, que comuniquen el valor central al gobierno (van en la portada con checkmarks).
- value_proposition: una oración de máximo 20 palabras, potente, para la portada.
- Todo en inglés profesional de procurement. Cada línea debe sonar a una empresa real y seria, sin relleno genérico.`,
      `═══ DATOS REALES DE LA EMPRESA (única fuente de verdad — no agregues nada que no esté acá) ═══
Empresa: ${data.companyName}
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
${naicsRef.length
  ? naicsRef.map(c => `- ${c.code}: ${c.description}`).join("\n")
  : data.primaryNaics
    ? `- ${data.primaryNaics} (sin descripción provista — inferí la descripción oficial real de este código NAICS, no la inventes)`
    : "(NO se proveyó ningún código NAICS — inferí el más relevante según el rubro descrito arriba)"}

PSC codes con descripción:
${pscRef.length ? pscRef.map(c => `- ${c.code}: ${c.description}`).join("\n") : "(NO se proveyó ningún código PSC — sugerí hasta 3 PSC habituales para el NAICS/rubro de arriba)"}
═══════════════════════════════════════════

Generá el Capability Statement completo, rico y profesional para esta empresa, usando EXCLUSIVAMENTE los datos reales de arriba. Sin certificaciones, métricas ni historial inventado.`
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
