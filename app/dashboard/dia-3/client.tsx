"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Copy, Download, ExternalLink, Globe, Loader2, PlayCircle, ArrowRight, Monitor, Smartphone, Lock, Sparkles, RefreshCw, Gift, ChevronDown } from "lucide-react";
import { JoinCallButton } from "@/components/join-call-button";
import { WizardModal } from "@/components/wizard-modal";
import { useMissionsDone } from "@/lib/hooks/use-missions-done";
import type { Database } from "@/lib/supabase/types";
import { DevTestBar } from "@/components/dev-test-bar";

type CompanyProfile = Database["public"]["Tables"]["company_profiles"]["Row"];
type WebPreview = Database["public"]["Tables"]["web_previews"]["Row"];

interface WebResult {
  html: string;
  css: string;
}

type PortalCategory = "ecosistema" | "privado" | "estatal" | "federal";

interface Portal {
  name: string;
  url: string;
  description: string;
  category: PortalCategory;
  prereq?: string;
}

const PORTALS: Portal[] = [
  // ── Ecosistema GovBidder ──
  { name: "GovBidder App", url: "https://app.govbidder.net/", description: "La plataforma principal de GovBidder para gestionar tu camino al contrato.", category: "ecosistema" },
  { name: "GovBidder AI", url: "https://govbidder.ai/", description: "Herramientas de IA de GovBidder para acelerar tu búsqueda y tus propuestas.", category: "ecosistema" },
  { name: "GovBidder Connect", url: "https://www.govbidderconnect.com/", description: "Conecta con el ecosistema y la comunidad GovBidder.", category: "ecosistema" },
  { name: "GovBidder Academy", url: "https://govbidderacademy.com/login", description: "Formación y cursos de GovBidder para seguir aprendiendo.", category: "ecosistema" },

  // ── Privados ──
  // (el equipo puede agregar más portales privados acá)

  // ── Estatales / locales ──
  // (el equipo cargará los portales estatales/locales acá)

  // ── Federales ──
  { name: "SAM.gov", url: "https://sam.gov", description: "Registro federal obligatorio. Tu UEI y CAGE Code salen de acá.", category: "federal", prereq: "EIN / Tax ID + datos bancarios (ACH)" },
  { name: "GSA eBuy", url: "https://www.ebuy.gsa.gov", description: "RFQs de agencias buscando proveedores. Alto volumen de servicios.", category: "federal", prereq: "Registro en SAM.gov" },
  { name: "GSA Advantage", url: "https://gsaadvantage.gov", description: "Catálogo de compras pre-aprobadas del gobierno.", category: "federal" },
  { name: "SBA.gov", url: "https://sba.gov", description: "Certificaciones (8a, WOSB, HUBZone) y recursos para small business.", category: "federal" },
];

const CATEGORY_ORDER: { key: PortalCategory; label: string }[] = [
  { key: "ecosistema", label: "Ecosistema GovBidder" },
  { key: "privado", label: "Portales privados" },
  { key: "estatal", label: "Estatales / locales" },
  { key: "federal", label: "Federales" },
];

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
  const { missionsDone } = useMissionsDone(3, devMode);
  const [portalsOpen, setPortalsOpen] = useState(false);
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

  // HTML para el iframe del PREVIEW: agrega un "guard" que evita el scroll
  // horizontal / desborde cuando el sitio no es 100% responsive (sobre todo en
  // la vista Móvil). El archivo descargado (buildFullHtml) queda intacto.
  function buildPreviewHtml(): string {
    const full = buildFullHtml();
    if (!full) return "";
    const guard =
      "<style>html,body{max-width:100%!important;overflow-x:hidden!important;margin:0;}*{box-sizing:border-box;}img,svg,video,iframe,table{max-width:100%!important;height:auto;}</style>";
    return full.replace("</head>", `${guard}</head>`);
  }

  async function handleCopyHtml() {
    const html = buildFullHtml();
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
    toast.success("HTML copiado — pégalo en tu editor web");
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
      toast.error("Completa el Día 1 primero para tener tu perfil de empresa.");
      return;
    }
    // Generación en segundo plano: cerramos el wizard para NO bloquear la pantalla.
    // El usuario puede seguir usando el dashboard mientras se arma la web.
    setGenerating(true);
    setWizardOpen(false);
    startLoadingCycle();
    const toastId = toast.loading(
      "Generando tu web… puede tardar 2-3 minutos. Puedes seguir usando el dashboard; te avisamos cuando esté lista.",
      { duration: Infinity }
    );

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
          address: (profile as Record<string, unknown>).address as string | undefined || undefined,
          zipCode: (profile as Record<string, unknown>).zip_code as string | undefined || undefined,
          phone: (profile as Record<string, unknown>).phone as string | undefined || undefined,
          corporateEmail: (profile as Record<string, unknown>).corporate_email as string | undefined || undefined,
          website: (profile as Record<string, unknown>).website as string | undefined || undefined,
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
      toast.success("¡Tu web ya está lista!", { id: toastId, duration: 5000 });
    } catch {
      toast.error("No pudimos generar tu web. Vuelve a intentar.", { id: toastId, duration: 6000 });
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
          Genera el preview de tu web orientada al gobierno y conoce los portales donde publicar.
        </p>
      </div>

      <Card style={{ background: "color-mix(in srgb, var(--primary) 7%, var(--card))", borderColor: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
            <PlayCircle className="w-6 h-6" style={{ color: "var(--primary)" }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold">GovBidder Challenge Clase 3</p>
            <p className="text-sm text-muted-foreground">Mira la clase antes de generar tu web.</p>
          </div>
          <JoinCallButton day={3} />
        </CardContent>
      </Card>

      {/* ── Launch (sin web) / Showcase (con web) ── */}
      {!webResult ? (
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
                <Lock className="w-4 h-4" /> Generar mi web — Día 3
              </Button>
            </CardContent>
          </Card>
        ) : (
        <Card>
          <CardContent className="py-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <Globe className="w-6 h-6" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <p className="font-semibold text-lg">Genera tu Web Gubernamental</p>
              <p className="text-sm text-muted-foreground mt-1">
                La IA usa tu Perfil Estratégico para construir una landing profesional orientada a Contracting Officers.
              </p>
            </div>
            <Button onClick={() => setWizardOpen(true)} className="gap-2 h-12 px-7 text-base font-bold" disabled={generating}>
              Generar mi web — Día 3 <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
        )
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
                srcDoc={buildPreviewHtml()}
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
                <p className="font-semibold">💾 Usa tu web</p>
                <p className="text-sm text-muted-foreground">
                  Descarga el archivo o copia el HTML para pegarlo en tu editor (Wix, Squarespace, WordPress).
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
              el documento que un Contracting Officer lee en 60 segundos para decidir si trabaja contigo.
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

      {/* ── Sorpresa: portales (se desbloquea al completar el Día 3) ── */}
      {(() => {
        const unlocked = isCompleted || !!webResult;
        return (
          <div>
            <button
              type="button"
              onClick={() => unlocked && setPortalsOpen((v) => !v)}
              disabled={!unlocked}
              aria-expanded={portalsOpen}
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
                transition: "transform var(--dur-fast) var(--ease-out)",
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
                  {unlocked ? "🎁 Tu sorpresa: dónde registrarte para conseguir contratos" : "Sorpresa bloqueada"}
                </span>
                <span style={{ display: "block", fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                  {unlocked
                    ? (portalsOpen ? "Toca para ocultar los portales" : "Toca para desplegar todos los portales donde registrarte")
                    : "Completa la tarea del Día 3 para desbloquearla"}
                </span>
              </span>
              {unlocked && (
                <ChevronDown className="w-5 h-5" style={{ flexShrink: 0, transform: portalsOpen ? "rotate(180deg)" : "none", transition: "transform var(--dur-fast) var(--ease-out)" }} />
              )}
            </button>

            {unlocked && portalsOpen && (
              <div className="gb-preview-reveal" style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 18 }}>
                {usState && (
                  <p className="text-xs text-muted-foreground">
                    Las oportunidades de tu NAICS en <strong>{usState}</strong> suelen aparecer en estos portales.
                  </p>
                )}
                {CATEGORY_ORDER.map((cat) => {
                  const list = PORTALS.filter((p) => p.category === cat.key);
                  return (
                    <div key={cat.key}>
                      <p className="text-sm font-bold mb-2" style={{ color: "var(--foreground)" }}>{cat.label}</p>
                      {list.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-3 py-3 rounded-lg border border-dashed" style={{ borderColor: "var(--border)" }}>
                          Próximamente — el equipo cargará estos portales.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {list.map((portal) => {
                            const accent = portal.category === "privado" ? "var(--accent)" : "var(--secondary)";
                            return (
                              <div key={portal.name} className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                style={{ borderColor: `color-mix(in srgb, ${accent} 30%, transparent)` }}>
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-foreground">{portal.name}</p>
                                  <p className="text-xs text-muted-foreground">{portal.description}</p>
                                  {portal.prereq && (
                                    <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>📋 Ten listo: {portal.prereq}</p>
                                  )}
                                </div>
                                <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                                  <a href={portal.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                    Ir <ExternalLink className="w-3 h-3" />
                                  </a>
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Wizard modal — confirmar perfil y generar ── */}
      <WizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Día 3 — Tu Web Gubernamental"
        subtitle="Confirma los datos y la IA construye tu landing."
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
                    ["Qué haces", profile?.niche || "—"],
                    ["Keywords", keywordsExpanded.slice(0, 5).join(", ") || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-shrink-0">{k}</span>
                      <span className="text-sm font-medium text-foreground text-right">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  ¿Algo no coincide? Edítalo en el Día 1 y vuelve. Acá no se cambia nada.
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
                    ["About Us", "Quién eres, orientado a confianza institucional"],
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
                  <div className="space-y-1 text-center">
                    <p className="text-xs text-muted-foreground">{LOADING_STEPS[loadingStep]}</p>
                    <p className="text-xs text-muted-foreground">
                      Esto puede tardar entre <strong className="text-foreground">2 y 3 minutos</strong>. Si falla, vuelve a intentar.
                    </p>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
