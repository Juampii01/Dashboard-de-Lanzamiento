import Image from "next/image";
import { ShieldCheck } from "lucide-react";

/**
 * Marco común de las pantallas de acceso (login, registro, recuperar
 * contraseña, verificación).
 *
 * Desktop: panel de marca a la izquierda (bandera + navy, el recorrido de los
 *          4 días y el mentor) y formulario sobre blanco a la derecha.
 * Mobile:  banda corta con la bandera arriba y el formulario como una hoja
 *          blanca que sube sobre ella.
 */

const DAYS = [
  { n: 1, title: "Perfil estratégico", desc: "Qué le vas a vender al gobierno" },
  { n: 2, title: "Mapa de códigos", desc: "Tus NAICS y palabras clave" },
  { n: 3, title: "Web y portales", desc: "Tu sitio y los portales de compras" },
  { n: 4, title: "Capability Statement", desc: "Tu carta de presentación" },
];

function FlagBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden>
      <Image src="/flag-usa.jpg" alt="" fill priority sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover object-[70%_30%]" />
      {/* Navy de marca encima para contraste AA del texto */}
      <div className="absolute inset-0 bg-[linear-gradient(100deg,#080f24_0%,rgba(8,15,36,0.94)_38%,rgba(13,26,61,0.78)_70%,rgba(21,41,120,0.55)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,36,0.35)_0%,transparent_30%,transparent_60%,rgba(8,15,36,0.9)_100%)]" />
    </div>
  );
}

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
    <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(460px,1fr)]">
      {/* ───────────── Panel de marca (desktop) ───────────── */}
      <aside className="relative hidden lg:sticky lg:top-0 lg:flex lg:h-dvh flex-col justify-between overflow-hidden bg-[#080f24] px-12 py-10 xl:px-16 xl:py-12">
        <FlagBackdrop />

        <div className="relative flex items-center gap-3">
          <span className="grid place-items-center rounded-xl bg-white p-1.5 shadow-lg shadow-black/30">
            <Image src="/halcon.png" alt="" width={38} height={38} />
          </span>
          <div className="leading-tight">
            <p className="text-white font-extrabold tracking-tight text-[17px]">GovBidder</p>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/50">Challenge</p>
          </div>
        </div>

        <div className="relative max-w-[560px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#FFD700] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FFD700]" />
            Challenge de 4 días
          </span>
          <h2 className="mt-5 text-white text-[44px] xl:text-[54px] leading-[1.02] font-extrabold tracking-[-0.025em]">
            Aprende a venderle
            <br />
            al gobierno de
            <br />
            <span className="relative inline-block">
              Estados Unidos.
              <span className="absolute -bottom-1 left-0 h-[5px] w-full rounded-full bg-[#E42D2C]" />
            </span>
          </h2>
          <p className="mt-6 max-w-[460px] text-[15.5px] leading-relaxed text-white/70">
            En cuatro días armas todo lo que necesitas para empezar a competir por contratos federales.
          </p>

          {/* Recorrido de los 4 días */}
          <ol className="mt-9 grid grid-cols-2 gap-3 max-w-[520px]">
            {DAYS.map((d) => (
              <li key={d.n} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5 backdrop-blur-sm">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E42D2C] text-white text-[19px] leading-none"
                  style={{ fontFamily: "var(--font-arcade)" }}
                >
                  {d.n}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-white leading-tight">{d.title}</p>
                  <p className="mt-0.5 text-[12px] text-white/55 leading-snug">{d.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Mentor */}
        <div className="relative flex items-center gap-3.5">
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-[#FFD700]/70">
            <Image src="/santo.png" alt="Santo González" fill sizes="48px" className="object-cover object-top" />
          </span>
          <div className="leading-tight">
            <p className="text-[14px] font-bold text-white">Con Santo González</p>
            <p className="text-[12.5px] text-white/55">Más de 18 años enseñando a ganar contratos de gobierno</p>
          </div>
        </div>
      </aside>

      {/* ───────────── Formulario ───────────── */}
      <main className="relative flex min-h-dvh flex-col">
        {/* Banda con bandera (mobile) */}
        <div className="relative h-[200px] shrink-0 overflow-hidden bg-[#080f24] lg:hidden">
          <FlagBackdrop />
          <div className="relative flex h-full flex-col justify-between px-5 pb-12 pt-5">
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center rounded-lg bg-white p-1">
                <Image src="/halcon.png" alt="" width={30} height={30} />
              </span>
              <p className="text-white font-extrabold tracking-tight">GovBidder</p>
            </div>
            <p className="text-white text-[22px] leading-[1.12] font-extrabold tracking-tight">
              Aprende a venderle al gobierno de <span className="underline decoration-[#E42D2C] decoration-[3px] underline-offset-4">Estados Unidos</span>.
            </p>
          </div>
        </div>

        <div className="relative -mt-7 flex flex-1 items-start justify-center rounded-t-[28px] bg-white px-5 pb-10 pt-8 sm:px-8 lg:mt-0 lg:items-center lg:rounded-none lg:px-12 lg:py-12">
          <div className="w-full max-w-[400px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E42D2C]">{eyebrow}</p>
            <h1 className="mt-2 text-[30px] leading-[1.1] font-extrabold tracking-[-0.02em] text-[#0d1a3d]">{title}</h1>
            {subtitle && <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#5A6B85]">{subtitle}</p>}

            <div className="mt-7">{children}</div>

            {footer && (
              <div className="mt-7 border-t border-[rgba(13,26,61,0.08)] pt-5 text-center text-[14px] text-[#5A6B85]">{footer}</div>
            )}

            <p className="mt-6 flex items-center justify-center gap-1.5 text-[12px] text-[#94a3b8]">
              <ShieldCheck className="h-3.5 w-3.5" /> Conexión segura · Tus datos están protegidos
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
