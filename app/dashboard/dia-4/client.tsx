"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Download, ExternalLink, Loader2, Trophy, Upload, PlayCircle } from "lucide-react";
import { JoinCallButton } from "@/components/join-call-button";
import { isExpired } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";
import type { CapabilityStatementData } from "@/app/api/ai/generate-capability-statement/route";
import { DevTestBar } from "@/components/dev-test-bar";

type CompanyProfile = Database["public"]["Tables"]["company_profiles"]["Row"];
type NaicsExpansion = Database["public"]["Tables"]["naics_expansions"]["Row"];
type CapabilityStatement = Database["public"]["Tables"]["capability_statements"]["Row"];
type SorteoSubmission = Database["public"]["Tables"]["sorteo_submissions"]["Row"];

const GRANTS_PORTALS = [
  { name: "Grants.gov", url: "https://grants.gov", description: "Portal oficial de grants federales" },
  { name: "SBIR.gov", url: "https://sbir.gov", description: "Grants para investigación y desarrollo en pequeñas empresas" },
  { name: "SBA Grants", url: "https://sba.gov/funding-programs/grants", description: "Subvenciones de la Small Business Administration" },
  { name: "Economic Development Administration", url: "https://eda.gov", description: "Grants para desarrollo económico" },
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
  const [statement, setStatement] = useState<CapabilityStatementData | null>(
    existingStatement ? (existingStatement.statement_data as CapabilityStatementData) : null
  );
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sorteoEligible, setSorteoEligible] = useState(existingSorteo?.eligible ?? false);
  const sorteoExpired = isExpired(accessExpiresAt);

  async function handleGenerate() {
    if (!profile) {
      toast.error("Completá el Día 1 primero.");
      return;
    }
    setGenerating(true);

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

      await supabase
        .from("day_progress")
        // @ts-ignore
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("day_number", 4);

      setIsCompleted(true);
      toast.success("¡Capability Statement generado!");
    } catch {
      toast.error("Estamos teniendo un problema. Intentá de nuevo.");
    } finally {
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
          ? "Entregable subido (fuera del plazo, no elegible para el sorteo)."
          : "¡Entregable subido! Ya estás participando del sorteo."
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
          Generá tu Capability Statement profesional y participá del sorteo final.
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
                Generando con IA...
              </>
            ) : statement ? (
              "Regenerar Capability Statement"
            ) : (
              "Generar mi Capability Statement →"
            )}
          </Button>

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

      {/* Grants */}
      <Card>
        <CardHeader>
          <CardTitle>💰 Portales de Grants</CardTitle>
          <CardDescription>Oportunidades de financiamiento que no requieren devolución.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {GRANTS_PORTALS.map((portal) => (
              <div key={portal.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-semibold text-sm">{portal.name}</p>
                  <p className="text-xs text-muted-foreground">{portal.description}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={portal.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                    Ir <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sorteo */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Participar del Sorteo
          </CardTitle>
          <CardDescription>
            Subí tus entregables (PDFs de los 4 días o screenshots) para participar.
            {sorteoExpired && (
              <span className="text-destructive ml-1">
                El plazo de 7 días expiró — podés subir pero no serás elegible.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sorteoEligible ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">¡Estás participando del sorteo!</p>
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
            <h2 className="text-2xl font-bold">¡Completaste el Govbidder Code Challenge!</h2>
            <p className="text-primary-foreground/80">
              Hola <strong>{fullName}</strong>, completaste los 4 días del challenge.
              Ya tenés las herramientas para empezar a venderle al gobierno federal.
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
    </div>
  );
}
