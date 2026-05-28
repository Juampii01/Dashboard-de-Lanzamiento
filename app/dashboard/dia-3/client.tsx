"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Download, ExternalLink, Globe, Loader2, PlayCircle } from "lucide-react";
import { JoinCallButton } from "@/components/join-call-button";
import type { Database } from "@/lib/supabase/types";
import { DevTestBar } from "@/components/dev-test-bar";

type CompanyProfile = Database["public"]["Tables"]["company_profiles"]["Row"];
type WebPreview = Database["public"]["Tables"]["web_previews"]["Row"];

interface WebResult {
  html: string;
  css: string;
}

const PORTALS = [
  { name: "SAM.gov", url: "https://sam.gov", description: "Sistema principal de registro y licitaciones federales" },
  { name: "USASpending.gov", url: "https://usaspending.gov", description: "Base de datos de contratos federales activos" },
  { name: "Grants.gov", url: "https://grants.gov", description: "Convocatorias de grants y subvenciones federales" },
  { name: "GovBid", url: "https://govbid.com", description: "Plataforma de licitaciones gubernamentales" },
  { name: "FedBizOpps (beta.SAM)", url: "https://sam.gov/search/", description: "Oportunidades de negocios federales" },
  { name: "SBA.gov", url: "https://sba.gov", description: "Contratos para pequeñas empresas y certificaciones" },
  { name: "GSA Advantage", url: "https://gsaadvantage.gov", description: "Catálogo de compras gubernamentales pre-aprobadas" },
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
  const [isCompleted, setIsCompleted] = useState(initCompleted);
  const [generating, setGenerating] = useState(false);
  const [webResult, setWebResult] = useState<WebResult | null>(
    existingPreview
      ? { html: existingPreview.generated_html ?? "", css: existingPreview.generated_css ?? "" }
      : null
  );

  async function handleGenerateWeb() {
    if (!profile?.company_name) {
      toast.error("Completá el Día 1 primero para tener tu perfil de empresa.");
      return;
    }
    setGenerating(true);

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
      toast.success("¡Preview de tu web generada!");
    } catch {
      toast.error("Estamos teniendo un problema. Intentá de nuevo.");
    } finally {
      setGenerating(false);
    }
  }

  function handleDownloadWeb() {
    if (!webResult) return;
    const content = `<!DOCTYPE html>
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
        <h1 className="text-2xl font-bold text-primary">Web + 1-800 + Portales</h1>
        <p className="text-muted-foreground mt-1">
          Generá el preview de tu web orientada al gobierno y conocé los portales donde publicar.
        </p>
      </div>

      <Card className="border-emerald-100 bg-emerald-50/50">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <PlayCircle className="w-6 h-6 text-red-600" />
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
            orientada a contratos federales.
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
                Generando tu web con IA...
              </>
            ) : webResult ? (
              "Regenerar Web"
            ) : (
              "Generar Preview de mi Web →"
            )}
          </Button>
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
            </div>
            <iframe
              srcDoc={webResult.html}
              className="w-full h-[500px] bg-white"
              sandbox="allow-same-origin"
              title="Website preview"
            />
          </div>

          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex items-center justify-between py-5">
              <div>
                <p className="font-semibold">💾 Descargá tu web</p>
                <p className="text-sm text-muted-foreground">
                  Archivo HTML listo para usar con un dominio.
                </p>
              </div>
              <Button onClick={handleDownloadWeb} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="w-4 h-4 mr-2" />
                Descargar HTML
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 1-800 */}
      <Card className="border-blue-100 bg-blue-50/50">
        <CardHeader>
          <CardTitle>📞 Número 1-800 Profesional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">
            Un número 1-800 dedicado para contratos gubernamentales genera credibilidad
            ante oficiales de compras. Es un requisito implícito para muchas licitaciones.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="font-semibold text-primary">
              Esta funcionalidad está incluida en la mentoría premium
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              "Tu Primer Contrato" incluye la configuración completa de tu número 1-800
              con enrutamiento inteligente y grabación de llamadas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Portales */}
      <Card>
        <CardHeader>
          <CardTitle>🏛️ Portales de Licitaciones Gubernamentales</CardTitle>
          <CardDescription>
            Registrate en estos portales para acceder a oportunidades de contratos
            federales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PORTALS.map((portal) => (
              <div
                key={portal.name}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
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
    </div>
  );
}
