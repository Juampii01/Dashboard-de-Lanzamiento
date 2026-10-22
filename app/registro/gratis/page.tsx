import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Notice } from "@/components/auth/fields";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Regístrate gratis — GovBidder Challenge" };

export default function RegistroGratisPage() {
  return (
    <AuthShell
      eyebrow="Acceso gratuito"
      title="Regístrate gratis"
      subtitle="Crea tu cuenta con email y contraseña y entra al dashboard al instante."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-bold text-[#152978] hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <Notice tone="gold">
          Es un <strong>acceso gratuito</strong>: usas todo el dashboard y sumas puntos, pero <strong>no compites por los
          premios</strong>. Los premios son para quienes compraron el acceso al challenge.
        </Notice>
        <RegisterForm mode="free" />
      </div>
    </AuthShell>
  );
}
