import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWebDocument } from "@/lib/web-compliance";

/**
 * GET /api/web/day-3
 * Descarga el sitio web generado en el Día 3 como archivo .html.
 * (El Día 3 no produce un PDF — produce HTML; por eso esta ruta y no /api/pdf.)
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: preview }, { data: profile }] = await Promise.all([
    supabase
      .from("web_previews")
      .select("generated_html, generated_css")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const p = preview as { generated_html?: string | null; generated_css?: string | null } | null;
  if (!p?.generated_html) {
    return NextResponse.json({ error: "Todavía no has generado tu web en el Día 3." }, { status: 404 });
  }

  const cp = (profile ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : null);

  // Incluye formulario con consentimiento SMS + Privacy Policy + Terms of
  // Service (requisito para aprobar el número 800). Ver lib/web-compliance.ts.
  const fullHtml = buildWebDocument(p.generated_html, p.generated_css ?? "", {
    companyName: str(cp.company_name) ?? "My Company",
    niche: str(cp.niche),
    phone: str(cp.phone),
    email: str(cp.corporate_email),
    address: str(cp.address),
    usState: str(cp.us_state),
    website: str(cp.website),
  });

  return new NextResponse(fullHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mi-web-govbidder.html"',
    },
  });
}
