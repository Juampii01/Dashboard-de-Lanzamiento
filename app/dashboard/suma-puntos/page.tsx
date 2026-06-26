import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOrCreateReferralCode, referralLink, REFERRAL_LEAD_XP } from "@/lib/referrals";
import { ReferralLinkCard } from "@/components/referral-link-card";
import { DailyMissionUser } from "@/components/daily-mission-user";
import { KeywordCards } from "@/components/keyword-cards";
import { StoryUpload } from "@/components/story-upload";
import { RafagaSection } from "@/components/rafaga-section";
import type { RafagaMission } from "@/components/rafaga-section";
import Link from "next/link";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

// Función para calcular la fecha Miami con reset 8AM
function getMiamiStoryDate(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = parseInt(get("hour"), 10);

  if (hour < 8) {
    const prev = new Date(now);
    prev.setUTCHours(prev.getUTCHours() - 24);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(prev);
  }
  return `${get("year")}-${get("month")}-${get("day")}`;
}

interface Mission { id: string; title: string; description: string | null; points_reward: number; }

interface PageCtx {
  isAdmin: boolean;
  refLink: string | null;
  mission: Mission | null;
  missionDone: boolean;
  keywordDays: { day_number: number; hasKeyword: boolean; done: boolean }[];
  storyDoneToday: boolean;
  rafagas: RafagaMission[];
  rafagaClaimedIds: string[];
}

async function getContext(): Promise<PageCtx> {
  const emptyKeywordDays = [1, 2, 3, 4].map((d) => ({ day_number: d, hasKeyword: false, done: false }));

  if (DEV_MODE) {
    return {
      isAdmin: true,
      refLink: "https://dboard.govbidder.net/referido?ref=DEVTEST",
      mission: null,
      missionDone: false,
      keywordDays: emptyKeywordDays,
      storyDoneToday: false,
      rafagas: [],
      rafagaClaimedIds: [],
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      isAdmin: false, refLink: null, mission: null, missionDone: false,
      keywordDays: emptyKeywordDays, storyDoneToday: false,
      rafagas: [], rafagaClaimedIds: [],
    };
  }

  const service = createServiceClient();

  // Fetch all data in parallel
  const [
    userRow,
    refCode,
    missionRow,
    keywordsRows,
    keywordSubsRows,
    storyRow,
    rafagaRows,
    rafagaSubsRows,
  ] = await Promise.all([
    service.from("users").select("is_admin").eq("id", user.id).maybeSingle(),
    getOrCreateReferralCode(service, user.id),
    service.from("daily_missions").select("id, title, description, points_reward").eq("is_active", true).maybeSingle(),
    service.from("call_keywords").select("day_number").order("day_number"),
    service.from("keyword_submissions").select("day_number").eq("user_id", user.id),
    service.from("story_submissions").select("id").eq("user_id", user.id).eq("submission_date", getMiamiStoryDate()).maybeSingle(),
    service.from("rafaga_missions")
      .select("id, title, description, starts_at, duration_minutes, points_reward")
      .eq("is_active", true)
      .gte("starts_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: false }),
    service.from("rafaga_submissions").select("rafaga_id").eq("user_id", user.id),
  ]);

  const isAdmin = (userRow.data as { is_admin?: boolean } | null)?.is_admin ?? false;
  const refLink = refCode ? referralLink(refCode) : null;
  const mission = (missionRow.data as Mission | null) ?? null;

  // Check mission done
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

  const kwSet = new Set(
    ((keywordsRows.data ?? []) as { day_number: number }[]).map((r) => r.day_number)
  );
  const doneKwSet = new Set(
    ((keywordSubsRows.data ?? []) as { day_number: number }[]).map((r) => r.day_number)
  );
  const keywordDays = [1, 2, 3, 4].map((d) => ({
    day_number: d,
    hasKeyword: kwSet.has(d),
    done: doneKwSet.has(d),
  }));

  const storyDoneToday = !!(storyRow.data);
  const rafagas = (rafagaRows.data ?? []) as RafagaMission[];
  const rafagaClaimedIds = ((rafagaSubsRows.data ?? []) as { rafaga_id: string }[]).map((r) => r.rafaga_id);

  return { isAdmin, refLink, mission, missionDone, keywordDays, storyDoneToday, rafagas, rafagaClaimedIds };
}

export default async function SumaPuntosPage() {
  const ctx = await getContext();

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm transition-colors"
        style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}
      >
        ← Dashboard
      </Link>

      <div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--primary)" }}>
          GovBidder Challenge
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800, color: "var(--foreground)", margin: "4px 0 0" }}>
          ⚡ Misiones Extra
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6 }}>
          Completa estas misiones para ganar XP adicional y subir en el ranking.
        </p>
      </div>

      {ctx.isAdmin && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
          👁️ Vista admin · gestionar en <Link href="/admin" style={{ color: "var(--primary)" }}>/admin</Link>
        </p>
      )}

      {/* 1. Referidos */}
      {ctx.refLink && (
        <section className="space-y-3">
          <SectionHeader emoji="🤝" title="Invita y gana" subtitle={`+${REFERRAL_LEAD_XP.toLocaleString()} pts por cada persona que invitas al lanzamiento`} />
          <ReferralLinkCard link={ctx.refLink} xp={REFERRAL_LEAD_XP} />
        </section>
      )}

      {/* 2. Palabras Clave */}
      <section className="space-y-3">
        <SectionHeader emoji="📞" title="Palabras Clave de Llamadas" subtitle="+1,000 pts por keyword · una vez por día de llamada" />
        <KeywordCards days={ctx.keywordDays} />
      </section>

      {/* 3. Historia Diaria */}
      <section className="space-y-3">
        <SectionHeader emoji="📸" title="Historia Diaria" subtitle="+500 pts · se reinicia cada día a la mañana" />
        <StoryUpload alreadyDone={ctx.storyDoneToday} />
      </section>

      {/* 4. Misiones Diarias */}
      <section className="space-y-3">
        <SectionHeader emoji="🎯" title="Misión Diaria" subtitle="Completa la misión del día y suma XP extra" />
        {ctx.mission ? (
          <DailyMissionUser mission={ctx.mission} alreadyDone={ctx.missionDone} />
        ) : (
          <div style={{
            padding: "18px 20px",
            background: "var(--muted)",
            border: "1px dashed var(--border)",
            borderRadius: 12,
          }}>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
              {ctx.isAdmin
                ? <>No hay misión activa. Publícala desde <Link href="/admin" style={{ color: "var(--primary)", fontWeight: 700 }}>Panel Admin → Misiones Diarias</Link>.</>
                : "No hay misión activa por el momento. Vuelve más tarde."}
            </p>
          </div>
        )}
      </section>

      {/* 5. Misiones Ráfaga */}
      <section className="space-y-3">
        <SectionHeader emoji="⚡" title="Misiones Ráfaga" subtitle="+1,000 pts · ventanas de 2 horas programadas por el admin" />
        <RafagaSection rafagas={ctx.rafagas} claimedIds={ctx.rafagaClaimedIds} />
      </section>
    </div>
  );
}

// ─── Header de sección ────────────────────────────────────────────────────────
function SectionHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div>
      <p style={{
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: "var(--muted-foreground)", marginBottom: 2,
      }}>
        {emoji} {title}
      </p>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, opacity: 0.85 }}>
        {subtitle}
      </p>
    </div>
  );
}
