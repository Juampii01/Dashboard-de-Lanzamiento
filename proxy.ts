import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Dominio viejo de Vercel — cualquier acceso se redirige al dominio oficial.
const LEGACY_HOST = "govbidder-challenge.vercel.app";
const CANONICAL_HOST = "dboard.govbidder.net";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // Redirigir el dominio viejo al nuevo, conservando path + query.
  // (No tocamos otros *.vercel.app para no romper deployments de preview.)
  if (host === LEGACY_HOST) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 307);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
