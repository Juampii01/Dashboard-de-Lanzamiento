import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Notice } from "@/components/auth/fields";
import { RegisterForm } from "@/components/auth/register-form";
import { requestProgram } from "@/lib/program-server";

export const metadata = { title: "Crea tu cuenta — Tu Primer Contrato Challenge" };

export default async function RegistroPage() {
  // En ondemand.govbidder.net el registro es de la versión grabada.
  const ondemand = (await requestProgram()) === "ondemand";
  return (
    <AuthShell
      {...(ondemand ? { eyebrow: "Tu Primer Contrato Challenge · On Demand" } : {})}
      title="Crea tu cuenta"
      subtitle={
        ondemand
          ? "Regístrate con tu email y una contraseña. Con ellos vas a entrar a tus clases grabadas y a la plataforma cuando quieras."
          : "Regístrate con tu email y una contraseña. Con ellos vas a entrar al dashboard todos los días del challenge."
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
