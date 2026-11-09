import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminShell } from "./_components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  // Aviso en el menú: cotizaciones de perfil adicional esperando respuesta.
  const { count: seatPending } = await createServiceClient()
    .from("seat_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "requested");

  return <AdminShell badges={{ "/admin/perfiles-adicionales": seatPending ?? 0 }}>{children}</AdminShell>;
}
