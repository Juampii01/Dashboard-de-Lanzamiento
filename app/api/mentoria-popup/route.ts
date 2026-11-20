import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { shouldShowMentoriaPopup } from "@/lib/mentoria-popup";

export const dynamic = "force-dynamic";

/** GET → { show } — la ventana de la mentoría la consulta cada 20 s mientras no se mostró. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ show: false }, { status: 401 });
  const service = createServiceClient();
  const { data: u } = await service.from("users").select("is_admin, viewer_of, program").eq("id", user.id).maybeSingle();
  const row = u as { is_admin?: boolean; viewer_of?: string | null; program?: string } | null;
  if (!row || row.is_admin || row.viewer_of || row.program !== "live") return NextResponse.json({ show: false });
  return NextResponse.json({ show: await shouldShowMentoriaPopup(service, user.id) });
}
