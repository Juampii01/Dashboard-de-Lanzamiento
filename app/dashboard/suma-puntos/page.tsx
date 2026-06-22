import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOrCreateReferralCode, referralLink, REFERRAL_LEAD_XP } from "@/lib/referrals";
import { ReferralLinkCard } from "@/components/referral-link-card";
import { DailyMissionUser } from "@/components/daily-mission-user";
import Link from "next/link";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

// Referidos "en vivo" para usuarios solo cuando la landing real está configurada
// (evita mostrarles un link con dominio placeholder antes de cargar la env var).
const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "";
const REFERRALS_LIVE = LANDING_URL.startsWith("http") && !LANDING_URL.includes("tu-landing");

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
        <AdminView refLink={refLink} mission={mission} missionDone={missionDone} />
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

// ─── Vista usuarios ─────────────────────────────────────────────────────────
function UserView({
  mission, missionDone, refLink,
}: { mission: Mission | null; missionDone: boolean; refLink: string | null }) {
  // Si no hay misión activa ni referidos en vivo → "Próximamente".
  if (!mission && !refLink) return <ComingSoon />;

  return (
    <div className="space-y-6">
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
        ⚡ Suma Puntos
      </h2>

      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.82)", maxWidth: "48ch", margin: 0, lineHeight: 1.55 }}>
        Estamos armando <strong style={{ color: "#fff" }}>nuevas formas de ganar puntos</strong> y subir
        en el ranking. Muy pronto vas a poder sumar XP extra desde acá.
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

// ─── Vista admin: sección en construcción (visible solo para admins) ─────────
const PLANNED = [
  {
    icon: "🔥",
    title: "Racha diaria",
    desc: "Entrar todos los días del challenge otorga un bonus creciente (usa last_seen_at).",
    status: "Idea",
  },
];

function AdminView({ refLink, mission, missionDone }: { refLink: string | null; mission: Mission | null; missionDone: boolean }) {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
          letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted-foreground)",
          marginBottom: 4,
        }}>
          ⚡ Suma Puntos · vista admin
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.15 }}>
          Formas de ganar XP extra
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 6, maxWidth: "60ch" }}>
          Por ahora los usuarios ven “Próximamente”. Acá ves la misión en vista previa antes de lanzarla a todos.
        </p>
      </div>

      {/* Puntero a gestión de misiones */}
      <Link
        href="/admin"
        style={{
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", textDecoration: "none",
          padding: "14px 18px", borderRadius: 14,
          background: "var(--card)", border: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: 22 }}>📸</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 800, color: "var(--foreground)", fontSize: 15 }}>
            {mission ? "Misión diaria — activa ✅" : "Misión diaria — sin misión activa"}
          </p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Se publica y modera desde <strong>Panel Admin → Misiones Diarias</strong>. (Clic para ir.)
          </p>
        </div>
      </Link>

      {/* Vista previa de la misión (solo admin la ve; los usuarios siguen en "Próximamente") */}
      {mission && (
        <div className="space-y-2">
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
            👁️ Vista previa · los usuarios todavía ven “Próximamente”
          </p>
          <DailyMissionUser mission={mission} alreadyDone={missionDone} />
        </div>
      )}

      {/* Referidos — backend ya funcional (la XP se acredita por webhook) */}
      <div className="space-y-2">
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--success)" }}>
          🤝 Referidos · backend activo
        </p>
        {refLink ? (
          <ReferralLinkCard link={refLink} xp={REFERRAL_LEAD_XP} />
        ) : (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px", fontSize: 13, color: "var(--muted-foreground)" }}>
            Tu link de referido aparece acá con un usuario real (no en modo dev).
          </div>
        )}
        <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          Cuando un lead verificado entra con un link, el referidor suma <strong>+{REFERRAL_LEAD_XP} XP</strong>.
          Falta conectar el webhook de GHL (lo configura Cristian) y cargar <code>REFERRAL_WEBHOOK_SECRET</code> + <code>NEXT_PUBLIC_LANDING_URL</code> en Vercel.
        </p>
      </div>

      {/* Mecánicas planificadas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {PLANNED.map((m) => (
          <div
            key={m.title}
            style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "18px 16px",
              display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 26 }}>{m.icon}</span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "var(--accent-foreground)", background: "var(--accent)",
                borderRadius: 999, padding: "3px 10px",
              }}>
                {m.status}
              </span>
            </div>
            <p style={{ fontWeight: 800, color: "var(--foreground)", fontSize: 16 }}>{m.title}</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{m.desc}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>
        Esta sección es solo visible para admins. Cuando una mecánica esté lista, se publica para todos los usuarios.
      </p>
    </div>
  );
}
