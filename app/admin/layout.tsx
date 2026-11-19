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

  // Avisos en el menú: cotizaciones de perfil adicional esperando respuesta y
  // misiones enviadas esperando revisión (sus puntos se suman al aprobarlas).
  const db = createServiceClient();
  const [{ count: seatPending }, { count: rafagaPending }, { count: missionPending }] = await Promise.all([
    db.from("seat_requests").select("id", { count: "exact", head: true }).eq("status", "requested"),
    db.from("rafaga_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("mission_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <AdminShell
      badges={{
        "/admin/perfiles-adicionales": seatPending ?? 0,
        "/admin/misiones": (rafagaPending ?? 0) + (missionPending ?? 0),
      }}
    >
      {children}
    </AdminShell>
  );
}
