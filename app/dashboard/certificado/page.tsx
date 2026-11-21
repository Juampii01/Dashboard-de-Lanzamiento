import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isCertificatesEnabled } from "@/lib/certificates";
import { CertificadoClient } from "./client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

// Pestaña "Certificado": al completar el Día 4, el participante confirma cómo va
// su nombre y reclama el certificado. Se emite en verify.govbidder.net (número
// GBC-26X-0001 verificable) y se descarga aquí mismo.
export default async function CertificadoPage() {
  if (!DEV_MODE) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    // Oculta hasta que el equipo la habilite (los admins la ven siempre).
    const db = createServiceClient();
    const { data: me } = await db.from("users").select("is_admin").eq("id", user.id).maybeSingle();
    const isAdmin = (me as { is_admin?: boolean } | null)?.is_admin === true;
    if (!isAdmin && !(await isCertificatesEnabled(db))) redirect("/dashboard");
  }
  return <CertificadoClient />;
}
