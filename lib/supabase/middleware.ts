import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

function isSupabaseConfigured() {
  return (
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("placeholder") &&
    SUPABASE_ANON_KEY.length > 20
  );
}

function isLocalDev() {
  return APP_URL.includes("localhost");
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // En localhost o sin Supabase configurado, dejar pasar todo
  if (!isSupabaseConfigured() || isLocalDev()) {
    return supabaseResponse;
  }

  // CRÍTICO: cualquier redirect temprano DEBE llevarse las cookies que setAll
  // escribió en supabaseResponse. El refresh-token de Supabase es de UN SOLO USO:
  // si getUser() lo rota y devolvemos un NextResponse.redirect "pelado", la cookie
  // nueva nunca llega al browser, el token viejo ya quedó invalidado en el server,
  // y la SIGUIENTE navegación llega sin sesión → rebote a /login. Copiar las
  // cookies en el redirect evita ese "logout fantasma" al cambiar de página.
  const redirectWithCookies = (url: URL) => {
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Error de red (ej: credenciales placeholder) — tratar como no autenticado
  }

  // Proteger /dashboard y rutas de día — redirigir a login si no hay sesión
  if (!user && pathname.startsWith("/dashboard")) {
    return redirectWithCookies(new URL("/login", request.url));
  }

  // Proteger /admin — redirigir a /dashboard si no es admin
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return redirectWithCookies(new URL("/login", request.url));
    }

    try {
      const { data: profile } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        return redirectWithCookies(new URL("/dashboard", request.url));
      }
    } catch {
      return redirectWithCookies(new URL("/dashboard", request.url));
    }
  }

  // Si ya está autenticado y va a /login, redirigir al dashboard
  if (user && pathname === "/login") {
    return redirectWithCookies(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
