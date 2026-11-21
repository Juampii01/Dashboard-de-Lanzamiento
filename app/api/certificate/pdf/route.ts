import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/viewer";
import { callVerify } from "@/lib/certificates";

// GET → descarga el PDF del certificado ya reclamado.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const actor = await getActor(user.id);
  const db = createServiceClient();
  const [{ data: claim }, { data: u }] = await Promise.all([
    db.from("certificate_claims").select("certificate_number").eq("user_id", actor.userId).maybeSingle(),
    db.from("users").select("email").eq("id", actor.userId).maybeSingle(),
  ]);
  const number = (claim as { certificate_number?: string } | null)?.certificate_number;
  const email = (u as { email?: string | null } | null)?.email;
  if (!number || !email) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const r = await callVerify({ action: "pdf", certificate_number: number, email });
  if (!r.ok) return NextResponse.json({ error: "pdf_failed" }, { status: 502 });
  const bytes = Buffer.from(r.pdf_base64, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${number}.pdf"; filename*=UTF-8''${encodeURIComponent(r.filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
