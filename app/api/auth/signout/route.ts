import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { baseUrlForProgram, programFromHost } from "@/lib/program";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Vuelve al login del mismo dominio (en vivo u on demand).
  const program = programFromHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  return NextResponse.redirect(new URL("/login", baseUrlForProgram(program)), { status: 302 });
}
