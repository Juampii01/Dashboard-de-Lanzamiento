import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NuevoUsuarioClient } from "./client";

export default async function NuevoUsuarioPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  // ?tipo=gratuito → el formulario arranca en "Gratuito" (botón desde el filtro Gratuitos).
  const { tipo } = await searchParams;
  return <NuevoUsuarioClient initialFree={tipo === "gratuito"} />;
}
