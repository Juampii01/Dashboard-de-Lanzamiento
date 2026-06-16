import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      .select("company_name")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const p = preview as { generated_html?: string | null; generated_css?: string | null } | null;
  if (!p?.generated_html) {
    return NextResponse.json({ error: "Todavía no generaste tu web en el Día 3." }, { status: 404 });
  }

  const companyName = (profile as { company_name?: string } | null)?.company_name ?? "My Company";

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${companyName}</title>
  <style>${p.generated_css ?? ""}</style>
</head>
<body>
${p.generated_html}
</body>
</html>`;

  return new NextResponse(fullHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mi-web-govbidder.html"',
    },
  });
}
