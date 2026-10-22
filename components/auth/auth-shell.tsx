import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

/**
 * Marco común de las pantallas de acceso (login, registro, recuperar
 * contraseña, verificación). Panel de marca a la izquierda en desktop y
 * formulario en tarjeta blanca a la derecha; en mobile queda todo apilado.
 */
export function AuthShell({
  eyebrow = "GovBidder Challenge",
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#080f24] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      {/* Panel de marca (desktop) */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden px-14 py-12 bg-[radial-gradient(900px_circle_at_0%_0%,rgba(228,45,44,0.18),transparent_55%),linear-gradient(160deg,#152978_0%,#0d1a3d_55%,#080f24_100%)]">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center rounded-xl bg-white p-1.5">
            <Image src="/halcon.png" alt="" width={40} height={40} />
          </span>
          <span className="text-white font-extrabold tracking-tight text-lg">GovBidder</span>
        </div>

        <div className="max-w-md">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#FFD700] mb-4">Challenge de 4 días</p>
          <h2 className="text-white text-[40px] leading-[1.08] font-extrabold tracking-tight">
            Aprende a venderle al gobierno de Estados Unidos.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {[
              "Tu perfil estratégico y tus códigos NAICS",
              "Tu sitio web y tu Capability Statement",
              "Misiones diarias, puntos y premios",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-white/80 text-[15px]">
                <CheckCircle2 className="w-5 h-5 text-[#16A65F] shrink-0 mt-0.5" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/40">© GovBidder · dboard.govbidder.net</p>
      </aside>

      {/* Formulario */}
      <main className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8 bg-[radial-gradient(700px_circle_at_50%_-10%,rgba(228,45,44,0.14),transparent_60%),#0d1a3d] lg:bg-[#F7F8FA]">
        <div className="w-full max-w-[420px]">
          <div className="flex justify-center mb-6 lg:hidden">
            <span className="grid place-items-center rounded-2xl bg-white p-2 shadow-lg">
              <Image src="/halcon.png" alt="GovBidder" width={56} height={56} />
            </span>
          </div>

          <div className="rounded-2xl bg-white px-6 py-7 sm:px-8 sm:py-8 shadow-[0_24px_60px_-20px_rgba(8,15,36,0.55)] lg:shadow-[0_1px_3px_rgba(13,26,61,0.08)] lg:border lg:border-[rgba(13,26,61,0.08)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#E42D2C]">{eyebrow}</p>
            <h1 className="mt-1.5 text-[26px] leading-tight font-extrabold tracking-tight text-[#0d1a3d]">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-[#5A6B85]">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>

          {footer && <div className="mt-5 text-center text-sm text-white/75 lg:text-[#5A6B85]">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
