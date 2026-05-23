import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeJSON } from "@/lib/claude";
import { z } from "zod";

const bodySchema = z.object({
  primaryNaics: z.string(),
  keywords: z.array(z.string()),
  niche: z.string().optional(),
});

interface RelatedCode {
  code: string;
  description: string;
  type: "NAICS" | "PSC" | "SIC";
}

interface ExpandCodesResult {
  related_codes: RelatedCode[];
  keywords_expanded: string[];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { primaryNaics, keywords, niche } = parsed.data;

  try {
    const result = await callClaudeJSON<ExpandCodesResult>(
      `Eres un experto en contratación federal de EEUU especializado en codes de clasificación: NAICS, PSC (Product Service Codes) y SIC.
Tu tarea es expandir el mapa de códigos de una empresa para maximizar sus oportunidades de licitación.
Responde SIEMPRE en JSON con esta estructura exacta:
{
  "related_codes": [
    { "code": "string", "description": "descripción oficial en inglés", "type": "NAICS" | "PSC" | "SIC" }
  ],
  "keywords_expanded": ["keyword1", "keyword2", ...]
}
Incluye al menos 3 NAICS relacionados, 4-6 PSC codes relevantes, y 2-3 SIC codes.
Para keywords_expanded incluye 15-20 términos que el gobierno federal usa para buscar estos servicios.`,
      `NAICS primario: ${primaryNaics}
${niche ? `Nicho/servicio: ${niche}` : ""}
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
