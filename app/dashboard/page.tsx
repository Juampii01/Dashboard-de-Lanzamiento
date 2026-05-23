import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllAdminToggles } from "@/lib/supabase/helpers";
import { DayCard } from "@/components/day-card";
import { SamContractsWidget } from "@/components/sam-contracts-widget";
import { SocialProof } from "@/components/social-proof";
import { CertificatePreview } from "@/components/certificate-preview";

const DAY_META = [
  {
    day: 1,
    title: "Oportunidad + Perfil Estratégico",
    description:
      "Descubrí cómo tu empresa encaja en el mercado federal y completá tu Perfil Estratégico para obtener tu primer código NAICS.",
    href: "/dashboard/dia-1",
  },
  {
    day: 2,
    title: "Mapa de Código Gubernamental",
    description:
      "Expandí tus códigos NAICS, PSC y SIC. La IA genera el mapa completo de cómo el gobierno busca lo que vos vendés.",
    href: "/dashboard/dia-2",
  },
  {
    day: 3,
    title: "Web + 1-800 + Portales",
    description:
      "Generá el preview de tu web orientada al gobierno, conocé los portales donde publicar y cómo usar un 1-800 para cerrar contratos.",
    href: "/dashboard/dia-3",
  },
  {
    day: 4,
    title: "Capability Statement + Cierre",
    description:
      "Tu Capability Statement profesional generado con toda tu data. Participá del sorteo y obtené tu certificado de finalización.",
    href: "/dashboard/dia-4",
  },
];

async function getDashboardData(userId: string) {
  const supabase = await createClient();

  const [{ data: progress }, toggles] = await Promise.all([
    supabase
      .from("day_progress")
      .select("day_number, is_unlocked, is_completed")
      .eq("user_id", userId),
    getAllAdminToggles(supabase),
  ]);

  const progressMap = Object.fromEntries(
    (progress ?? []).map((p) => [p.day_number, p])
  );
  const toggleMap = Object.fromEntries(
    toggles.map((t) => [t.day_number, t])
  );

  return { progressMap, toggleMap };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
function isSupabaseConfigured() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return (
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("placeholder") &&
    !appUrl.includes("localhost")
  );
}

export default async function DashboardPage() {
  let progressMap: Record<number, { is_unlocked: boolean; is_completed: boolean }> = {};
  let toggleMap: Record<number, { is_globally_unlocked: boolean }> = {};
  let userName = "Tu nombre";
  let completedDays = 0;

  if (!isSupabaseConfigured()) {
    toggleMap = { 1: { is_globally_unlocked: true } };
  } else {
    const supabase = await createClient();
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Red inaccesible
    }

    if (!user) redirect("/login");

    const data = await getDashboardData(user.id);
    progressMap = data.progressMap;
    toggleMap = data.toggleMap;

    // Grab user name and completed count for certificate preview
    const { data: profile } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    userName = profile?.full_name ?? "Tu nombre";
    completedDays = Object.values(progressMap).filter((p) => p.is_completed).length;
  }

  return (
    <div className="space-y-8 page-enter">
      {/* Hero welcome */}
      <div className="pt-2">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <h1
            className="text-4xl font-bold text-white leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Bienvenido al Code Challenge
            <span className="ml-2">🚀</span>
          </h1>
          <SocialProof />
        </div>
        <p
          className="text-lg"
          style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}
        >
          4 días para aprender a venderle al gobierno federal.
          Completá cada reto para desbloquear el siguiente.
        </p>
      </div>

      {/* SAM.gov live contracts widget */}
      <SamContractsWidget />

      {/* Grid de retos */}
      <div className="grid gap-5 sm:grid-cols-2 stagger-children">
        {DAY_META.map(({ day, title, description, href }) => {
          const dayToggle = toggleMap[day];
          const dayProgress = progressMap[day];
          const prevDayProgress = progressMap[day - 1];

          const globallyUnlocked = dayToggle?.is_globally_unlocked ?? (day === 1);
          const prevCompleted = day === 1 || prevDayProgress?.is_completed === true;
          const userUnlocked = dayProgress?.is_unlocked ?? false;

          const isUnlocked = (globallyUnlocked && prevCompleted) || userUnlocked;
          const isCompleted = dayProgress?.is_completed ?? false;

          return (
            <DayCard
              key={day}
              day={day}
              title={title}
              description={description}
              isUnlocked={isUnlocked}
              isCompleted={isCompleted}
              href={href}
            />
          );
        })}
      </div>

      {/* Bottom row: sorteo + certificate */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Sorteo final */}
        <div
          className="rounded-xl p-6 border"
          style={{
            background: "linear-gradient(135deg, rgba(20,58,107,0.55) 0%, rgba(10,37,64,0.7) 100%)",
            borderColor: "#FFD60A33",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="text-3xl select-none"
              style={{ filter: "drop-shadow(0 2px 8px rgba(255,214,10,0.4))" }}
            >
              🏆
            </div>
            <div>
              <h2
                className="font-bold text-lg text-white mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Sorteo final
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "#A8B5CC" }}>
                Completá los 4 retos y subí tus entregables para participar del
                sorteo. Los puntos acumulados en las mini-cápsulas de video
                determinan tu ranking de elegibilidad.
              </p>
            </div>
          </div>
        </div>

        {/* Certificate preview */}
        <CertificatePreview completedDays={completedDays} userName={userName} />
      </div>
    </div>
  );
}
