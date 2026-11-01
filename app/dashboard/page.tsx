import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HomeClient } from "./home-client";
import { LaunchCountdown } from "@/components/launch-countdown";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { inicioUnlockIso } from "@/lib/launch";
import { ReferralLinkCard } from "@/components/referral-link-card";
import { getOrCreateReferralCode, referralLink, REFERRAL_LEAD_XP } from "@/lib/referrals";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
function isSupabaseConfigured() {
  return (
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("placeholder")
  );
}

export default async function DashboardPage() {
  const devMode = !isSupabaseConfigured();

  let initialPoints = 0;
  let fullName = "Usuario";
  let avatarUrl: string | null = null;
  let isAdmin = false;
  const recordings: (string | null)[] = [null, null, null, null];
  const recordingTitles: (string | null)[] = [null, null, null, null];
  let mentoriaBanner = false;
  let tutorialVideoId = "2A6EB_cDk-A"; // default; el admin lo puede cambiar
  let userId = "";
  let refLink: string | null = null;

  if (devMode) {
    // Dev mode — use cookie-based completed days, no real auth
    await cookies(); // satisfy dynamic rendering
    fullName = "Dev Preview";
    initialPoints = 0;
  } else {
    const supabase = await createClient();
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Network unreachable
    }
    if (!user) redirect("/login");
    userId = user.id;

    const { data: profile } = await createServiceClient()
      .from("users")
      .select("full_name, total_points, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    fullName = profile?.full_name ?? "Usuario";
    initialPoints = (profile?.total_points as number | null) ?? 0;
    avatarUrl = (profile as { avatar_url?: string | null })?.avatar_url ?? null;
    isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin === true;

    // Link de referido: se muestra desde ANTES del lanzamiento para que la
    // gente invite apenas compra (en el lanzamiento anterior se activó al final).
    const refCode = await getOrCreateReferralCode(createServiceClient(), user.id).catch(() => null);
    refLink = refCode ? referralLink(refCode) : null;

    // Grabaciones de las clases (1-4) que el admin configura. Cada botón abre su
    // link de YouTube; si un número no tiene link, su botón queda deshabilitado.
    const recFirst = await createServiceClient()
      .from("class_recordings")
      .select("recording_number, youtube_url, title");
    let recs = recFirst.data;
    if (recFirst.error) {
      // Sin la migración del título (20261031000001) → solo links.
      ({ data: recs } = await createServiceClient()
        .from("class_recordings")
        .select("recording_number, youtube_url"));
    }
    for (const r of (recs ?? []) as { recording_number: number; youtube_url: string | null; title?: string | null }[]) {
      if (r.recording_number >= 1 && r.recording_number <= 4) {
        recordings[r.recording_number - 1] = r.youtube_url ?? null;
        recordingTitles[r.recording_number - 1] = r.title ?? null;
      }
    }

    // Banner de la mentoría: apagado salvo que el admin lo prenda
    // (/admin/comunicaciones). Pedido de Santo, 31/10.
    const { data: mb } = await createServiceClient()
      .from("app_settings")
      .select("value")
      .eq("key", "mentoria_banner_enabled")
      .maybeSingle();
    mentoriaBanner = (mb as { value?: string | null } | null)?.value === "true";

    // Video del tutorial (editable desde /admin). Si existe la fila, usamos su
    // valor (vacío = "coming soon"); si no existe la tabla/fila aún, queda el default.
    const { data: tut } = await createServiceClient()
      .from("app_settings")
      .select("value")
      .eq("key", "tutorial_youtube")
      .maybeSingle();
    if (tut && typeof (tut as { value?: string | null }).value === "string") {
      tutorialVideoId = (tut as { value: string }).value;
    }
  }

  // Contador de Inicio (day 0). El desbloqueo es MANUAL (el admin abre el Inicio
  // desde el panel). La fecha del contador es solo cosmética (29/06 00:00 Miami).
  let launchIso = inicioUnlockIso(null);
  let inicioLocked = false;
  if (!devMode) {
    const inicioToggle = await getAdminToggle(createServiceClient(), 0);
    launchIso = inicioUnlockIso(inicioToggle?.scheduled_unlock_at);
    // Solo bloquea si existe la fila de Inicio y NO está abierta (tolera ausencia).
    inicioLocked = !!inicioToggle && inicioToggle.is_globally_unlocked !== true;
  }
  const beforeLaunch = !devMode && !isAdmin && inicioLocked;

  const referralCard = refLink ? (
    <ReferralLinkCard link={refLink} xp={REFERRAL_LEAD_XP} over10k={initialPoints >= 10000} />
  ) : null;

  return (
    <div className="space-y-8">
    {/* Antes del lanzamiento el contador tapa el inicio: el link de referido va
        fuera de esa zona para que se pueda copiar desde el primer día. */}
    {beforeLaunch && referralCard}
    <div className="space-y-8" style={{ position: "relative" }}>
      <HomeClient
        initialPoints={initialPoints}
        fullName={fullName}
        devMode={devMode}
        avatarUrl={avatarUrl}
        recordings={recordings}
        recordingTitles={recordingTitles}
        mentoriaBanner={mentoriaBanner}
        refLink={beforeLaunch ? null : refLink}
        tutorialVideoId={tutorialVideoId}
        isAdmin={isAdmin}
        userId={userId}
      />
      {beforeLaunch && (
        <LaunchCountdown
          targetIso={launchIso}
          day={0}
          title="El dashboard se habilita el día del lanzamiento"
          subtitle="Todavía no ha comenzado el challenge. Mientras tanto puedes recorrerlo y ver todo lo que se viene; se abre el día del lanzamiento."
          reachedSubtitle="Ya casi comienza. El dashboard se habilita apenas el equipo abra el challenge."
        />
      )}
    </div>
    </div>
  );
}
