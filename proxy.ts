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
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      // No correr el proxy en requests de PREFETCH de Next. Un prefetch que dispara
      // getUser() puede rotar el refresh-token (de un solo uso) de Supabase, y su
      // Set-Cookie no se confirma de forma confiable en el browser → la navegación
      // real posterior llega con el token viejo ya invalidado y rebota a /login.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
