"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Download, ExternalLink, Loader2, Plus, X, PlayCircle } from "lucide-react";
import type { Database } from "@/lib/supabase/types";
import { DevTestBar } from "@/components/dev-test-bar";

type NaicsExpansion = Database["public"]["Tables"]["naics_expansions"]["Row"];

interface RelatedCode {
  code: string;
  description: string;
  type: "NAICS" | "PSC" | "SIC";
}

interface ExpandResult {
  related_codes: RelatedCode[];
  keywords_expanded: string[];
}

const TYPE_COLORS: Record<string, string> = {
  NAICS: "bg-blue-100 text-blue-700",
  PSC: "bg-purple-100 text-purple-700",
  SIC: "bg-emerald-100 text-emerald-700",
};

interface Dia2ClientProps {
  userId: string;
  isCompleted: boolean;
  existingExpansion: NaicsExpansion | null;
  primaryNaics: string;
  companyNiche: string;
  devMode?: boolean;
}

export function Dia2Client({
  userId,
  isCompleted: initCompleted,
  existingExpansion,
  primaryNaics,
  companyNiche,
  devMode,
}: Dia2ClientProps) {
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
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

    try {
      const res = await fetch("/api/ai/expand-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryNaics: naicsInput,
          keywords,
          niche: companyNiche,
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

      await supabase
        .from("day_progress")
        // @ts-ignore
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("day_number", 2);

      setIsCompleted(true);
      toast.success("¡Mapa de códigos generado!");
    } catch {
      toast.error("Estamos teniendo un problema. Intentá de nuevo.");
    } finally {
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
          <Button variant="outline" size="sm" asChild>
            <a href="https://youtube.com/@govbidder" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
              Ver clase <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
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
                Generando mapa con IA...
              </>
            ) : (
              "Generar mi Mapa de Códigos →"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {result && (
        <div className="space-y-6">
          {/* Códigos relacionados */}
          <Card>
            <CardHeader>
              <CardTitle>Tu Mapa de Códigos Gubernamentales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.related_codes.map((code) => (
                  <div
                    key={`${code.type}-${code.code}`}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-card"
                  >
                    <Badge className={TYPE_COLORS[code.type] ?? "bg-gray-100 text-gray-700"}>
                      {code.type}
                    </Badge>
                    <div>
                      <p className="font-bold text-primary">{code.code}</p>
                      <p className="text-xs text-muted-foreground">{code.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Keywords expandidas */}
          <Card>
            <CardHeader>
              <CardTitle>Keywords Gubernamentales Expandidas</CardTitle>
              <CardDescription>
                Términos que el gobierno usa para buscar tus servicios. Úsalos en
                tu Capability Statement y en SAM.gov.
              </CardDescription>
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
