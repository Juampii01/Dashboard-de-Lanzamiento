import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOrCreateReferralCode, referralLink, REFERRAL_LEAD_XP, REFERRAL_REDIRECT_URL } from "@/lib/referrals";
import { ReferralLinkCard } from "@/components/referral-link-card";
import { DailyMissionUser } from "@/components/daily-mission-user";
import Link from "next/link";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

// Referidos "en vivo" para usuarios solo cuando la URL de pago/acceso está
// configurada (el form público /referido redirige ahí). Hasta entonces, los
// usuarios no ven el link (el admin sí, para testear).
const REFERRALS_LIVE = REFERRAL_REDIRECT_URL.startsWith("http");

// Mientras esté en false, los USUARIOS ven "Próximamente" aunque haya misión
// activa; el ADMIN igual la ve (vista previa). Poner en true para lanzarla a todos.
const MISSIONS_LIVE_FOR_USERS = false;

interface Mission { id: string; title: string; description: string | null; points_reward: number; }
interface Ctx { isAdmin: boolean; refLink: string | null; mission: Mission | null; missionDone: boolean; }

async function getContext(): Promise<Ctx> {
  if (DEV_MODE) return { isAdmin: true, refLink: null, mission: null, missionDone: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isAdmin: false, refLink: null, mission: null, missionDone: false };

  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  const isAdmin = (data as { is_admin?: boolean } | null)?.is_admin ?? false;

  let refLink: string | null = null;
  const code = await getOrCreateReferralCode(service, user.id);
  if (code) refLink = referralLink(code);

  const { data: missionRow } = await service
    .from("daily_missions")
    .select("id, title, description, points_reward")
    .eq("is_active", true)
    .maybeSingle();
  const mission = (missionRow as Mission | null) ?? null;

  let missionDone = false;
  if (mission) {
    const { data: sub } = await service
      .from("mission_submissions")
      .select("status")
      .eq("user_id", user.id)
      .eq("mission_id", mission.id)
      .maybeSingle();
    missionDone = (sub as { status?: string } | null)?.status === "approved";
  }

  return { isAdmin, refLink, mission, missionDone };
}

export default async function SumaPuntosPage() {
  const { isAdmin, refLink, mission, missionDone } = await getContext();

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm transition-colors"
        style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}
      >
        ← Dashboard
      </Link>

      {isAdmin ? (
        // Admin ve la misión real directo (vista previa), sin gating.
        <UserView mission={mission} missionDone={missionDone} refLink={refLink} admin />
      ) : (
        <UserView
          mission={MISSIONS_LIVE_FOR_USERS ? mission : null}
          missionDone={missionDone}
          refLink={REFERRALS_LIVE ? refLink : null}
        />
      )}
    </div>
  );
}

// ─── Vista usuarios (y admin en modo preview) ───────────────────────────────
function UserView({
  mission, missionDone, refLink, admin = false,
}: { mission: Mission | null; missionDone: boolean; refLink: string | null; admin?: boolean }) {
  // Sin misión ni referidos: usuarios ven "Próximamente"; admin ve una nota.
  if (!mission && !refLink) {
    return admin ? (
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px", fontSize: 14, color: "var(--muted-foreground)" }}>
        No hay misión activa. Publicala desde <Link href="/admin" style={{ color: "var(--primary)", fontWeight: 700 }}>Panel Admin → Misiones Diarias</Link>.
      </div>
    ) : <ComingSoon />;
  }

  return (
    <div className="space-y-6">
      {admin && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
          👁️ Vista admin · gestionar en <Link href="/admin" style={{ color: "var(--primary)" }}>/admin</Link>
        </p>
      )}
      {mission && <DailyMissionUser mission={mission} alreadyDone={missionDone} />}
      {refLink && (
        <div className="space-y-2">
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted-foreground)",
          }}>
            🤝 Invitá y ganá
          </p>
          <ReferralLinkCard link={refLink} xp={REFERRAL_LEAD_XP} />
        </div>
      )}
    </div>
  );
}

// ─── Vista usuarios: coming soon ────────────────────────────────────────────
function ComingSoon() {
  return (
    <div
      style={{
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", gap: 18, padding: "clamp(32px, 7vw, 64px) 24px",
        borderRadius: 20, minHeight: "min(60vh, 520px)",
        background: "radial-gradient(700px circle at 50% 0%, rgba(228,45,44,0.12), transparent 60%), linear-gradient(160deg, #0d1a3d 0%, #080f24 100%)",
        border: "1px solid rgba(228,45,44,0.25)",
      }}
    >
      <div style={{ background: "#fff", borderRadius: 16, padding: "10px 16px", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/halcon.png" alt="Govbidder Challenge" style={{ height: 60, width: "auto", display: "block" }} />
      </div>

      <p style={{
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800,
        letterSpacing: "0.16em", textTransform: "uppercase", color: "#FFD700",
      }}>
        Govbidder Challenge
      </p>

      <h2 style={{
        fontFamily: "var(--font-display)", fontSize: "clamp(24px, 4.5vw, 38px)", fontWeight: 800,
        color: "#fff", lineHeight: 1.12, margin: 0,
      }}>
        ⚡ Misiones Extra
      </h2>

      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.82)", maxWidth: "48ch", margin: 0, lineHeight: 1.55 }}>
        Estamos armando <strong style={{ color: "#fff" }}>misiones extra</strong> para ganar XP y subir
        en el ranking. Muy pronto vas a poder sumar puntos desde acá.
      </p>

      <span style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800,
        letterSpacing: "0.1em", textTransform: "uppercase", color: "#E42D2C",
        background: "rgba(228,45,44,0.12)", border: "1px solid rgba(228,45,44,0.4)",
        borderRadius: 999, padding: "8px 18px", marginTop: 4,
      }}>
        🔧 Próximamente
      </span>
    </div>
  );
}
