import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeJSON } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  niche: z.string(),
  problemSolved: z.string(),
  targetAvatar: z.string().optional(),
});

interface NAICSResult {
  naics_code: string;
  naics_description: string;
  reasoning: string;
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
    const rl = await checkRateLimit(user.id, 'suggest-naics', 3, 60)
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

  const { companyName, niche, problemSolved, targetAvatar } = parsed.data;

  try {
    const result = await callClaudeJSON<NAICSResult>(
      `Eres un experto en contratación del gobierno federal de Estados Unidos.
Tu tarea es asignar el código NAICS más apropiado para una empresa.
Responde SIEMPRE en JSON con esta estructura exacta:
{
  "naics_code": "string de 6 dígitos",
  "naics_description": "descripción oficial del código",
  "reasoning": "explicación breve de por qué este código es el más adecuado (2-3 oraciones)"
}`,
      `Empresa: ${companyName}
Nicho / qué vende: ${niche}
Problema que resuelve: ${problemSolved}
${targetAvatar ? `Cliente objetivo: ${targetAvatar}` : ""}

Sugiere el código NAICS primario más apropiado para que esta empresa pueda registrarse en SAM.gov y competir por contratos federales.`
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error en suggest-naics:", err);
    return NextResponse.json(
      { error: "Error al generar sugerencia. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
