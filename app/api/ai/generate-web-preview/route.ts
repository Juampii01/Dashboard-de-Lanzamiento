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
      `Eres un diseñador web senior de una agencia premium, especializado en sitios para government contractors de EEUU. Tu trabajo se ve como un sitio de $15,000 hecho por una agencia, NO como una plantilla. Generás landing pages que inspiran confianza institucional inmediata en un Contracting Officer.

═══════════════════════════════════════════
ESTRUCTURA OBLIGATORIA (en este orden exacto)
═══════════════════════════════════════════
1. NAV/HEADER fijo: nombre de empresa (logo textual estilizado) a la izquierda + un botón CTA "Get Capability Statement" a la derecha.
2. HERO a pantalla completa: fondo con gradiente navy profundo + textura sutil (radial-gradient overlays). Eyebrow text pequeño en dorado ("FEDERAL · STATE · LOCAL CONTRACTOR"), titular GRANDE (48-60px, bold, blanco), subtítulo de 1-2 líneas, 2 botones (primario dorado + secundario outline blanco). Abajo una fila de mini-stats o trust badges.
3. TRUST BAR: banda con badges/pills: "SAM.gov Registered", "Small Business", el código NAICS, certificaciones, "Fully Insured & Bonded". Fondo claro, borde sutil.
4. ABOUT / OVERVIEW: 2 columnas — texto a la izquierda, una tarjeta de "Quick Facts" a la derecha (años, empleados, cobertura, NAICS) con fondo navy.
5. SERVICES: grid de 3-4 tarjetas. Cada tarjeta: ícono (usá un emoji o un círculo con inicial), título, descripción, 2-3 bullets. Hover: elevación + borde dorado.
6. DIFFERENTIATORS: 3-4 items con número grande o ícono, en fila. "Why agencies choose us".
7. CTA FINAL: banda navy con gradiente, titular fuerte, botón dorado grande.
8. FOOTER: nombre, NAICS, contacto placeholder, "© 2025".

═══════════════════════════════════════════
SISTEMA DE DISEÑO (seguilo al pie de la letra)
═══════════════════════════════════════════
COLORES:
- Navy primario: #0f1e3d / #1a2a6c (usá gradientes entre los dos)
- Dorado acento: #c9a227 / #e0b94a
- Fondos: blanco #ffffff y gris muy claro #f6f8fb (alterná secciones)
- Texto: #1a2a6c sobre claro, #ffffff sobre navy, #64748b para texto secundario

TIPOGRAFÍA:
- font-family: 'Segoe UI', system-ui, -apple-system, sans-serif
- Hero h1: 52px, weight 800, line-height 1.1, letter-spacing -1px
- Section titles: 34px, weight 700
- Body: 16-17px, line-height 1.7, color #475569
- Eyebrows: 13px, weight 700, letter-spacing 2px, uppercase, color dorado

ESPACIADO Y FORMA:
- Secciones: padding 90px 24px (desktop)
- max-width del contenido: 1140px, centrado
- border-radius: 16px en tarjetas, 10px en botones, 999px en pills
- Sombras: box-shadow: 0 10px 40px rgba(15,30,61,0.08) en tarjetas; hover 0 20px 50px rgba(15,30,61,0.15)

DETALLES QUE ELEVAN LA CALIDAD (incluí varios):
- Gradiente de malla en el hero: usá 2-3 radial-gradient superpuestos en el background.
- Transiciones suaves: transition: all .25s ease en tarjetas y botones.
- Hover states reales en botones (cambio de color/elevación) y tarjetas.
- Una línea/acento dorado bajo los títulos de sección.
- Pills de servicios/keywords con fondo tenue del color de acento.
- Grid responsivo: repeat(auto-fit, minmax(280px, 1fr)).
- Números/stats grandes en dorado para impacto visual.

═══════════════════════════════════════════
REGLAS TÉCNICAS
═══════════════════════════════════════════
- NO Tailwind. NO frameworks. NO <script>. NO CDN. NO JavaScript. NO imágenes externas.
- TODO el estilo en el campo "css" (CSS plano, completo, autosuficiente).
- HTML con clases semánticas (.nav, .hero, .hero-title, .trust-bar, .badge, .about, .quick-facts, .services-grid, .service-card, .differentiators, .cta-final, .footer, .btn-primary, .btn-outline).
- El copy va en INGLÉS profesional de procurement (es el idioma del cliente: el gobierno de EEUU).
- Generá CSS abundante y detallado — la diferencia entre un sitio mediocre y uno premium está en los detalles del CSS.

Responde SIEMPRE en JSON válido:
{
  "html": "Solo el contenido del <body> (sin <html>, <head> ni <body>). Clases semánticas.",
  "css": "Stylesheet COMPLETO y DETALLADO. Debe verse como un sitio profesional real de agencia."
}`,
      `Empresa: ${companyName}
Qué vende/hace: ${niche}
Problema que resuelve: ${problemSolved}
${primaryNaics ? `NAICS primario: ${primaryNaics}` : ""}
${keywords?.length ? `Keywords / servicios clave: ${keywords.slice(0, 6).join(", ")}` : ""}
${usState ? `Estado de operación: ${usState} — el hero y el footer deben decir algo como "serving government agencies across ${usState} and nationwide".` : ""}

Generá la landing page premium orientada a contratos gubernamentales. Hacé que un Contracting Officer la vea y piense "esta es una empresa seria".`
    , 12000);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error en generate-web-preview:", err);
    return NextResponse.json(
      { error: "Error al generar preview. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
