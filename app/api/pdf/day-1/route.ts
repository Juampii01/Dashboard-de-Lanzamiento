import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Day1AnalysisPDF } from "@/components/pdfs/Day1AnalysisPDF";
import { createElement } from "react";
import { fetchLogoDataUri } from "@/lib/logo";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const p = profile as Record<string, unknown>;
  const generatedAt = new Date().toLocaleDateString("es-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const logoDataUri = await fetchLogoDataUri(p.logo_url as string | null);

  const buffer = await renderToBuffer(
    createElement(Day1AnalysisPDF, {
      companyName: profile.company_name,
      yearFounded: profile.year_founded,
      employeeCount: profile.employee_count,
      niche: profile.niche,
      problemSolved: profile.problem_solved,
      targetAvatar: profile.target_avatar,
      primaryNaics: profile.primary_naics,
      generatedAt,
      logoDataUri,
    })
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="govbidder-dia-1-analisis.pdf"',
    },
  });
}
