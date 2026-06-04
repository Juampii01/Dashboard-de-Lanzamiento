import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Day2CodeMapPDF } from "@/components/pdfs/Day2CodeMapPDF";
import { createElement } from "react";
import { fetchLogoDataUri } from "@/lib/logo";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: expansion }] = await Promise.all([
    supabase.from("company_profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("naics_expansions").select("*").eq("user_id", user.id).single(),
  ]);

  if (!expansion) {
    return NextResponse.json({ error: "Expansion not found" }, { status: 404 });
  }

  const generatedAt = new Date().toLocaleDateString("es-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const p = (profile ?? {}) as Record<string, unknown>;
  const logoDataUri = await fetchLogoDataUri(p.logo_url as string | null);

  const buffer = await renderToBuffer(
    createElement(Day2CodeMapPDF, {
      companyName: (p.company_name as string) ?? "Mi Empresa",
      primaryNaics: expansion.primary_naics,
      relatedCodes: expansion.related_codes as Array<{ code: string; description: string; type: string }>,
      keywordsExpanded: expansion.keywords_expanded,
      generatedAt,
      logoDataUri,
    })
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="govbidder-dia-2-mapa-codigos.pdf"',
    },
  });
}
