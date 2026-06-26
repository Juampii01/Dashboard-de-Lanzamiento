import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { JourneySummaryPDF } from "@/components/pdfs/JourneySummaryPDF";
import { createElement } from "react";
import { fetchLogoDataUri } from "@/lib/logo";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: expansion }] = await Promise.all([
    supabase.from("company_profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("naics_expansions").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const p = profile as Record<string, unknown>;
  const exp = (expansion ?? {}) as Record<string, unknown>;
  const generatedAt = new Date().toLocaleDateString("es-US", { year: "numeric", month: "long", day: "numeric" });
  const logoDataUri = await fetchLogoDataUri(p.logo_url as string | null);

  const related = (exp.related_codes as unknown[] | null) ?? [];
  const keywords = (exp.keywords_expanded as unknown[] | null) ?? [];

  const buffer = await renderToBuffer(
    createElement(JourneySummaryPDF, {
      companyName: (p.company_name as string) ?? "Mi Empresa",
      currentDay: 4,
      yearFounded: (p.year_founded as number | null) ?? null,
      primaryNaics: (p.primary_naics as string | null) ?? (exp.primary_naics as string | null) ?? null,
      naicsDescription: null,
      relatedCodesCount: related.length,
      keywordsCount: keywords.length,
      generatedAt,
      logoDataUri,
    })
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="govbidder-resumen-final.pdf"',
    },
  });
}
