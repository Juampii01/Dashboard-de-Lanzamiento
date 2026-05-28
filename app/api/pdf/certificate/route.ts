import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificatePDF } from "@/components/pdfs/CertificatePDF";
import { createElement } from "react";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gate: only users who completed Day 4 can download the certificate
  const { data: day4 } = await supabase
    .from("day_progress")
    .select("is_completed")
    .eq("user_id", user.id)
    .eq("day_number", 4)
    .maybeSingle();

  if (!day4?.is_completed) {
    return NextResponse.json(
      { error: "Completá el challenge primero para descargar el certificado." },
      { status: 403 }
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const completedAt = new Date().toLocaleDateString("es-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const buffer = await renderToBuffer(
    createElement(CertificatePDF, {
      fullName: profile?.full_name ?? user.email ?? "Participante",
      completedAt,
    })
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="govbidder-certificado-finalizacion.pdf"',
    },
  });
}
