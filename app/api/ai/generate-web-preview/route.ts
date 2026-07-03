import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { callClaudeJSON, sanitizeInput } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchNicheImageUrls } from "@/lib/unsplash";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  niche: z.string(),
  problemSolved: z.string(),
  primaryNaics: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  usState: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  corporateEmail: z.string().optional(),
  website: z.string().optional(),
  logoUrl: z.string().url().optional(),
  yearFounded: z.number().nullable().optional(),
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

  let grantIdToConsume: string | null = null;

  if (!profile?.is_admin) {
    // Gate de regeneración: la PRIMERA generación (la que completa el Día 3)
    // es siempre libre. Cualquier regeneración posterior requiere que el
    // admin la habilite puntualmente (panel "Reportes de Página Web"), para
    // no gastar presupuesto de IA en regeneraciones ilimitadas.
    const service = createServiceClient();
    const { data: dayProgress } = await service
      .from('day_progress')
      .select('is_completed')
      .eq('user_id', user.id)
      .eq('day_number', 3)
      .maybeSingle();

    const isRegeneration = dayProgress?.is_completed === true;

    if (isRegeneration) {
      const { data: grant, error: grantError } = await service
        .from('web_issue_reports')
        .select('id')
        .eq('user_id', user.id)
        .not('regen_granted_at', 'is', null)
        .is('regen_consumed_at', null)
        .order('regen_granted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fail-closed: si la tabla/columnas todavía no existen (migración no
      // corrida) o hay cualquier error, NO dejamos regenerar — mejor bloquear
      // de más que gastar presupuesto de más.
      if (grantError || !grant) {
        return NextResponse.json(
          {
            error: 'regen_not_allowed',
            message: 'Para volver a generar tu web necesitás que el equipo te habilite. Avisales con el botón de abajo ("¿Tu página no te quedó bien?") y te dan acceso.',
          },
          { status: 403 }
        );
      }

      // El permiso se consume DESPUÉS de generar con éxito (más abajo), no
      // acá. Si la llamada a la IA falla (rate limit, timeout, error de
      // Claude), el usuario no debe perder su único permiso sin haber
      // conseguido nada — solo se gasta cuando el resultado realmente sale.
      grantIdToConsume = grant.id;
    }

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
  const keywords      = parsed.data.keywords?.map(sanitizeInput);
  const usState       = parsed.data.usState ? sanitizeInput(parsed.data.usState) : undefined;
  const address        = parsed.data.address ? sanitizeInput(parsed.data.address) : undefined;
  const zipCode        = parsed.data.zipCode ? sanitizeInput(parsed.data.zipCode) : undefined;
  const phone          = parsed.data.phone ? sanitizeInput(parsed.data.phone) : undefined;
  const corporateEmail = parsed.data.corporateEmail ? sanitizeInput(parsed.data.corporateEmail) : undefined;
  const website        = parsed.data.website ? sanitizeInput(parsed.data.website) : undefined;
  const contactLines = [
    address ? `Dirección: ${address}${zipCode ? `, ${zipCode}` : ""}` : "",
    phone ? `Teléfono: ${phone}` : "",
    corporateEmail ? `Email: ${corporateEmail}` : "",
    website ? `Website: ${website}` : "",
  ].filter(Boolean).join("\n");
  const logoUrl       = parsed.data.logoUrl ?? null;  // already validated as URL by zod
  const yearFounded   = parsed.data.yearFounded ?? null;
  const yearsInBusiness = yearFounded ? Math.max(0, new Date().getFullYear() - yearFounded) : null;

  // Fetch real photos for the site (degrades to [] without UNSPLASH_ACCESS_KEY).
  // NICHE-LOCKED: every photo is pulled from the company's actual niche, so a
  // printing business never gets cleaning images (and vice-versa). Day 2
  // keywords are only used as niche-qualified refinements, never standalone.
  const images = await fetchNicheImageUrls(niche, keywords ?? [], 4);
  const imageBlock = images.length
    ? `\n\nFOTOS REALES DISPONIBLES (usá EXACTAMENTE estas URLs en <img src="..."> — son fotos profesionales del sector):\n${images.map((u, i) => `IMG${i + 1}: ${u}`).join("\n")}\nUsá IMG1 como imagen del hero (de fondo o lateral), IMG2 en About, IMG3 e IMG4 en Servicios o galería. Si necesitás menos, está bien.`
    : "\n\nNo hay fotos disponibles — usá gradientes y formas como fondo, sin imágenes externas.";

  try {
    const result = await callClaudeJSON<WebPreviewResult>(
      `Eres uno de los mejores diseñadores web del mundo (nivel Awwwards / agencia de $20,000). Generás el sitio web COMERCIAL de una empresa real, pensado para sus CLIENTES potenciales. El resultado debe ser tan bueno que alguien que use una IA genérica JAMÁS lo podría replicar: diseño editorial, jerarquía impecable, micro-interacciones en CSS, uso magistral de fotos y espacio en blanco.

═══════════════════════════════════════════
QUÉ ES (y QUÉ NO ES)
═══════════════════════════════════════════
ES: el sitio web de marketing de la empresa, para atraer y convencer a CLIENTES. Vende los servicios, genera confianza, e invita a contactar.

NUNCA incluyas (PROHIBIDO — esta data es interna, no va en un sitio público):
- Códigos NAICS, PSC, SIC, CAGE Code, UEI, DUNS
- "Capability Statement", "SAM.gov registered", "set-aside", "Contracting Officer", "procurement"
- Nada de jerga de contratación gubernamental ni datos de registro federal
- Botones tipo "Get Capability Statement"
El CTA es comercial: "Get a Free Quote", "Request a Consultation", "Contact Us", "Book a Walkthrough".

═══════════════════════════════════════════
ESTRUCTURA (sitio completo, rico)
═══════════════════════════════════════════
1. NAV sticky: logo textual + links (Services, About, Why Us, Contact) + botón CTA.
2. HERO impactante a pantalla completa: foto de fondo (IMG1) con overlay oscuro en gradiente para legibilidad, eyebrow chico, titular GRANDE y emocional (no genérico), subtítulo de valor, 2 botones, y una fila de 3-4 "trust badges" SIN cifras inventadas (ver DATOS REALES abajo — usá SOLO lo que esté marcado como real; si no hay años de experiencia reales, usá badges cualitativos como "Licensed & Insured", "Locally Owned", "Fast Response Time", nunca un número inventado).
3. SERVICES: grid de 3-4 tarjetas con foto o ícono, título, descripción, mini-lista de beneficios. Hover elevación.
4. ABOUT: 2 columnas — foto real (IMG2) a un lado, texto cálido y profesional al otro (historia, misión, compromiso). Sin datos sensibles.
5. WHY CHOOSE US: 3-4 diferenciales con ícono/numeral grande (confiabilidad, calidad, respuesta rápida, garantía) — cualitativos, sin porcentajes ni cifras inventadas.
6. GALLERY / SHOWCASE: 2-3 fotos (IMG3, IMG4) en un grid con leve overlay y hover zoom.
7. OUR PROCESS: 3-4 pasos numerados de cómo trabajan (consulta → propuesta → ejecución → seguimiento, adaptalo al rubro). NO uses testimonios ni citas atribuidas a clientes — la empresa no tiene reseñas reales cargadas y un testimonio inventado sería información falsa en su sitio público.
8. FINAL CTA: banda con gradiente, titular fuerte, botón grande.
9. FOOTER: nombre, tagline, links, datos de contacto (email/teléfono/ciudad placeholder), © año.

═══════════════════════════════════════════
SISTEMA DE DISEÑO
═══════════════════════════════════════════
- Paleta: elegí una paleta MODERNA y apropiada al rubro (no obligatoriamente navy). Profesional, con un color de marca + un acento. Fondos blanco y gris muy claro alternados; secciones oscuras donde sume drama.
- Tipografía: system-ui / 'Segoe UI'. Hero 54-68px weight 800 line-height 1.05 letter-spacing -1.5px. Títulos de sección 36px. Body 16-17px line-height 1.7.
- Espaciado: secciones 100px vertical, max-width 1180px centrado. Generoso aire.
- Forma: border-radius 18px en tarjetas, 999px en pills/botones. Sombras suaves en capas.
- Detalles premium: overlay en gradiente sobre las fotos, hover zoom en imágenes (transform scale + overflow hidden), líneas/acentos finos, números grandes para stats, transiciones suaves (transition: all .3s ease), badges/pills, divisores elegantes.

═══════════════════════════════════════════
IMÁGENES${imageBlock}
═══════════════════════════════════════════

═══════════════════════════════════════════
LOGO DE LA EMPRESA
═══════════════════════════════════════════
${logoUrl
  ? `El cliente subió su logo. Usá EXACTAMENTE esta URL como <img> en la barra de navegación y en el footer:
LOGO_URL: ${logoUrl}
OBLIGATORIO:
- En la nav, reemplazá el texto del logo por: <img src="${logoUrl}" alt="${companyName}" style="height:48px;width:auto;object-fit:contain;max-width:180px;display:block;">
- En el footer, igual: <img src="${logoUrl}" alt="${companyName}" style="height:40px;width:auto;object-fit:contain;max-width:160px;display:block;margin-bottom:12px;">
- NO agregues texto del nombre de la empresa junto al logo en la nav — el logo ya lo comunica.`
  : `No hay logo — usá el nombre de la empresa como texto en la nav y en el footer.`}

═══════════════════════════════════════════
REGLAS TÉCNICAS
═══════════════════════════════════════════
- NO Tailwind, NO frameworks, NO <script>, NO CDN, NO JavaScript.
- Las ÚNICAS URLs de imagen permitidas son: (1) las URLs de Unsplash provistas arriba, (2) la LOGO_URL del cliente si fue provista. No inventes otras URLs.
- TODO el estilo en el campo "css" (CSS plano, completo, abundante y detallado).
- RESPONSIVE OBLIGATORIO: el sitio se verá en escritorio Y en celular. Incluí media queries (@media (max-width: 768px) y @media (max-width: 480px)) que apilen los grids en 1 columna, reduzcan el tamaño del hero/títulos y los paddings, y conviertan la nav en algo simple. NUNCA generes scroll horizontal: usá width:100%/max-width en contenedores, "img{max-width:100%;height:auto;display:block}", evitá anchos fijos en px que excedan la pantalla, y "box-sizing:border-box" global. El hero y todas las secciones deben verse perfectas a 390px de ancho.
- HTML con clases semánticas claras.
- Copy en INGLÉS, cálido y profesional, orientado a vender al cliente. Sin relleno genérico — específico al negocio.
- PROHIBIDO INVENTAR DATOS: no inventes años de experiencia, cantidad de clientes/proyectos, porcentajes de satisfacción, certificaciones (OSHA/GSA/etc.), premios, ni testimonios/citas de clientes. Usá ÚNICAMENTE la información provista en "DATOS REALES DE LA EMPRESA" más abajo. Si un dato no está provisto, NO lo reemplaces con un número o afirmación inventada — usá lenguaje cualitativo genérico (confiabilidad, calidad, compromiso) en su lugar.

Responde SIEMPRE en JSON válido:
{
  "html": "Solo el contenido del <body> (sin <html>, <head> ni <body>).",
  "css": "Stylesheet COMPLETO y DETALLADO de calidad de agencia."
}`,
      `═══ DATOS REALES DE LA EMPRESA (única fuente de verdad — no agregues nada que no esté acá) ═══
Empresa: ${companyName}
Qué vende/hace: ${niche}
Problema que resuelve para sus clientes: ${problemSolved}
${keywords?.length ? `Servicios clave: ${keywords.slice(0, 6).join(", ")}` : ""}
${usState ? `Zona de operación: ${usState} y alrededores — mencionalo naturalmente en el hero/footer.` : ""}
${yearsInBusiness !== null ? `Años de experiencia (REAL, verificado): ${yearsInBusiness}${yearsInBusiness === 0 ? " (fundada este año — no la muestres como '0 years', omití el stat de años directamente)" : " — podés usar este número real en un trust badge del hero."}` : "Años de experiencia: NO PROVISTO — no muestres ningún número de años en el hero."}
${contactLines ? `\nDatos de contacto REALES (usalos en la sección de contacto y el footer, NO inventes placeholders):\n${contactLines}` : ""}
═══════════════════════════════════════════

Generá el sitio web COMERCIAL premium de esta empresa, para atraer clientes, usando EXCLUSIVAMENTE los datos reales de arriba. Que se vea como hecho por la mejor agencia del mundo. Recordá: NADA de NAICS, capability statement ni datos de procurement, y NADA de cifras, certificaciones o testimonios inventados.`
    , 14000);

    if (grantIdToConsume) {
      await createServiceClient().from('web_issue_reports').update({ regen_consumed_at: new Date().toISOString() }).eq('id', grantIdToConsume);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error en generate-web-preview:", err);
    return NextResponse.json(
      { error: "Error al generar preview. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
