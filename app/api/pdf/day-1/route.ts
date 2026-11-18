import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Day1AnalysisPDF } from "@/components/pdfs/Day1AnalysisPDF";
import { createElement } from "react";
import { fetchLogoDataUri } from "@/lib/logo";
import { getActor } from "@/lib/viewer";
import { naicsLabel } from "@/lib/naics-sectors";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorId = (await getActor(user.id)).userId;
  const [{ data: profile }, { data: expansion }] = await Promise.all([
    supabase.from("company_profiles").select("*").eq("user_id", actorId).maybeSingle(),
    supabase.from("naics_expansions").select("related_codes").eq("user_id", actorId).maybeSingle(),
  ]);

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
      naicsDescription: naicsLabel(
        profile.primary_naics,
        (expansion as { related_codes?: Array<{ code?: string; description?: string; type?: string }> } | null)?.related_codes,
      ).description,
      usState: (p.us_state as string | null) ?? null,
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
