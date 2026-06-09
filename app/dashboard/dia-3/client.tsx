"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Copy, Download, ExternalLink, Globe, Loader2, PlayCircle, ArrowRight, Monitor, Smartphone, Lock, Sparkles, RefreshCw } from "lucide-react";
import { JoinCallButton } from "@/components/join-call-button";
import { WizardModal } from "@/components/wizard-modal";
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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
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
      setWizardOpen(false);
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

      {/* ── Launch (sin web) / Showcase (con web) ── */}
      {!webResult ? (
        <Card>
          <CardContent className="py-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <Globe className="w-6 h-6" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <p className="font-semibold text-lg">Generá tu Web Gubernamental</p>
              <p className="text-sm text-muted-foreground mt-1">
                La IA usa tu Perfil Estratégico para construir una landing profesional orientada a Contracting Officers.
              </p>
            </div>
            <Button onClick={() => setWizardOpen(true)} className="gap-2 h-12 px-7 text-base font-bold" disabled={generating}>
              Generar mi web — Día 3 <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 gb-preview-reveal">
          {/* ── Showcase: la web como un producto ── */}
          <div style={{
            position: "relative", borderRadius: 24, overflow: "hidden",
            padding: "clamp(16px, 3.5vw, 36px)",
            background: "linear-gradient(160deg, var(--secondary) 0%, var(--govbidder-navy-deep) 100%)",
          }}>
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% -10%, rgba(255,255,255,0.10), transparent 55%)" }} />

            {/* Header del showcase */}
            <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FFD700", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles className="w-3.5 h-3.5" /> Tu presencia profesional
                </p>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
                  {profile?.company_name ?? "Tu empresa"} ya tiene cara de proveedor del gobierno
                </h3>
              </div>
              {/* Toggle dispositivo */}
              <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.12)", padding: 4, borderRadius: 11, flexShrink: 0 }}>
                {([["desktop", Monitor, "Escritorio"], ["mobile", Smartphone, "Móvil"]] as const).map(([key, Icon, label]) => (
                  <button key={key} onClick={() => setDevice(key)} aria-pressed={device === key} style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8,
                    border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                    transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
                    background: device === key ? "#fff" : "transparent",
                    color: device === key ? "var(--secondary)" : "rgba(255,255,255,0.72)",
                  }}>
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ventana del navegador */}
            <div style={{
              position: "relative", margin: "0 auto", width: "100%",
              maxWidth: device === "mobile" ? 390 : "100%",
              transition: "max-width var(--dur-slow) var(--ease-expo)",
              borderRadius: 14, overflow: "hidden", background: "#fff",
              boxShadow: "0 40px 90px -30px rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.14)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e" }} />
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840" }} />
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "5px 12px", maxWidth: 320, margin: "0 auto", color: "#6b7280", fontSize: 12, fontFamily: "var(--font-mono)", overflow: "hidden", whiteSpace: "nowrap" }}>
                  <Lock className="w-3 h-3" style={{ color: "#16A65F", flexShrink: 0 }} />
                  {(profile?.company_name?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "tuempresa")}.com
                </div>
                <button onClick={handleOpenFullscreen} title="Abrir en pantalla completa" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", color: "#6b7280", cursor: "pointer", flexShrink: 0 }}>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              <iframe
                key={device}
                srcDoc={buildFullHtml()}
                style={{ width: "100%", height: device === "mobile" ? 700 : 620, background: "#fff", border: "none", display: "block" }}
                sandbox="allow-same-origin"
                title="Website preview"
              />
            </div>
          </div>

          {/* Acciones */}
          <Card>
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
                <Button onClick={handleDownloadWeb}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conexión con el Capability Statement (tokenizado) */}
          <div
            className="flex items-center gap-3 rounded-xl p-4"
            style={{ background: "color-mix(in srgb, var(--secondary) 6%, var(--card))", border: "1px solid color-mix(in srgb, var(--secondary) 22%, transparent)" }}
          >
            <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: "var(--secondary)" }} />
            <p className="text-sm text-foreground">
              Este copy es la base de tu <strong style={{ color: "var(--secondary)" }}>Capability Statement</strong> del Día 4 —
              el documento que un Contracting Officer lee en 60 segundos para decidir si trabaja con vos.
            </p>
          </div>

          {/* Regenerar */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setWizardOpen(true)} className="gap-2" disabled={generating}>
              <RefreshCw className="w-4 h-4" /> Regenerar mi web
            </Button>
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

      {/* ── Wizard modal — confirmar perfil y generar ── */}
      <WizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Día 3 — Tu Web Gubernamental"
        subtitle="Confirmá los datos y la IA construye tu landing."
        finishLabel={webResult ? "Regenerar mi web" : "Generar mi web"}
        finishing={generating}
        onFinish={() => handleGenerateWeb()}
        steps={[
          {
            label: "Tu perfil",
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tu web se construye con estos datos de tu Perfil Estratégico (Día 1):
                </p>
                <div className="rounded-xl border border-border bg-muted/40 divide-y divide-border">
                  {[
                    ["Empresa", profile?.company_name || "—"],
                    ["NAICS", profile?.primary_naics || "—"],
                    ["Qué hacés", profile?.niche || "—"],
                    ["Keywords", keywordsExpanded.slice(0, 5).join(", ") || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-shrink-0">{k}</span>
                      <span className="text-sm font-medium text-foreground text-right">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  ¿Algo no coincide? Editalo en el Día 1 y volvé. Acá no se cambia nada.
                </p>
              </div>
            ),
          },
          {
            label: "Tu nueva web",
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  La IA redacta una landing en tono de procurement, lista para un Contracting Officer:
                </p>
                <div className="grid gap-2.5">
                  {[
                    ["Hero", "Titular y propuesta de valor para el gobierno"],
                    ["About Us", "Quién sos, orientado a confianza institucional"],
                    ["Servicios", "Tus servicios traducidos a lenguaje de contratos"],
                    ["Capabilities & CTA", "Cierre con llamada a la acción y contacto"],
                  ].map(([t, d]) => (
                    <div key={t} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t}</p>
                        <p className="text-xs text-muted-foreground">{d}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
