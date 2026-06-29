"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Download, Loader2, Sparkles, FileText, ArrowRight, Pencil, Lock, Gift, ChevronDown } from "lucide-react";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { PortalsAccordion } from "@/components/portals-accordion";
import { WizardModal } from "@/components/wizard-modal";
import { useMissionsDone } from "@/lib/hooks/use-missions-done";
import type { Database } from "@/lib/supabase/types";
import type { CapabilityStatementData } from "@/app/api/ai/generate-capability-statement/route";
import { DevTestBar } from "@/components/dev-test-bar";

type CompanyProfile = Database["public"]["Tables"]["company_profiles"]["Row"];
type NaicsExpansion = Database["public"]["Tables"]["naics_expansions"]["Row"];
type CapabilityStatement = Database["public"]["Tables"]["capability_statements"]["Row"];
type SorteoSubmission = Database["public"]["Tables"]["sorteo_submissions"]["Row"];

const LOADING_STEPS = [
  "Procesando tu perfil estratégico completo...",
  "Alineando con tus códigos NAICS y PSC...",
  "Redactando el Company Overview en lenguaje de Contracting Officer...",
  "Identificando tus Core Competencies...",
  "Formulando tus diferenciadores...",
  "Ensamblando tu Capability Statement profesional...",
];


// Número de WhatsApp del equipo para solicitar el certificado (solo dígitos, con
// código de país, sin "+"). Configurable por env NEXT_PUBLIC_CERT_WHATSAPP.
const CERT_WHATSAPP = (process.env.NEXT_PUBLIC_CERT_WHATSAPP ?? "17329645246").replace(/\D/g, "");

// 5 variantes de distinto tono — se elige una al azar al solicitar el certificado.
const CERT_REQUEST_MESSAGES: ((name: string) => string)[] = [
  (n) => `Hola, soy ${n}. Acabo de completar el GovBidder Challenge y paso por aquí para solicitar mi certificado. ¡Gracias!`,
  (n) => `Hola equipo de GovBidder, soy ${n}. Ya terminé el GovBidder Challenge y quiero solicitar mi certificado de participación. ¡Gracias por el apoyo!`,
  (n) => `¡Hola! Soy ${n}. Completé los 4 días del GovBidder Challenge y me encantaría recibir mi certificado. ¿Me ayudan?`,
  (n) => `Hola, mi nombre es ${n}. He completado satisfactoriamente el GovBidder Challenge y quisiera solicitar la emisión de mi certificado de participación. Quedo atento. ¡Muchas gracias!`,
  (n) => `Saludos, equipo de GovBidder. Soy ${n} y completé el GovBidder Challenge. Por este medio solicito mi certificado correspondiente. Muchas gracias por la oportunidad.`,
];

interface Dia4ClientProps {
  userId: string;
  isCompleted: boolean;
  existingStatement: CapabilityStatement | null;
  existingSorteo: SorteoSubmission | null;
  profile: CompanyProfile | null;
  expansion: NaicsExpansion | null;
  fullName: string;
  accessExpiresAt: string | null;
  devMode?: boolean;
}

export function Dia4Client({
  userId,
  isCompleted: initCompleted,
  existingStatement,
  profile,
  expansion,
  fullName,
  devMode,
}: Dia4ClientProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(initCompleted);
  const [generating, setGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [statement, setStatement] = useState<CapabilityStatementData | null>(
    existingStatement ? (existingStatement.statement_data as CapabilityStatementData) : null
  );
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Company registration data for a complete Capability Statement
  const p = (profile ?? {}) as Record<string, unknown>;
  const [companyForm, setCompanyForm] = useState({
    uei: (p.uei as string) ?? "",
    cage_code: (p.cage_code as string) ?? "",
    phone: (p.phone as string) ?? "",
    website: (p.website as string) ?? "",
  });
  const [hasGovContracts, setHasGovContracts] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { missionsDone } = useMissionsDone(4, devMode);
  const [bonusOpen, setBonusOpen] = useState(false);
  const setCompanyField = (field: keyof typeof companyForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setCompanyForm((prev) => ({ ...prev, [field]: e.target.value }));

  useEffect(() => () => { if (loadingRef.current) clearInterval(loadingRef.current); }, []);

  function startLoadingCycle() {
    setLoadingStep(0);
    let step = 0;
    loadingRef.current = setInterval(() => {
      step = (step + 1) % LOADING_STEPS.length;
      setLoadingStep(step);
    }, 1800);
  }

  function stopLoadingCycle() {
    if (loadingRef.current) { clearInterval(loadingRef.current); loadingRef.current = null; }
    setLoadingStep(0);
  }

  async function handleGenerate() {
    if (!profile) {
      toast.error("Completa el Día 1 primero.");
      return;
    }
    setGenerating(true);
    startLoadingCycle();

    try {
      const supabase = createClient();

      // Persist the registration data so it shows on the PDF and survives reloads
      await supabase.from("company_profiles").update({
        uei: companyForm.uei.trim() || null,
        cage_code: companyForm.cage_code.trim() || null,
        phone: companyForm.phone.trim() || null,
        website: companyForm.website.trim() || null,
      } as Record<string, unknown>).eq("user_id", userId);

      const relatedCodes = (expansion?.related_codes as Array<{ code: string; description: string; type: string }>) ?? [];
      const res = await fetch("/api/ai/generate-capability-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: profile.company_name,
          niche: profile.niche ?? "",
          problemSolved: profile.problem_solved ?? "",
          targetAvatar: profile.target_avatar ?? "",
          primaryNaics: profile.primary_naics ?? "",
          relatedCodes,
          keywordsExpanded: expansion?.keywords_expanded ?? [],
          yearFounded: profile.year_founded ?? undefined,
          employeeCount: profile.employee_count ?? undefined,
          usState: (p.us_state as string) ?? undefined,
          legalStructure: (p.legal_structure as string) ?? undefined,
          certifications: (p.existing_certifications as string[]) ?? undefined,
          hasGovernmentContracts: hasGovContracts,
        }),
      });

      if (!res.ok) {
        let msg = "API error";
        try { const e = await res.json(); msg = e?.message || e?.error || msg; } catch { /* keep */ }
        throw new Error(msg);
      }
      const data: CapabilityStatementData = await res.json();
      setStatement(data);

      const { error } = await supabase.from("capability_statements").upsert(
        { user_id: userId, statement_data: data },
        { onConflict: "user_id" }
      );

      if (error) throw new Error(error.message);

      // Marcar día 4 como completado + otorgar XP (idempotente)
      const xpRes = await fetch("/api/xp/complete-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: 4 }),
      });
      if (!xpRes.ok) throw new Error("Error al marcar día completo");
      const xpData: { ok: boolean; pointsAwarded: number; total: number; alreadyCompleted: boolean } =
        await xpRes.json();
      if (xpData.pointsAwarded > 0) {
        window.dispatchEvent(
          new CustomEvent("xp-gained", {
            detail: { delta: xpData.pointsAwarded, total: xpData.total, source: "day" },
          })
        );
      }

      setIsCompleted(true);
      setWizardOpen(false);
      router.refresh(); // refresca tabs + sidebar (server components) con el progreso nuevo
      toast.success("¡Capability Statement generado!");
    } catch (err) {
      const msg = err instanceof Error && err.message && err.message !== "API error"
        ? err.message
        : "Estamos teniendo un problema. Intenta de nuevo.";
      toast.error(msg);
    } finally {
      stopLoadingCycle();
      setGenerating(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const res = await fetch("/api/pdf/capability-statement");
      if (!res.ok) throw new Error("PDF error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "govbidder-capability-statement.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al generar el PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  // El certificado lo emite el equipo (firmado por Santo). El botón abre WhatsApp
  // con un mensaje pre-armado (uno de 5 tonos, al azar) para solicitarlo.
  function handleRequestCertificate() {
    const name = (fullName || "").trim();
    const build = CERT_REQUEST_MESSAGES[Math.floor(Math.random() * CERT_REQUEST_MESSAGES.length)];
    const text = encodeURIComponent(build(name));
    const base = CERT_WHATSAPP ? `https://wa.me/${CERT_WHATSAPP}` : "https://wa.me/";
    window.open(`${base}?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-8">
      {devMode && <DevTestBar day={4} isCompleted={isCompleted} />}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-amber-100 text-amber-700">Día 4</Badge>
          {isCompleted && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Completado
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold text-primary">Capability Statement</h1>
        <p className="text-muted-foreground mt-1">
          Genera tu Capability Statement profesional y compite por los premios finales.
        </p>
      </div>

      {/* Generar Capability Statement — launch / resultado */}
      {!statement ? (
        !missionsDone ? (
          <Card>
            <CardContent className="py-8 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <Lock className="w-6 h-6" style={{ color: "var(--muted-foreground)" }} />
              </div>
              <div>
                <p className="font-semibold text-lg">La tarea se desbloquea luego de realizar la misión</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Mira los videos de la misión de hoy y responde las preguntas para desbloquear la tarea.
                </p>
              </div>
              <Button disabled className="gap-2 h-12 px-7 text-base font-bold">
                <Lock className="w-4 h-4" /> Generar mi Capability Statement — Día 4
              </Button>
            </CardContent>
          </Card>
        ) : (
        <Card>
          <CardContent className="py-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <FileText className="w-6 h-6" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <p className="font-semibold text-lg">Genera tu Capability Statement</p>
              <p className="text-sm text-muted-foreground mt-1">
                En 2 pasos guiados armamos el documento que un Contracting Officer lee en 60 segundos. Usa toda tu data de los Días 1–3.
              </p>
            </div>
            <Button onClick={() => setWizardOpen(true)} className="gap-2 h-12 px-7 text-base font-bold" disabled={generating}>
              Generar mi Capability Statement — Día 4 <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
        )
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl p-5 space-y-4 bg-card">
              {/* Header */}
              <div className="border-b pb-3">
                <p className="text-xl font-bold text-primary">{profile?.company_name ?? "Your Company"}</p>
                <p className="font-medium italic" style={{ color: "var(--secondary)" }}>{statement.tagline}</p>
                {statement.service_categories?.length ? (
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                    {statement.service_categories.join("  |  ")}
                  </p>
                ) : null}
              </div>

              {/* Company Overview */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Company Overview</p>
                <p className="text-sm">{statement.company_overview}</p>
              </div>

              {/* Core Competencies */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Core Competencies</p>
                  <ul className="space-y-1">
                    {statement.core_competencies.map((c, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="font-bold mt-0.5" style={{ color: "var(--secondary)" }}>•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Differentiators</p>
                  <ul className="space-y-1">
                    {statement.differentiators.map((d, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="font-bold mt-0.5" style={{ color: "var(--accent)" }}>★</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Quality Commitment */}
              {statement.quality_commitment ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Quality Commitment</p>
                  <p className="text-sm">{statement.quality_commitment}</p>
                </div>
              ) : null}

              {/* Past Performance */}
              {statement.past_performance ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Past Performance</p>
                  <p className="text-sm">{statement.past_performance}</p>
                </div>
              ) : null}

              {/* NAICS & PSC with descriptions */}
              <div className="border-t pt-3 grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">NAICS Codes</p>
                  <ul className="space-y-1.5">
                    {(statement.naics_with_desc?.length
                      ? statement.naics_with_desc
                      : statement.naics_codes.map((c) => ({ code: c, description: "" }))
                    ).map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Badge className="bg-blue-100 text-blue-700 text-[10px] tabular-nums shrink-0">{c.code}</Badge>
                        {c.description ? <span className="text-muted-foreground">{c.description}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">PSC Codes</p>
                  <ul className="space-y-1.5">
                    {(statement.psc_with_desc?.length
                      ? statement.psc_with_desc
                      : statement.psc_codes.map((c) => ({ code: c, description: "" }))
                    ).map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Badge className="bg-purple-100 text-purple-700 text-[10px] shrink-0">{c.code}</Badge>
                        {c.description ? <span className="text-muted-foreground">{c.description}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Primary markets */}
              {statement.primary_markets?.length ? (
                <div className="border-t pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Primary Markets</p>
                  <p className="text-sm font-semibold text-primary">{statement.primary_markets.join("  |  ")}</p>
                </div>
              ) : null}
          </div>

          {/* Descargar PDF */}
          <Card>
            <CardContent className="flex items-center justify-between py-5">
              <div>
                <p className="font-semibold">📄 Capability Statement PDF</p>
                <p className="text-sm text-muted-foreground">Formato profesional listo para enviar.</p>
              </div>
              <Button onClick={handleDownloadPdf} disabled={downloadingPdf} style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>
                {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-2" /> Descargar</>}
              </Button>
            </CardContent>
          </Card>

          {/* Editar */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setWizardOpen(true)} className="gap-2" disabled={generating}>
              <Pencil className="w-4 h-4" /> Editar mi Capability Statement
            </Button>
          </div>
        </div>
      )}

      {/* Cierre del challenge — felicitación + puente a "Tu próximo paso" */}
      {statement && (
        <Card className="border-primary/30">
          <CardContent className="py-8 text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <h2 className="text-xl font-bold">¡Felicidades! Ya completaste el GovBidder Challenge</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Ya tienes las bases para comenzar a buscar oportunidades gubernamentales.
            </p>
            <p className="text-sm font-semibold">Ahora viene la decisión más importante:</p>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              ¿Vas a intentar conseguir tu primer contrato por tu cuenta… o prefieres acelerar el proceso con acompañamiento?
            </p>
            <Button onClick={() => router.push("/dashboard/proximo-paso")} className="h-12 px-8 font-bold gap-2">
              Siguiente <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Premio: portales para encontrar oportunidades (se desbloquea al completar el Día 4) ── */}
      {(() => {
        const unlocked = isCompleted || !!statement;
        return (
          <div>
            <button
              type="button"
              onClick={() => unlocked && setBonusOpen((v) => !v)}
              disabled={!unlocked}
              aria-expanded={bonusOpen}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14,
                padding: "18px 22px", borderRadius: 16, border: "none",
                cursor: unlocked ? "pointer" : "not-allowed",
                background: unlocked
                  ? "linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)"
                  : "var(--muted)",
                color: unlocked ? "#fff" : "var(--muted-foreground)",
                boxShadow: unlocked ? "0 10px 30px -10px color-mix(in srgb, var(--primary) 55%, transparent)" : "none",
                opacity: unlocked ? 1 : 0.85,
              }}
            >
              <span style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: unlocked ? "rgba(255,255,255,0.18)" : "var(--card)",
              }}>
                {unlocked ? <Gift className="w-6 h-6" style={{ color: "#FFD700" }} /> : <Lock className="w-5 h-5" />}
              </span>
              <span style={{ flex: 1, textAlign: "left" }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 16 }}>
                  {unlocked ? "🎁 Tu premio: grants y subvenciones del gobierno" : "Premio bloqueado"}
                </span>
                <span style={{ display: "block", fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                  {unlocked
                    ? (bonusOpen ? "Toca para ocultar los grants" : "Toca para desplegar los grants federales, estatales y locales")
                    : "Completa la tarea del Día 4 para desbloquearlo"}
                </span>
              </span>
              {unlocked && (
                <ChevronDown className="w-5 h-5" style={{ flexShrink: 0, transform: bonusOpen ? "rotate(180deg)" : "none", transition: "transform var(--dur-fast) var(--ease-out)" }} />
              )}
            </button>

            {unlocked && bonusOpen && (
              <div className="gb-preview-reveal" style={{ marginTop: 14 }}>
                <PortalsAccordion categories={["grants_estatal", "grants_federal"]} />
              </div>
            )}
          </div>
        );
      })()}

      {/* Certificado */}
      {isCompleted && (
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="text-center py-8 space-y-4">
            <div className="text-5xl">🏆</div>
            <h2 className="text-2xl font-bold">¡Completaste el Programa! 🎉</h2>
            <p className="text-primary-foreground/80">
              Hola <strong>{fullName}</strong>, completaste los 4 días del programa.
              Ya tienes las herramientas para aplicar por grants y contratos gubernamentales.
            </p>
            <div className="flex justify-center">
              <WhatsAppButton onClick={handleRequestCertificate}>
                Solicitar certificado
              </WhatsAppButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Puente a la mentoría premium */}
      {isCompleted && (
        <Card style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)", background: "color-mix(in srgb, var(--accent) 7%, var(--card))" }}>
          <CardContent className="py-6 space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 flex-shrink-0" style={{ color: "var(--accent)" }} />
              <div>
                <h3 className="font-bold text-lg">¿Y ahora? De tener las herramientas a ganar el contrato</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ya tienes tu perfil, tus códigos, tu presencia y tu Capability Statement. Lo que separa a
                  quienes ganan su primer contrato de quienes no, son <strong>3 cosas</strong>:
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-sm pl-9">
              <li className="flex items-start gap-2">
                <span className="font-bold" style={{ color: "var(--secondary)" }}>1.</span>
                Un <strong>teaming agreement</strong> con un prime que ya tiene past performance federal.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold" style={{ color: "var(--secondary)" }}>2.</span>
                Responder un <strong>Sources Sought activo</strong> en los próximos 30 días.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold" style={{ color: "var(--secondary)" }}>3.</span>
                Hacer el <strong>follow-up correcto</strong> con un Contracting Officer sin parecer amateur.
              </li>
            </ul>
            <div
              className="rounded-lg p-3 text-sm"
              style={{ background: "color-mix(in srgb, var(--secondary) 7%, var(--card))", border: "1px solid color-mix(in srgb, var(--secondary) 22%, transparent)" }}
            >
              En la mentoría <strong>&ldquo;Tu Primer Contrato&rdquo;</strong> trabajamos tu caso específico hasta
              que respondas tu primera oportunidad real y tengas al menos un CO que te conozca por nombre.
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Wizard modal — datos de empresa + experiencia ── */}
      <WizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Día 4 — Capability Statement"
        subtitle="Suma tus datos de registro y generamos el documento."
        finishLabel={statement ? "Editar documento" : "Generar mi Capability Statement"}
        finishing={generating}
        onFinish={() => handleGenerate()}
        steps={[
          {
            label: "Datos de tu empresa",
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Estos datos van en el documento para que un Contracting Officer pueda verificar tu registro. Todos son opcionales.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">UEI (SAM.gov)</label>
                    <input value={companyForm.uei} onChange={setCompanyField("uei")} placeholder="Ej: ABC123DEF456" maxLength={12}
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CAGE Code</label>
                    <input value={companyForm.cage_code} onChange={setCompanyField("cage_code")} placeholder="Ej: 1A2B3" maxLength={5}
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Teléfono de negocio</label>
                    <input value={companyForm.phone} onChange={setCompanyField("phone")} placeholder="Ej: (844) 555-0100"
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Website</label>
                    <input value={companyForm.website} onChange={setCompanyField("website")} placeholder="www.tuempresa.com"
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              </div>
            ),
          },
          {
            label: "Tu experiencia",
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Esto nos ayuda a redactar mejor la sección <strong>Past Performance</strong> del documento.
                </p>
                <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm cursor-pointer hover:bg-muted/40 transition-colors">
                  <input type="checkbox" checked={hasGovContracts} onChange={(e) => setHasGovContracts(e.target.checked)} className="accent-primary w-4 h-4" />
                  Ya tuve contratos con el gobierno
                </label>
                {generating && (
                  <p className="text-xs text-center text-muted-foreground">{LOADING_STEPS[loadingStep]}</p>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
