import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Notice } from "@/components/auth/fields";
import { ViewerRegisterForm } from "@/components/auth/viewer-register-form";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = { title: "Invitación — Tu Primer Contrato Challenge" };

export default async function RegistroInvitadoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";

  let invite: { email: string; hostName: string | null } | null = null;
  let problem: "invalid" | "used" | null = "invalid";
  if (token) {
    const db = createServiceClient();
    const { data } = await db
      .from("viewer_invites")
      .select("email, host_id, accepted_at, revoked_at")
      .eq("token", token)
      .maybeSingle();
    const inv = data as { email: string; host_id: string; accepted_at: string | null; revoked_at: string | null } | null;
    if (inv && !inv.revoked_at) {
      if (inv.accepted_at) {
        problem = "used";
      } else {
        const { data: host } = await db.from("users").select("full_name").eq("id", inv.host_id).maybeSingle();
        invite = { email: inv.email, hostName: (host as { full_name?: string | null } | null)?.full_name ?? null };
        problem = null;
      }
    }
  }

  return (
    <AuthShell
      title={invite ? "Crea tu cuenta de visualización" : "Invitación no disponible"}
      subtitle={
        invite
          ? `${invite.hostName || "Un participante"} te invitó a ver su avance en el challenge. Vas a poder recorrer su plataforma sin hacer cambios.`
          : "Este link de invitación no es válido o ya no está activo."
      }
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-bold text-[#152978] hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      {invite ? (
        <div className="space-y-5">
          <Notice tone="info">
            Es una cuenta de <strong>solo lectura</strong>: ves lo mismo que {invite.hostName || "quien te invitó"}, pero no puedes
            completar tareas, sumar puntos ni participar del sorteo.
          </Notice>
          <ViewerRegisterForm token={token} email={invite.email} />
        </div>
      ) : (
        <Notice tone="gold">
          {problem === "used"
            ? "Esta invitación ya se usó. Si ya creaste tu cuenta, inicia sesión con tu email y contraseña."
            : "Pídele a la persona que te invitó que te envíe una invitación nueva desde su perfil."}
        </Notice>
      )}
    </AuthShell>
  );
}
