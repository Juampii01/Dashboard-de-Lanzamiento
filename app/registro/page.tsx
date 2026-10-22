import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Notice } from "@/components/auth/fields";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Crea tu cuenta — GovBidder Challenge" };

export default function RegistroPage() {
  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Regístrate con tu email y una contraseña. Con ellos vas a entrar al dashboard todos los días del challenge."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-bold text-white lg:text-[#152978] hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <Notice tone="gold">
          <strong>Importante:</strong> regístrate con el <strong>mismo email con el que compraste</strong>. Así tu acceso se
          activa al instante. Cada compra da acceso a una sola cuenta.
        </Notice>
        <RegisterForm mode="buyer" />
      </div>
    </AuthShell>
  );
}
