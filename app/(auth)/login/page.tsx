import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./form";

export const metadata = { title: "Iniciar sesión — GovBidder Challenge" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const linkExpired = (await searchParams).error === "auth";
  return (
    <AuthShell
      title="Inicia sesión"
      subtitle="Entra con el email y la contraseña de tu cuenta."
      footer={
        <>
          ¿Todavía no tienes cuenta?{" "}
          <Link href="/registro" className="font-bold text-[#152978] hover:underline">
            Regístrate
          </Link>
        </>
      }
    >
      <LoginForm linkExpired={linkExpired} />
    </AuthShell>
  );
}
