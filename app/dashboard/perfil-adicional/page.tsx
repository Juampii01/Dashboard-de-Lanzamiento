import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isViewerJwt } from "@/lib/viewer-shared";
import { PerfilAdicionalClient } from "./client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

// Pestaña "Perfil adicional": el participante pide una cotización para sumar
// otra empresa o persona. El precio solo aparece cuando el equipo la aprueba.
export default async function PerfilAdicionalPage() {
  if (!DEV_MODE) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    if (isViewerJwt(user)) redirect("/dashboard"); // los viewers no pueden solicitar
  }
  return <PerfilAdicionalClient />;
}
