"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { triggerFlash, triggerScreenShake } from "@/lib/wow-effects";
import { CheckCircle2, Download, Loader2, PlayCircle } from "lucide-react";
import type { Database } from "@/lib/supabase/types";
import { DevTestBar } from "@/components/dev-test-bar";
import { JoinCallButton } from "@/components/join-call-button";

type CompanyProfile = Database["public"]["Tables"]["company_profiles"]["Row"];

interface NAICSResult {
  naics_code: string;
  naics_description: string;
  reasoning: string;
}

interface Dia1ClientProps {
  userId: string;
  isCompleted: boolean;
  existingProfile: CompanyProfile | null;
  devMode?: boolean;
}

export function Dia1Client({ userId, isCompleted: initCompleted, existingProfile, devMode }: Dia1ClientProps) {
  const [isCompleted, setIsCompleted] = useState(initCompleted);
  const [saving, setSaving] = useState(false);
  const [naicsResult, setNaicsResult] = useState<NAICSResult | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [form, setForm] = useState({
    company_name: existingProfile?.company_name ?? "",
    year_founded: existingProfile?.year_founded?.toString() ?? "",
    employee_count: existingProfile?.employee_count?.toString() ?? "",
    niche: existingProfile?.niche ?? "",
    problem_solved: existingProfile?.problem_solved ?? "",
    target_avatar: existingProfile?.target_avatar ?? "",
    previous_acquisition_methods: existingProfile?.previous_acquisition_methods ?? "",
    primary_naics: existingProfile?.primary_naics ?? "",
    us_state: (existingProfile as { us_state?: string | null } | null)?.us_state ?? "",
    legal_structure: (existingProfile as { legal_structure?: string | null } | null)?.legal_structure ?? "",
  });
  const [certifications, setCertifications] = useState<string[]>(
    (existingProfile as { existing_certifications?: string[] | null } | null)?.existing_certifications ?? []
  );

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Custom game-style validation
    const gameError = (msg: string) => {
      triggerFlash("rgba(215,38,61,0.35)");
      triggerScreenShake();
      toast.custom(() => (
        <div
          style={{
            background: "linear-gradient(135deg, #1a0008 0%, #2d0010 100%)",
            border: "2px solid #D7263D",
            borderRadius: "10px",
            padding: "14px 18px",
            boxShadow: "0 0 24px rgba(215,38,61,0.6), 0 0 8px rgba(215,38,61,0.8)",
            fontFamily: "var(--font-arcade)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            animation: "pts-detail-show 0.2s ease-out",
            minWidth: "280px",
          }}
        >
          <span style={{ fontSize: "22px", flexShrink: 0 }}>🚫</span>
          <div>
            <p style={{ color: "#FFD60A", fontSize: "9px", letterSpacing: "0.12em", marginBottom: "4px" }}>
              ▶ CAMPO REQUERIDO
            </p>
            <p style={{ color: "#ff6b6b", fontSize: "11px", lineHeight: 1.4, fontFamily: "var(--font-sans)" }}>
              {msg}
            </p>
          </div>
        </div>
      ), { duration: 3000 });
    };

    if (!form.company_name.trim()) {
      gameError("Ingresá el nombre de tu empresa para continuar");
      return;
    }
    if (!form.niche.trim()) {
      gameError("Contanos qué vende o hace tu empresa");
      return;
    }
    if (!form.problem_solved.trim()) {
      gameError("Describí qué problema resolvés para tus clientes");
      return;
    }

    setSaving(true);

    try {
      // 1. Sugerir NAICS si no hay uno ingresado
      let primaryNaics = form.primary_naics;
      if (!primaryNaics) {
        const res = await fetch("/api/ai/suggest-naics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: form.company_name,
            niche: form.niche,
            problemSolved: form.problem_solved,
            targetAvatar: form.target_avatar,
            usState: form.us_state,
            legalStructure: form.legal_structure,
          }),
        });

        if (res.ok) {
          const data: NAICSResult = await res.json();
          primaryNaics = data.naics_code;
          setNaicsResult(data);
          setForm((prev) => ({ ...prev, primary_naics: data.naics_code }));
        } else {
          // Surface the failure instead of completing the day with no analysis
          let msg = "No pudimos generar tu análisis con IA. Intentá de nuevo.";
          try {
            const err = await res.json();
            if (err?.message) msg = err.message;
          } catch { /* keep default */ }
          throw new Error(msg);
        }
      }

      // 2. Guardar en Supabase
      const supabase = createClient();
      const profileData = {
        user_id: userId,
        company_name: form.company_name,
        year_founded: form.year_founded ? parseInt(form.year_founded) : null,
        employee_count: form.employee_count ? parseInt(form.employee_count) : null,
        niche: form.niche,
        problem_solved: form.problem_solved,
        target_avatar: form.target_avatar,
        previous_acquisition_methods: form.previous_acquisition_methods,
        primary_naics: primaryNaics || null,
        us_state: form.us_state || null,
        legal_structure: form.legal_structure || null,
        existing_certifications: certifications.length > 0 ? certifications : null,
      };

      const { error: profileError } = await supabase
        .from("company_profiles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(profileData as any, { onConflict: "user_id" });

      if (profileError) throw new Error(profileError.message);

      // 3. Marcar día 1 como completado + otorgar XP (idempotente)
      const xpRes = await fetch("/api/xp/complete-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: 1 }),
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
      toast.success("¡Perfil Estratégico guardado! Ya podés descargar tu análisis.");

      // Celebración arcade
      const colors = ["#D7263D", "#FFD60A", "#00D67A", "#FFFFFF"];
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors });
      setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { x: 0.2, y: 0.6 }, colors }), 250);
      setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { x: 0.8, y: 0.6 }, colors }), 450);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Estamos teniendo un problema. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const res = await fetch("/api/pdf/day-1", { method: "GET" });
      if (!res.ok) throw new Error("PDF error");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "govbidder-dia-1-analisis.pdf";
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
      {devMode && <DevTestBar day={1} isCompleted={isCompleted} />}
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-blue-100 text-blue-700">Día 1</Badge>
            {isCompleted && (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Completado
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-primary">
            Oportunidad + Perfil Estratégico
          </h1>
          <p className="text-muted-foreground mt-1">
            Completá el perfil de tu empresa para identificar tu oportunidad en
            el mercado gubernamental.
          </p>
        </div>
      </div>

      {/* Video clase */}
      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <PlayCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Clase en vivo — Día 1</p>
            <p className="text-sm text-muted-foreground">
              Mirá la clase antes de completar el formulario.
            </p>
          </div>
          <JoinCallButton day={1} />
        </CardContent>
      </Card>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil Estratégico de tu empresa</CardTitle>
          <CardDescription>
            Esta información se usa para generar tu análisis inicial y tu Capability
            Statement final. Sé específico — cuanto más detail, mejores resultados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nombre de la empresa *</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={setField("company_name")}
                  placeholder="Ej: ABC Services LLC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_founded">Año de fundación</Label>
                <Input
                  id="year_founded"
                  type="number"
                  value={form.year_founded}
                  onChange={setField("year_founded")}
                  placeholder="Ej: 2018"
                  min={1900}
                  max={2025}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee_count">Cantidad de empleados</Label>
                <Input
                  id="employee_count"
                  type="number"
                  value={form.employee_count}
                  onChange={setField("employee_count")}
                  placeholder="Ej: 5"
                  min={1}
                />
              </div>

              {/* Estado de operación */}
              <div className="space-y-2">
                <Label htmlFor="us_state">Estado donde operás</Label>
                <select
                  id="us_state"
                  value={form.us_state}
                  onChange={(e) => setForm((p) => ({ ...p, us_state: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleccioná un estado</option>
                  {["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","Washington D.C.","Puerto Rico"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Mejora la precisión del análisis de mercado</p>
              </div>
            </div>

            {/* Estructura legal */}
            <div className="space-y-2">
              <Label htmlFor="legal_structure">Estructura legal de la empresa</Label>
              <select
                id="legal_structure"
                value={form.legal_structure}
                onChange={(e) => setForm((p) => ({ ...p, legal_structure: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleccioná una opción</option>
                <option value="LLC">LLC (Limited Liability Company)</option>
                <option value="S-Corp">S-Corporation</option>
                <option value="C-Corp">C-Corporation</option>
                <option value="Sole Proprietor">Sole Proprietor (Autónomo)</option>
                <option value="Partnership">Partnership</option>
                <option value="Nonprofit">Nonprofit / 501(c)(3)</option>
                <option value="Other">Otro</option>
              </select>
              <p className="text-xs text-muted-foreground">Determina a qué tipos de contratos podés acceder</p>
            </div>

            {/* Certificaciones actuales */}
            <div className="space-y-2">
              <Label>Certificaciones que ya tenés (opcional)</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { id: "SAM.gov", label: "SAM.gov activo" },
                  { id: "WOSB", label: "WOSB" },
                  { id: "SDVOSB", label: "SDVOSB" },
                  { id: "HUBZone", label: "HUBZone" },
                  { id: "8(a)", label: "8(a) SBA" },
                  { id: "MBE", label: "MBE" },
                ].map((cert) => (
                  <label key={cert.id} className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={certifications.includes(cert.id)}
                      onChange={(e) =>
                        setCertifications((prev) =>
                          e.target.checked ? [...prev, cert.id] : prev.filter((c) => c !== cert.id)
                        )
                      }
                      className="accent-primary"
                    />
                    {cert.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Evitamos recomendarte lo que ya tenés</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="niche">¿Qué vende / hace tu empresa? *</Label>
              <Textarea
                id="niche"
                value={form.niche}
                onChange={setField("niche")}
                placeholder="Ej: Servicios de limpieza comercial para oficinas y edificios"
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="problem_solved">¿Qué problema resolvés para tus clientes? *</Label>
              <Textarea
                id="problem_solved"
                value={form.problem_solved}
                onChange={setField("problem_solved")}
                placeholder="Ej: Mantenemos los espacios de trabajo higiénicos y seguros para los empleados"
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_avatar">¿Quién es tu cliente ideal?</Label>
              <Textarea
                id="target_avatar"
                value={form.target_avatar}
                onChange={setField("target_avatar")}
                placeholder="Ej: Oficinas corporativas, hospitales, instalaciones gubernamentales"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previous_acquisition_methods">
                ¿Cómo conseguiste clientes hasta ahora?
              </Label>
              <Textarea
                id="previous_acquisition_methods"
                value={form.previous_acquisition_methods}
                onChange={setField("previous_acquisition_methods")}
                placeholder="Ej: Referencias, redes sociales, directorio de empresas locales"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_naics">
                Código NAICS (opcional — si no lo sabés, la IA lo sugiere)
              </Label>
              <Input
                id="primary_naics"
                value={form.primary_naics}
                onChange={setField("primary_naics")}
                placeholder="Ej: 561720"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                6 dígitos. Si lo dejás vacío, usamos IA para sugerirte el más
                apropiado.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analizando con IA...
                </>
              ) : isCompleted ? (
                "Actualizar Perfil Estratégico"
              ) : (
                "Generar mi Análisis Inicial →"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Resultado NAICS */}
      {naicsResult && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-800">NAICS sugerido por IA</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-2xl font-bold text-primary">{naicsResult.naics_code}</p>
              <p className="font-medium">{naicsResult.naics_description}</p>
              <p className="text-sm text-muted-foreground mt-2">{naicsResult.reasoning}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Descarga PDF */}
      {isCompleted && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="flex items-center justify-between py-5">
            <div>
              <p className="font-semibold">📄 Análisis Inicial — Día 1</p>
              <p className="text-sm text-muted-foreground">
                Tu Perfil Estratégico + código NAICS en PDF.
              </p>
            </div>
            <Button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {downloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
