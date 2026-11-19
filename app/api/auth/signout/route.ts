import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { baseUrlForProgram, programFromHost } from "@/lib/program";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // scope "local": cierra solo la sesión de este dispositivo. El valor por
  // defecto ("global") revoca todas las sesiones de la cuenta y desconecta
  // al participante en sus otros dispositivos.
  await supabase.auth.signOut({ scope: "local" });
  // Vuelve al login del mismo dominio (en vivo u on demand).
  const program = programFromHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  return NextResponse.redirect(new URL("/login", baseUrlForProgram(program)), { status: 302 });
}
