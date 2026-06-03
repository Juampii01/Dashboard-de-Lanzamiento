"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Copy, Download, ExternalLink, Loader2, Plus, X, PlayCircle } from "lucide-react";
import { JoinCallButton } from "@/components/join-call-button";
import type { Database } from "@/lib/supabase/types";
import { DevTestBar } from "@/components/dev-test-bar";

type NaicsExpansion = Database["public"]["Tables"]["naics_expansions"]["Row"];

interface RelatedCode {
  code: string;
  description: string;
  type: "NAICS" | "PSC" | "SIC" | "UNSPSC" | "NIGP";
}

interface ExpandResult {
  related_codes: RelatedCode[];
  keywords_expanded: string[];
}

// ── GovBidder-style type definitions ─────────────────────────────────────────
const TYPE_META: Record<string, {
  abbr: string;
  fullLabel: string;
  desc: string;
  color: string;       // vivid bg color for the header band
  lightBg: string;     // subtle bg for the code card body
  textColor: string;   // color for the code number
  samUrl: (code: string) => string;
  externalLabel: string;
}> = {
  NAICS: {
    abbr: "NAICS",
    fullLabel: "North American Industry Classification",
    desc: "Código primario — así el gobierno federal te identifica. Registrálo en SAM.gov.",
    color: "#1E3A8A",
    lightBg: "rgba(30,58,138,0.12)",
    textColor: "#60A5FA",
    samUrl: (code) => `https://sam.gov/search/?index=opp&naicsCode=${code}`,
    externalLabel: "SAM.gov",
  },
  PSC: {
    abbr: "PSC",
    fullLabel: "Product Service Code — Federal",
    desc: "Usado por DoD y agencias federales para categorizar cada compra.",
    color: "#065F46",
    lightBg: "rgba(6,95,70,0.12)",
    textColor: "#34D399",
    samUrl: (code) => `https://sam.gov/search/?index=opp&pscCode=${code}`,
    externalLabel: "SAM.gov",
  },
  SIC: {
    abbr: "SIC",
    fullLabel: "Standard Industrial Classification",
    desc: "Código legacy. Muchos sistemas estatales y de counties todavía lo usan.",
    color: "#92400E",
    lightBg: "rgba(146,64,14,0.12)",
    textColor: "#FBBF24",
    samUrl: (code) => `https://sam.gov/search/?index=opp&q=${code}`,
    externalLabel: "SAM.gov",
  },
  UNSPSC: {
    abbr: "UNSPSC",
    fullLabel: "UN Standard Products & Services Code",
    desc: "Estándar internacional — compras multinacionales y organizaciones de Naciones Unidas.",
    color: "#4C1D95",
    lightBg: "rgba(76,29,149,0.12)",
    textColor: "#C084FC",
    samUrl: (code) => `https://www.ungm.org/UNSPSCCodes?q=${code}`,
    externalLabel: "UNGM",
  },
  NIGP: {
    abbr: "NIGP",
    fullLabel: "National Institute of Governmental Purchasing",
    desc: "Usado por estados, counties, school districts y universidades.",
    color: "#881337",
    lightBg: "rgba(136,19,55,0.12)",
    textColor: "#FB7185",
    samUrl: (code) => `https://www.nigp.org/home/commodity-code/commodity-code-details?code=${code}`,
    externalLabel: "NIGP",
  },
};

const LOADING_STEPS = [
  "Analizando tu código NAICS principal...",
  "Buscando códigos PSC relacionados en contratos activos...",
  "Identificando equivalentes SIC y UNSPSC...",
  "Mapeando códigos NIGP para estados y counties...",
  "Expandiendo keywords con terminología de procurement...",
  "Generando tu mapa completo de los 5 formatos...",
];

interface Dia2ClientProps {
  userId: string;
  isCompleted: boolean;
  existingExpansion: NaicsExpansion | null;
  primaryNaics: string;
  companyNiche: string;
  usState?: string;
  devMode?: boolean;
}

export function Dia2Client({
  userId,
  isCompleted: initCompleted,
  existingExpansion,
  primaryNaics,
  companyNiche,
  usState,
  devMode,
}: Dia2ClientProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(initCompleted);
  const [naicsInput, setNaicsInput] = useState(primaryNaics);
  const [keywords, setKeywords] = useState<string[]>(
    existingExpansion?.keywords_input ?? []
  );
  const [keywordInput, setKeywordInput] = useState("");
  const [result, setResult] = useState<ExpandResult | null>(
    existingExpansion
      ? {
          related_codes: existingExpansion.related_codes as RelatedCode[],
          keywords_expanded: existingExpansion.keywords_expanded,
        }
      : null
  );
  const [generating, setGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const loadingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Clean up loading interval on unmount
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

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  async function copyAllKeywords() {
    if (!result) return;
    // Format for SAM.gov: comma-separated, max 2000 chars
    const raw = result.keywords_expanded.join(", ");
    const trimmed = raw.length > 2000 ? raw.slice(0, 1997) + "..." : raw;
    await navigator.clipboard.writeText(trimmed);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success("Keywords copiadas — listas para pegar en SAM.gov");
  }

  function addKeyword() {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords((prev) => [...prev, kw]);
      setKeywordInput("");
    }
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  async function handleGenerate() {
    if (!naicsInput) {
      toast.error("Ingresá tu código NAICS principal.");
      return;
    }
    setGenerating(true);
    startLoadingCycle();

    try {
      const res = await fetch("/api/ai/expand-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryNaics: naicsInput,
          keywords,
          niche: companyNiche,
          usState: usState || undefined,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data: ExpandResult = await res.json();
      setResult(data);

      const supabase = createClient();
      const { error } = await supabase.from("naics_expansions").upsert(
        {
          user_id: userId,
          primary_naics: naicsInput,
          related_codes: data.related_codes,
          keywords_input: keywords,
          keywords_expanded: data.keywords_expanded,
        },
        { onConflict: "user_id" }
      );

      if (error) throw new Error(error.message);

      // Marcar día 2 como completado + otorgar XP (idempotente)
      const xpRes = await fetch("/api/xp/complete-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: 2 }),
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
      toast.success("¡Mapa de códigos generado!");
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
      const res = await fetch("/api/pdf/day-2");
      if (!res.ok) throw new Error("PDF error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "govbidder-dia-2-mapa-codigos.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al generar el PDF. Intentá de nuevo.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div className="space-y-8">
      {devMode && <DevTestBar day={2} isCompleted={isCompleted} />}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-purple-100 text-purple-700">Día 2</Badge>
          {isCompleted && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Completado
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold text-primary">Mapa de Código Gubernamental</h1>
        <p className="text-muted-foreground mt-1">
          La IA expande tu código NAICS en un mapa completo de cómo el gobierno te busca.
        </p>
      </div>

      <Card className="border-purple-100 bg-purple-50/50">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <PlayCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Clase en vivo — Día 2</p>
            <p className="text-sm text-muted-foreground">Mirá la clase antes de generar tu mapa.</p>
          </div>
          <JoinCallButton day={2} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generá tu Mapa de Códigos</CardTitle>
          <CardDescription>
            Ingresá tu NAICS principal y palabras clave de tu negocio. La IA genera
            todos los códigos relacionados que el gobierno usa para encontrarte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Código NAICS principal</Label>
            <Input
              value={naicsInput}
              onChange={(e) => setNaicsInput(e.target.value)}
              placeholder="Ej: 561720"
              maxLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label>Keywords de tu negocio</Label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                placeholder="Ej: janitorial services"
              />
              <Button type="button" variant="outline" onClick={addKeyword} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="flex items-center gap-1">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

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
            ) : (
              "Generar mi Mapa de Códigos →"
            )}
          </Button>
          {generating && (
            <div className="flex gap-1.5 justify-center pt-1">
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

      {/* Resultados */}
      {result && (
        <div className="space-y-5">
          {/* ── Header "CÓDIGOS EQUIVALENTES EN TODOS LOS FORMATOS" ── */}
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest text-center"
              style={{ color: "#BDC9DC", letterSpacing: "0.15em" }}
            >
              Códigos Equivalentes en Todos los Formatos Gubernamentales
            </p>
          </div>

          {/* ── One section per code type ── */}
          {(["NAICS", "PSC", "SIC", "UNSPSC", "NIGP"] as const).map((type) => {
            const codes = result.related_codes.filter((c) => c.type === type);
            if (codes.length === 0) return null;
            const meta = TYPE_META[type];
            return (
              <div
                key={type}
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${meta.color}55` }}
              >
                {/* Type header band */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ background: meta.color }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded"
                      style={{ background: "rgba(0,0,0,0.25)", color: "#fff" }}
                    >
                      {meta.abbr}
                    </span>
                    <span className="text-xs font-semibold text-white/80">{meta.fullLabel}</span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(0,0,0,0.25)", color: "#fff" }}
                  >
                    {codes.length} {codes.length === 1 ? "código" : "códigos"}
                  </span>
                </div>

                {/* Desc row */}
                <div
                  className="px-4 py-2 text-xs"
                  style={{ background: "rgba(255,255,255,0.03)", color: "#BDC9DC", borderBottom: `1px solid ${meta.color}33` }}
                >
                  {meta.desc}
                </div>

                {/* Code cards grid */}
                <div
                  className="grid gap-2 p-3 sm:grid-cols-2"
                  style={{ background: meta.lightBg }}
                >
                  {codes.map((code) => (
                    <div
                      key={`${code.type}-${code.code}`}
                      className="rounded-lg p-3 flex flex-col gap-1"
                      style={{
                        background: "rgba(0,0,0,0.35)",
                        border: `1px solid ${meta.color}44`,
                      }}
                    >
                      {/* Code number + actions */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-black tabular-nums"
                          style={{
                            fontSize: "22px",
                            color: meta.textColor,
                            fontFamily: "var(--font-mono)",
                            lineHeight: 1,
                          }}
                        >
                          {code.code}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => copyCode(code.code)}
                            title="Copiar código"
                            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded transition-all"
                            style={{
                              background: "rgba(255,255,255,0.08)",
                              color: "#fff",
                              border: "1px solid rgba(255,255,255,0.12)",
                            }}
                          >
                            {copiedCode === code.code ? (
                              <><CheckCircle2 className="w-3 h-3 text-green-400" /> Copiado</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copiar</>
                            )}
                          </button>
                          <a
                            href={meta.samUrl(code.code)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded transition-all"
                            style={{
                              background: `${meta.color}33`,
                              color: meta.textColor,
                              border: `1px solid ${meta.color}55`,
                            }}
                          >
                            {meta.externalLabel} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      {/* Description */}
                      <p className="text-xs leading-relaxed" style={{ color: "#BDC9DC" }}>
                        {code.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Keywords expandidas */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Keywords Gubernamentales Expandidas</CardTitle>
                  <CardDescription>
                    Términos que el gobierno usa para buscar tus servicios. Úsalos en
                    tu Capability Statement y en SAM.gov.
                  </CardDescription>
                </div>
                <Button
                  onClick={copyAllKeywords}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                >
                  {copiedAll ? (
                    <><CheckCircle2 className="w-4 h-4 mr-1.5 text-green-600" /> Copiadas</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-1.5" /> Copiar para SAM.gov</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.keywords_expanded.map((kw) => (
                  <Badge key={kw} variant="outline" className="text-sm">
                    {kw}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Descargar PDF */}
          {isCompleted && (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="flex items-center justify-between py-5">
                <div>
                  <p className="font-semibold">📄 Mapa de Códigos — Día 2</p>
                  <p className="text-sm text-muted-foreground">Todos tus códigos + keywords en PDF.</p>
                </div>
                <Button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <><Download className="w-4 h-4 mr-2" /> Descargar PDF</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
