"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Copy, Download, ExternalLink, Globe, Loader2, PlayCircle, ArrowRight } from "lucide-react";
import { JoinCallButton } from "@/components/join-call-button";
import type { Database } from "@/lib/supabase/types";
import { DevTestBar } from "@/components/dev-test-bar";

type CompanyProfile = Database["public"]["Tables"]["company_profiles"]["Row"];
type WebPreview = Database["public"]["Tables"]["web_previews"]["Row"];

interface WebResult {
  html: string;
  css: string;
}

type PortalTier = "obligatorio" | "alto" | "oportunista";

interface Portal {
  name: string;
  url: string;
  description: string;
  tier: PortalTier;
  prereq?: string;
}

const PORTALS: Portal[] = [
  // ── Tier 1: Obligatorios — sin esto no podés contratar ──
  { name: "SAM.gov", url: "https://sam.gov", description: "Registro federal obligatorio. Tu UEI y CAGE Code salen de acá.", tier: "obligatorio", prereq: "EIN / Tax ID + datos bancarios (ACH)" },
  { name: "SBA Dynamic Small Business Search", url: "https://dsbs.sba.gov/search/dsp_dsbs.cfm", description: "Directorio donde los Contracting Officers buscan small businesses.", tier: "obligatorio", prereq: "Registro activo en SAM.gov" },
  // ── Tier 2: Alto ROI ──
  { name: "GSA eBuy", url: "https://www.ebuy.gsa.gov", description: "RFQs de agencias buscando proveedores. Alto volumen de servicios.", tier: "alto", prereq: "Registro en SAM.gov" },
  { name: "USASpending.gov", url: "https://usaspending.gov", description: "Investigá quién gana contratos en tu NAICS y por cuánto.", tier: "alto" },
  { name: "GSA Advantage", url: "https://gsaadvantage.gov", description: "Catálogo de compras pre-aprobadas del gobierno.", tier: "alto" },
  // ── Tier 3: Oportunistas ──
  { name: "Grants.gov", url: "https://grants.gov", description: "Subvenciones federales (proceso distinto a contratos).", tier: "oportunista" },
  { name: "SBA.gov", url: "https://sba.gov", description: "Certificaciones (8a, WOSB, HUBZone) y recursos para small business.", tier: "oportunista" },
];

const TIER_META: Record<PortalTier, { label: string; color: string; bg: string; border: string; desc: string }> = {
  obligatorio: { label: "OBLIGATORIO", color: "#D7263D", bg: "rgba(215,38,61,0.08)", border: "rgba(215,38,61,0.3)", desc: "Sin estos registros no podés recibir un contrato. Empezá por acá." },
  alto:        { label: "ALTO ROI",    color: "#0056D6", bg: "rgba(0,86,214,0.06)",  border: "rgba(0,86,214,0.25)",  desc: "Donde están las oportunidades reales para tu perfil." },
  oportunista: { label: "OPORTUNISTA", color: "#8DA2C4", bg: "rgba(90,107,133,0.06)", border: "rgba(90,107,133,0.25)", desc: "Útiles según tu situación específica." },
};

const LOADING_STEPS = [
  "Analizando tu Perfil Estratégico...",
  "Traduciendo tus servicios a lenguaje de procurement...",
  "Redactando el Hero en tono gubernamental...",
  "Generando About Us orientado a Contracting Officers...",
  "Construyendo la estructura de tu landing page...",
  "Finalizando tu presencia profesional...",
];

interface Dia3ClientProps {
  userId: string;
  isCompleted: boolean;
  existingPreview: WebPreview | null;
  profile: CompanyProfile | null;
  keywordsExpanded: string[];
  devMode?: boolean;
}

export function Dia3Client({
  userId,
  isCompleted: initCompleted,
  existingPreview,
  profile,
  keywordsExpanded,
  devMode,
}: Dia3ClientProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(initCompleted);
  const [generating, setGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const loadingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [webResult, setWebResult] = useState<WebResult | null>(
    existingPreview
      ? { html: existingPreview.generated_html ?? "", css: existingPreview.generated_css ?? "" }
      : null
  );

  const usState = (profile as { us_state?: string | null } | null)?.us_state ?? "";

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

  function buildFullHtml(): string {
    if (!webResult) return "";
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${profile?.company_name ?? "My Company"}</title>
  <style>${webResult.css}</style>
</head>
<body>
${webResult.html}
</body>
</html>`;
  }

  async function handleCopyHtml() {
    const html = buildFullHtml();
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
    toast.success("HTML copiado — pegalo en tu editor web");
  }

  function handleOpenFullscreen() {
    const html = buildFullHtml();
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    // Revoke after the tab has had time to load
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function handleGenerateWeb() {
    if (!profile?.company_name) {
      toast.error("Completá el Día 1 primero para tener tu perfil de empresa.");
      return;
    }
    setGenerating(true);
    startLoadingCycle();

    try {
      const res = await fetch("/api/ai/generate-web-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: profile.company_name,
          niche: profile.niche ?? "",
          problemSolved: profile.problem_solved ?? "",
          primaryNaics: profile.primary_naics ?? "",
          keywords: keywordsExpanded.slice(0, 5),
          usState: usState || undefined,
          logoUrl: (profile as Record<string, unknown>).logo_url as string | undefined || undefined,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data: WebResult = await res.json();
      setWebResult(data);

      const supabase = createClient();
      await supabase.from("web_previews").upsert(
        {
          user_id: userId,
          generated_html: data.html,
          generated_css: data.css,
          portal_list_snapshot: PORTALS,
        },
        { onConflict: "user_id" }
      );

      // Marcar día 3 como completado + otorgar XP (idempotente)
      const xpRes = await fetch("/api/xp/complete-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: 3 }),
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
      router.refresh(); // refresca tabs + sidebar (server components) con el progreso nuevo
      toast.success("¡Preview de tu web generada!");
    } catch {
      toast.error("Estamos teniendo un problema. Intentá de nuevo.");
    } finally {
      stopLoadingCycle();
      setGenerating(false);
    }
  }

  function handleDownloadWeb() {
    if (!webResult) return;
    const content = buildFullHtml();
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mi-web-govbidder.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      {devMode && <DevTestBar day={3} isCompleted={isCompleted} />}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-emerald-100 text-emerald-700">Día 3</Badge>
          {isCompleted && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Completado
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold text-primary">Web + Portales</h1>
        <p className="text-muted-foreground mt-1">
          Generá el preview de tu web orientada al gobierno y conocé los portales donde publicar.
        </p>
      </div>

      <Card style={{ background: "color-mix(in srgb, var(--primary) 7%, var(--card))", borderColor: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
            <PlayCircle className="w-6 h-6" style={{ color: "var(--primary)" }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Clase en vivo — Día 3</p>
            <p className="text-sm text-muted-foreground">Mirá la clase antes de generar tu web.</p>
          </div>
          <JoinCallButton day={3} />
        </CardContent>
      </Card>

      {/* Generar web */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Preview de tu Web Gubernamental
          </CardTitle>
          <CardDescription>
            Basado en tu Perfil Estratégico, la IA genera una landing page profesional
            orientada a contratos gubernamentales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGenerateWeb}
            className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90"
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {LOADING_STEPS[loadingStep]}
              </>
            ) : webResult ? (
              "Regenerar Web"
            ) : (
              "Generar Preview de mi Web →"
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
        </CardContent>
      </Card>

      {/* Preview */}
      {webResult && (
        <div className="space-y-4">
          <div className="border rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-muted-foreground ml-2 font-mono">
                {profile?.company_name?.toLowerCase().replace(/\s/g, "")}.com (preview)
              </span>
              <button
                onClick={handleOpenFullscreen}
                className="ml-auto flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                title="Abrir en pantalla completa"
              >
                <ExternalLink className="w-3 h-3" /> Pantalla completa
              </button>
            </div>
            <iframe
              srcDoc={buildFullHtml()}
              className="w-full h-[640px] bg-white"
              sandbox="allow-same-origin"
              title="Website preview"
            />
          </div>

          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
              <div>
                <p className="font-semibold">💾 Usá tu web</p>
                <p className="text-sm text-muted-foreground">
                  Descargá el archivo o copiá el HTML para pegarlo en tu editor (Wix, Squarespace, WordPress).
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCopyHtml} variant="outline">
                  {copiedHtml ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Copiado</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copiar HTML</>
                  )}
                </Button>
                <Button onClick={handleDownloadWeb} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conexión con el Capability Statement */}
          <div
            className="flex items-center gap-3 rounded-xl p-4"
            style={{ background: "rgba(255,214,10,0.06)", border: "1px solid rgba(255,214,10,0.3)" }}
          >
            <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: "#FFD60A" }} />
            <p className="text-sm" style={{ color: "#C9D6EC" }}>
              Este copy es la base de tu <strong style={{ color: "#FFD60A" }}>Capability Statement</strong> del Día 4 —
              el documento que un Contracting Officer lee en 60 segundos para decidir si trabaja con vos.
            </p>
          </div>
        </div>
      )}

      {/* Portales — priorizados por tier */}
      <Card>
        <CardHeader>
          <CardTitle>🏛️ Dónde Registrarte — En Orden de Prioridad</CardTitle>
          <CardDescription>
            No todos los portales valen lo mismo. Empezá por los obligatorios y bajá desde ahí.
            {usState && <> Las oportunidades de tu NAICS en <strong>{usState}</strong> aparecen en estos portales.</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(["obligatorio", "alto", "oportunista"] as const).map((tier) => {
            const portals = PORTALS.filter((p) => p.tier === tier);
            if (portals.length === 0) return null;
            const meta = TIER_META[tier];
            return (
              <div key={tier}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
                  >
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{meta.desc}</span>
                </div>
                <div className="space-y-2">
                  {portals.map((portal) => (
                    <div
                      key={portal.name}
                      className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      style={{ borderColor: meta.border }}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{portal.name}</p>
                        <p className="text-xs text-muted-foreground">{portal.description}</p>
                        {portal.prereq && (
                          <p className="text-[11px] mt-1" style={{ color: meta.color }}>
                            📋 Tené listo: {portal.prereq}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                        <a href={portal.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                          Ir <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
