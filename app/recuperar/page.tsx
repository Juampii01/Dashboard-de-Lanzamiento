import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RecoverForm } from "./form";

export const metadata = { title: "Crea o recupera tu contraseña — GovBidder Challenge" };

export default async function RecuperarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const e = (await searchParams).email;
  const initialEmail = typeof e === "string" ? e.slice(0, 255) : "";
  return (
    <AuthShell
      title="Crea o recupera tu contraseña"
      subtitle="Escribe el email de tu cuenta y te enviamos un enlace para elegir una contraseña nueva. Sirve también si participaste en un challenge anterior y nunca tuviste contraseña."
      footer={
        <Link href="/login" className="font-bold text-white lg:text-[#152978] hover:underline">
          ← Volver a iniciar sesión
        </Link>
      }
    >
      <RecoverForm initialEmail={initialEmail} />
    </AuthShell>
  );
}
