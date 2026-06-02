"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Download, Loader2, Trophy, Upload, PlayCircle, Search, Send, Sparkles } from "lucide-react";
import { JoinCallButton } from "@/components/join-call-button";
import { isExpired } from "@/lib/utils";
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
  existingSorteo,
  profile,
  expansion,
  fullName,
  accessExpiresAt,
  devMode,
}: Dia4ClientProps) {
  const [isCompleted, setIsCompleted] = useState(initCompleted);
  const [generating, setGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [statement, setStatement] = useState<CapabilityStatementData | null>(
    existingStatement ? (existingStatement.statement_data as CapabilityStatementData) : null
  );
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sorteoEligible, setSorteoEligible] = useState(existingSorteo?.eligible ?? false);
  const sorteoExpired = isExpired(accessExpiresAt);

  const primaryNaics = profile?.primary_naics ?? "";

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
      toast.error("Completá el Día 1 primero.");
      return;
    }
    setGenerating(true);
    startLoadingCycle();

    try {
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
          yearFounded: profile.year_founded,
          employeeCount: profile.employee_count,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data: CapabilityStatementData = await res.json();
      setStatement(data);

      const supabase = createClient();
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
      toast.success("¡Capability Statement generado!");
    } catch {
      toast.error("Estamos teniendo un problema. Intentá de nuevo.");
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

  async function handleDownloadCertificate() {
    setDownloadingCert(true);
    try {
      const res = await fetch("/api/pdf/certificate");
      if (!res.ok) throw new Error("PDF error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "govbidder-certificado-finalizacion.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al generar el certificado.");
    } finally {
      setDownloadingCert(false);
    }
  }

  async function handleUploadSorteo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const supabase = createClient();
      const path = `${userId}/sorteo-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("deliverables")
        .upload(path, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { error: dbError } = await supabase.from("sorteo_submissions").upsert(
        {
          user_id: userId,
          all_deliverables_uploaded: true,
          submitted_at: new Date().toISOString(),
          eligible: !sorteoExpired,
          storage_path: path,
        },
        { onConflict: "user_id" }
      );

      if (dbError) throw new Error(dbError.message);

      setSorteoEligible(!sorteoExpired);
      toast.success(
        sorteoExpired
          ? "Entregable subido (fuera del plazo, no elegible para los premios)."
          : "¡Entregable subido! Ya estás compitiendo por los premios."
      );
    } catch {
      toast.error("Error al subir el archivo. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
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
        <h1 className="text-2xl font-bold text-primary">Capability Statement + Cierre</h1>
        <p className="text-muted-foreground mt-1">
          Generá tu Capability Statement profesional y competí por los premios finales.
        </p>
      </div>

      <Card className="border-amber-100 bg-amber-50/50">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <PlayCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Clase en vivo — Día 4 (Q&A)</p>
            <p className="text-sm text-muted-foreground">La clase de cierre y preguntas en vivo.</p>
          </div>
          <JoinCallButton day={4} />
        </CardContent>
      </Card>

      {/* Generar Capability Statement */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Tu Capability Statement</CardTitle>
          <CardDescription>
            El documento que presentás ante oficiales de compras del gobierno.
            Se genera automáticamente con toda tu data acumulada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGenerate}
            className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90"
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {LOADING_STEPS[loadingStep]}
              </>
            ) : statement ? (
              "Regenerar Capability Statement"
            ) : (
              "Generar mi Capability Statement →"
            )}
          </Button>
          {generating && (
            <div className="flex gap-1.5 justify-center">
              {LOADING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === loadingStep ? "24px" : "8px",
                    background: i <= loadingStep ? "#D7263D" : "#1E3A5C",
                  }}
                />
              ))}
            </div>
          )}

          {statement && (
            <div className="mt-4 border rounded-xl p-5 space-y-4 bg-card">
              {/* Header */}
              <div className="border-b pb-3">
                <p className="text-xl font-bold text-primary">{profile?.company_name ?? "Your Company"}</p>
                <p className="text-accent font-medium italic">{statement.tagline}</p>
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
                        <span className="text-accent font-bold mt-0.5">•</span>
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
                        <span className="text-accent font-bold mt-0.5">★</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* NAICS & PSC */}
              <div className="border-t pt-3 grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">NAICS Codes</p>
                  <div className="flex flex-wrap gap-1">
                    {statement.naics_codes.map((c) => (
                      <Badge key={c} className="bg-blue-100 text-blue-700 text-xs">{c}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">PSC Codes</p>
                  <div className="flex flex-wrap gap-1">
                    {statement.psc_codes.map((c) => (
                      <Badge key={c} className="bg-purple-100 text-purple-700 text-xs">{c}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground border-t pt-2">{statement.contact_placeholder}</p>
            </div>
          )}

          {statement && (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="flex items-center justify-between py-5">
                <div>
                  <p className="font-semibold">📄 Capability Statement PDF</p>
                  <p className="text-sm text-muted-foreground">Formato profesional listo para enviar.</p>
                </div>
                <Button onClick={handleDownloadPdf} disabled={downloadingPdf} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-2" /> Descargar</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Próximos pasos — qué hacer con el Capability Statement */}
      {statement && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚀 Ya tenés tu Capability Statement — esto es lo que sigue
            </CardTitle>
            <CardDescription>
              Tu documento está listo. Estas son las 3 acciones que hacen la diferencia esta semana.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                n: 1,
                icon: <Upload className="w-4 h-4" />,
                title: "Subí tu CS a SAM.gov",
                desc: "Adjuntá tu Capability Statement en tu perfil para que los Contracting Officers lo encuentren.",
                cta: "Ir a SAM.gov",
                href: "https://sam.gov/profile/about",
              },
              {
                n: 2,
                icon: <Search className="w-4 h-4" />,
                title: "Buscá Sources Sought activos en tu NAICS",
                desc: "Las agencias evalúan el mercado antes de licitar. Respondé y entrás al radar antes que la competencia.",
                cta: "Ver oportunidades",
                href: primaryNaics
                  ? `https://sam.gov/search/?index=opp&naicsCode=${primaryNaics}`
                  : "https://sam.gov/search/?index=opp",
              },
              {
                n: 3,
                icon: <Send className="w-4 h-4" />,
                title: "Enviá tu CS a prime contractors",
                desc: "El subcontrato es la entrada más rápida. Buscá empresas que ya ganan en tu NAICS y ofrecéte como socio.",
                cta: "Buscar primes",
                href: "https://dsbs.sba.gov/search/dsp_dsbs.cfm",
              },
            ].map((step) => (
              <div
                key={step.n}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: "rgba(0,86,214,0.1)", color: "#0056D6", border: "1px solid rgba(0,86,214,0.25)" }}
                >
                  {step.n}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
                <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                  <a href={step.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                    {step.icon} <span className="hidden sm:inline">{step.cta}</span>
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sorteo */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Competir por Premios
          </CardTitle>
          <CardDescription>
            Subí tus entregables (PDFs de los 4 días o screenshots) para participar.
            {sorteoExpired && (
              <span className="text-destructive ml-1">
                El plazo de 7 días expiró — podés subir pero no serás elegible para los premios.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sorteoEligible ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">¡Estás compitiendo por los premios!</p>
                <p className="text-sm text-green-700">Tu entregable fue recibido. Buena suerte.</p>
              </div>
            </div>
          ) : (
            <div>
              <label className="w-full">
                <div className="border-2 border-dashed border-amber-300 rounded-xl p-8 text-center cursor-pointer hover:bg-amber-50 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-amber-500 mb-3" />
                      <p className="font-semibold">Subir entregable del Challenge</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PDF combinado o screenshots de los 4 días completados
                      </p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.zip"
                  className="hidden"
                  onChange={handleUploadSorteo}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificado */}
      {isCompleted && (
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="text-center py-8 space-y-4">
            <div className="text-5xl">🏆</div>
            <h2 className="text-2xl font-bold">¡Completaste el Programa! 🎉</h2>
            <p className="text-primary-foreground/80">
              Hola <strong>{fullName}</strong>, completaste los 4 días del programa.
              Ya tenés las herramientas para empezar a venderle al gobierno.
            </p>
            <Button
              onClick={handleDownloadCertificate}
              disabled={downloadingCert}
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold h-12 px-8"
            >
              {downloadingCert ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar mi Certificado
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Puente a la mentoría premium */}
      {isCompleted && (
        <Card style={{ borderColor: "rgba(255,214,10,0.35)", background: "rgba(255,214,10,0.04)" }}>
          <CardContent className="py-6 space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 flex-shrink-0" style={{ color: "#FFD60A" }} />
              <div>
                <h3 className="font-bold text-lg">¿Y ahora? De tener las herramientas a ganar el contrato</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ya tenés tu perfil, tus códigos, tu presencia y tu Capability Statement. Lo que separa a
                  quienes ganan su primer contrato de quienes no, son <strong>3 cosas</strong>:
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-sm pl-9">
              <li className="flex items-start gap-2">
                <span style={{ color: "#FFD60A" }}>1.</span>
                Un <strong>teaming agreement</strong> con un prime que ya tiene past performance federal.
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: "#FFD60A" }}>2.</span>
                Responder un <strong>Sources Sought activo</strong> en los próximos 30 días.
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: "#FFD60A" }}>3.</span>
                Hacer el <strong>follow-up correcto</strong> con un Contracting Officer sin parecer amateur.
              </li>
            </ul>
            <div
              className="rounded-lg p-3 text-sm"
              style={{ background: "rgba(0,86,214,0.06)", border: "1px solid rgba(0,86,214,0.2)" }}
            >
              En la mentoría <strong>&ldquo;Tu Primer Contrato&rdquo;</strong> trabajamos tu caso específico hasta
              que respondas tu primera oportunidad real y tengas al menos un CO que te conozca por nombre.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
