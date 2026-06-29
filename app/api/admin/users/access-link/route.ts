import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { buildMagicLinkUrl } from "@/lib/auth/magic-link";

// Genera un magic link de acceso para un usuario y lo DEVUELVE (no envía email).
// El admin lo copia y lo manda a mano (WhatsApp, etc.). Mismo flujo probado que
// magic-blast/create-user: admin.generateLink (magiclink, redirectTo /auth/confirm)
// + buildMagicLinkUrl (token_hash → login directo de un clic).
//
// Body: { userId } o { email }.

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://dboard.govbidder.net").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createServiceClient();
  const { data: me } = await admin
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { userId?: string; email?: string };
  let email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email && body.userId) {
    const { data: u } = await admin
      .from("users")
      .select("email")
      .eq("id", body.userId)
      .maybeSingle();
    email = ((u as { email?: string } | null)?.email ?? "").trim().toLowerCase();
  }
  if (!email) return NextResponse.json({ error: "no_email" }, { status: 400 });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${APP_URL}/auth/confirm` },
  });
  const link = buildMagicLinkUrl(
    (linkData as { properties?: { hashed_token?: string; verification_type?: string } } | null)?.properties
  );
  if (linkError || !link) {
    return NextResponse.json({ error: linkError?.message ?? "link_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, link, email });
}
