import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeJSON, sanitizeInput } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  niche: z.string(),
  problemSolved: z.string(),
  primaryNaics: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  usState: z.string().optional(),
});

interface WebPreviewResult {
  html: string;
  css: string;
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
    const rl = await checkRateLimit(user.id, 'generate-web', 3, 300)
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

  // A6: sanitize user-supplied fields
  const companyName   = sanitizeInput(parsed.data.companyName);
  const niche         = sanitizeInput(parsed.data.niche);
  const problemSolved = sanitizeInput(parsed.data.problemSolved);
  const primaryNaics  = parsed.data.primaryNaics;
  const keywords      = parsed.data.keywords?.map(sanitizeInput);
  const usState       = parsed.data.usState ? sanitizeInput(parsed.data.usState) : undefined;

  try {
    const result = await callClaudeJSON<WebPreviewResult>(
      `Eres un diseñador web experto en sitios para empresas que venden al gobierno de EEUU (federal, estatal y local).
Genera una landing page profesional completa con estas secciones en orden: HERO (con titular grande y CTA), TRUST BAR (badges de credibilidad como "SAM.gov Registered", "Small Business", el NAICS), ABOUT US, SERVICES (en grid de tarjetas), DIFFERENTIATORS, y CONTACT/CTA final.

REGLAS CRÍTICAS DE ESTILO:
- NO uses Tailwind. NO uses ningún framework CSS. NO uses <script> ni CDN externo. NO uses JavaScript.
- TODO el estilo va en el campo "css" como CSS plano y completo (no inline en el HTML salvo casos puntuales).
- El HTML usa nombres de clase semánticos (ej: class="hero", class="services-grid", class="service-card", class="cta-button") que vos definís en el CSS.
- El diseño debe verse MODERNO y PROFESIONAL: gradientes, sombras suaves, espaciado generoso (padding 60-80px en secciones), tipografía system-ui, border-radius en tarjetas y botones, grid responsivo para servicios.
- Paleta: azul navy (#1a2a6c) primario, dorado (#c9a227) acento, fondos blancos y grises muy claros (#f8fafc) alternando entre secciones.
- No uses imágenes externas — usá gradientes/colores de fondo.

Responde SIEMPRE en JSON válido:
{
  "html": "Solo el contenido del <body> (sin <html>, <head> ni <body>). Usá clases semánticas.",
  "css": "Stylesheet COMPLETO que estiliza todas las clases del HTML. Debe ser autosuficiente y hacer que la página se vea como un sitio profesional real."
}`,
      `Empresa: ${companyName}
Qué vende/hace: ${niche}
Problema que resuelve: ${problemSolved}
${primaryNaics ? `NAICS primario: ${primaryNaics}` : ""}
${keywords?.length ? `Keywords clave: ${keywords.slice(0, 5).join(", ")}` : ""}
${usState ? `Estado de operación: ${usState} — mencioná la cobertura geográfica regional en el copy (ej: "serving government agencies across ${usState}").` : ""}

Genera la landing page orientada a contratos gubernamentales.`
    , 8000);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error en generate-web-preview:", err);
    return NextResponse.json(
      { error: "Error al generar preview. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
