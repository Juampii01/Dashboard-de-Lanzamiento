import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CapabilityStatementPDF } from "@/components/pdfs/CapabilityStatementPDF";
import type { CapabilityStatementData } from "@/app/api/ai/generate-capability-statement/route";
import { fetchCapabilityImages } from "@/lib/unsplash";
import { createElement } from "react";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: statement }, { data: userRow }] = await Promise.all([
    supabase.from("company_profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("capability_statements").select("*").eq("user_id", user.id).single(),
    supabase.from("users").select("full_name").eq("id", user.id).single(),
  ]);

  if (!statement) {
    return NextResponse.json({ error: "Statement not found" }, { status: 404 });
  }

  const generatedAt = new Date().toLocaleDateString("es-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const p = (profile ?? {}) as Record<string, unknown>;
  const statementData = statement.statement_data as CapabilityStatementData;

  // Fetch sector photos from Unsplash (degrades to [] if no key / failure)
  const images = await fetchCapabilityImages(statementData.image_keywords ?? [], 2);

  const buffer = await renderToBuffer(
    createElement(CapabilityStatementPDF, {
      images,
      companyData: {
        companyName: (p.company_name as string) ?? "Mi Empresa",
        legalStructure: (p.legal_structure as string | null) ?? null,
        contactName: (userRow?.full_name as string | null) ?? null,
        email: user.email ?? null,
        phone: (p.phone as string | null) ?? null,
        website: (p.website as string | null) ?? null,
        uei: (p.uei as string | null) ?? null,
        cageCode: (p.cage_code as string | null) ?? null,
        usState: (p.us_state as string | null) ?? null,
        certifications: (p.existing_certifications as string[] | null) ?? null,
        yearFounded: (p.year_founded as number | null) ?? null,
        employeeCount: (p.employee_count as number | null) ?? null,
      },
      data: statementData,
      generatedAt,
    })
  );

  // Guardar ruta en storage_path si no existe
  if (!statement.pdf_storage_path) {
    const path = `${user.id}/capability-statement.pdf`;
    await supabase.storage.from("deliverables").upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    await supabase
      .from("capability_statements")
      .update({ pdf_storage_path: path })
      .eq("user_id", user.id);
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="govbidder-capability-statement.pdf"',
    },
  });
}
