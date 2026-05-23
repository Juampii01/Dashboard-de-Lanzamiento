import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CapabilityStatementPDF } from "@/components/pdfs/CapabilityStatementPDF";
import type { CapabilityStatementData } from "@/app/api/ai/generate-capability-statement/route";
import { createElement } from "react";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: statement }] = await Promise.all([
    supabase.from("company_profiles").select("company_name").eq("user_id", user.id).single(),
    supabase.from("capability_statements").select("*").eq("user_id", user.id).single(),
  ]);

  if (!statement) {
    return NextResponse.json({ error: "Statement not found" }, { status: 404 });
  }

  const generatedAt = new Date().toLocaleDateString("es-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const buffer = await renderToBuffer(
    createElement(CapabilityStatementPDF, {
      companyName: profile?.company_name ?? "Mi Empresa",
      data: statement.statement_data as CapabilityStatementData,
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
