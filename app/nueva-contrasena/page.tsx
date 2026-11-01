import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "./form";

export const metadata = { title: "Nueva contraseña — Tu Primer Contrato Challenge" };
export const dynamic = "force-dynamic";

// Se llega desde el enlace del email de recuperación: /auth/confirm ya creó la sesión.
export default async function NuevaContrasenaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recuperar");

  return (
    <AuthShell title="Elige tu contraseña" subtitle={<>Para la cuenta <strong className="text-[#0d1a3d]">{user.email}</strong>. A partir de ahora entras con tu email y esta contraseña.</>}>
      <NewPasswordForm />
    </AuthShell>
  );
}
