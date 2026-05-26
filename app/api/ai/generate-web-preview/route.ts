import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeJSON } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  niche: z.string(),
  problemSolved: z.string(),
  primaryNaics: z.string().optional(),
  keywords: z.array(z.string()).optional(),
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

  const { companyName, niche, problemSolved, primaryNaics, keywords } = parsed.data;

  try {
    const result = await callClaudeJSON<WebPreviewResult>(
      `Eres un diseñador web experto en sitios para empresas que venden al gobierno federal de EEUU.
Genera el HTML y CSS de una landing page profesional de una sola sección (hero + about + services + contact CTA).
Usa un diseño moderno, limpio y confiable que genere credibilidad ante oficiales de compras del gobierno.
Responde SIEMPRE en JSON:
{
  "html": "HTML completo del body (sin <html> ni <head>). Usa clases de Tailwind CSS inline con CDN.",
  "css": "CSS adicional si necesitás algo que Tailwind no cubre, sino string vacío."
}
El HTML debe ser autocontenido, funcionar en un iframe, e incluir el CDN de Tailwind en un <script> tag.
No uses JavaScript interactivo. No uses imágenes externas (usa colores/gradientes de fondo).
Paleta: azul navy (#1a2a6c) como primario, dorado (#c9a227) como acento.`,
      `Empresa: ${companyName}
Qué vende/hace: ${niche}
Problema que resuelve: ${problemSolved}
${primaryNaics ? `NAICS primario: ${primaryNaics}` : ""}
${keywords?.length ? `Keywords clave: ${keywords.slice(0, 5).join(", ")}` : ""}

Genera la landing page orientada a contratos federales.`
    , 4000);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error en generate-web-preview:", err);
    return NextResponse.json(
      { error: "Error al generar preview. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
