"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { triggerFlash, triggerScreenShake } from "@/lib/wow-effects";
import { CheckCircle2, Download, Loader2, PlayCircle, ImagePlus, Trash2, ArrowRight, ListChecks } from "lucide-react";
import { WizardModal } from "@/components/wizard-modal";

const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","Washington D.C.","Puerto Rico"];

const CERTS = [
  { id: "SAM.gov", label: "SAM.gov activo" },
  { id: "WOSB", label: "WOSB" },
  { id: "SDVOSB", label: "SDVOSB" },
  { id: "HUBZone", label: "HUBZone" },
  { id: "8(a)", label: "8(a) SBA" },
  { id: "MBE", label: "MBE" },
];

const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring";
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
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(initCompleted);
  const [saving, setSaving] = useState(false);
  const [naicsResult, setNaicsResult] = useState<NAICSResult | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // ── Wizard modal (presentation only — no XP/logic change) ──
  const [wizardOpen, setWizardOpen] = useState(false);

  // ── Logo state ──────────────────────────────────────────────────────────────
  const [logoUrl, setLogoUrl] = useState<string | null>(
    (existingProfile as Record<string, unknown> | null)?.logo_url as string | null ?? null
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("El logo no puede superar 3MB.");
      return;
    }
    setUploadingLogo(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/profile/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 }),
      });
      const data = await res.json() as { ok?: boolean; logo_url?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "upload_failed");

      setLogoUrl(data.logo_url ?? null);
      toast.success("¡Logo subido! Aparecerá en todos tus documentos.");
    } catch {
      toast.error("Error al subir el logo. Intentá de nuevo.");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleLogoRemove() {
    setUploadingLogo(true);
    try {
      await fetch("/api/profile/logo", { method: "DELETE" });
      setLogoUrl(null);
      toast.success("Logo eliminado.");
    } catch {
      toast.error("Error al eliminar el logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

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

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();

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
      setWizardOpen(false); // cerrar el modal-wizard al terminar
      router.refresh(); // refresca tabs + sidebar (server components) con el progreso nuevo
      toast.success("¡Perfil Estratégico guardado! Ya podés descargar tu análisis.");

      // Celebración sobria — una sola ráfaga breve, colores de marca,
      // y respetando prefers-reduced-motion.
      const prefersReduced =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
      if (!prefersReduced) {
        confetti({
          particleCount: 45,
          spread: 60,
          startVelocity: 32,
          ticks: 120,
          origin: { y: 0.5 },
          colors: ["#E42D2C", "#152978", "#16A65F", "#FFD700"],
        });
      }
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
    <div className="space-y-6">
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

      {/* ── Clase en vivo ── */}
      <Card style={{ background: "color-mix(in srgb, var(--primary) 7%, var(--card))", borderColor: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
            <PlayCircle className="w-6 h-6" style={{ color: "var(--primary)" }} />
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

      {/* ── Realizar tareas (launch) / Resultado ── */}
      {!isCompleted ? (
        <Card>
          <CardContent className="py-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <ListChecks className="w-6 h-6" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <p className="font-semibold text-lg">Completá tu Perfil Estratégico</p>
              <p className="text-sm text-muted-foreground mt-1">
                En 4 pasos guiados generamos tu análisis inicial y tu código NAICS.
              </p>
            </div>
            <Button onClick={() => setWizardOpen(true)} className="gap-2 h-12 px-7 text-base font-bold">
              Realizar tareas — Día 1 <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {naicsResult && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="font-semibold text-green-800">NAICS sugerido por IA</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-2xl font-bold text-primary">{naicsResult.naics_code}</p>
                  <p className="font-medium text-green-900">{naicsResult.naics_description}</p>
                  <p className="text-sm text-green-800/80 mt-2">{naicsResult.reasoning}</p>
                </div>
              </CardContent>
            </Card>
          )}

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

          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setWizardOpen(true)} className="gap-2">
              <ListChecks className="w-4 h-4" /> Editar mi perfil
            </Button>
          </div>
        </>
      )}

      {/* ── Wizard modal — formulario guiado paso a paso ── */}
      <WizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Día 1 — Perfil Estratégico"
        subtitle="Completá tu perfil para generar tu análisis inicial."
        finishLabel={isCompleted ? "Actualizar Perfil" : "Generar mi Análisis"}
        finishing={saving}
        onFinish={() => handleSubmit()}
        steps={[
          {
            label: "Tu empresa",
            isValid: () => form.company_name.trim().length > 0,
            content: (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nombre de la empresa *</Label>
                    <Input id="company_name" value={form.company_name} onChange={setField("company_name")} placeholder="Ej: ABC Services LLC" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year_founded">Año de fundación</Label>
                    <Input id="year_founded" type="number" value={form.year_founded} onChange={setField("year_founded")} placeholder="Ej: 2018" min={1900} max={2025} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="employee_count">Cantidad de empleados</Label>
                    <Input id="employee_count" type="number" value={form.employee_count} onChange={setField("employee_count")} placeholder="Ej: 5" min={1} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="us_state">Estado donde operás</Label>
                    <select id="us_state" value={form.us_state} onChange={(e) => setForm((p) => ({ ...p, us_state: e.target.value }))} className={selectClass}>
                      <option value="">Seleccioná un estado</option>
                      {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground">Mejora la precisión del análisis de mercado</p>
                  </div>
                </div>
              </div>
            ),
          },
          {
            label: "Estructura y certificaciones",
            content: (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="legal_structure">Estructura legal de la empresa</Label>
                  <select id="legal_structure" value={form.legal_structure} onChange={(e) => setForm((p) => ({ ...p, legal_structure: e.target.value }))} className={selectClass}>
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
                <div className="space-y-2">
                  <Label>Certificaciones que ya tenés (opcional)</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CERTS.map((cert) => (
                      <label key={cert.id} className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                        <input type="checkbox" checked={certifications.includes(cert.id)} onChange={(e) => setCertifications((prev) => e.target.checked ? [...prev, cert.id] : prev.filter((c) => c !== cert.id))} className="accent-primary" />
                        {cert.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Evitamos recomendarte lo que ya tenés</p>
                </div>
              </div>
            ),
          },
          {
            label: "Tu negocio",
            isValid: () => form.niche.trim().length > 0 && form.problem_solved.trim().length > 0,
            content: (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="niche">¿Qué vende / hace tu empresa? *</Label>
                  <Textarea id="niche" value={form.niche} onChange={setField("niche")} placeholder="Ej: Servicios de limpieza comercial para oficinas y edificios" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problem_solved">¿Qué problema resolvés para tus clientes? *</Label>
                  <Textarea id="problem_solved" value={form.problem_solved} onChange={setField("problem_solved")} placeholder="Ej: Mantenemos los espacios de trabajo higiénicos y seguros para los empleados" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_avatar">¿Quién es tu cliente ideal?</Label>
                  <Textarea id="target_avatar" value={form.target_avatar} onChange={setField("target_avatar")} placeholder="Ej: Oficinas corporativas, hospitales, instalaciones gubernamentales" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="previous_acquisition_methods">¿Cómo conseguiste clientes hasta ahora?</Label>
                  <Textarea id="previous_acquisition_methods" value={form.previous_acquisition_methods} onChange={setField("previous_acquisition_methods")} placeholder="Ej: Referencias, redes sociales, directorio de empresas locales" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary_naics">Código NAICS (opcional — si no lo sabés, la IA lo sugiere)</Label>
                  <Input id="primary_naics" value={form.primary_naics} onChange={setField("primary_naics")} placeholder="Ej: 561720" maxLength={6} />
                  <p className="text-xs text-muted-foreground">6 dígitos. Si lo dejás vacío, usamos IA para sugerirte el más apropiado.</p>
                </div>
              </div>
            ),
          },
          {
            label: "Logo (opcional)",
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Si lo subís, aparecerá en todos tus documentos PDF (Análisis, Mapa de Códigos y Capability Statement).
                </p>
                <div className="flex items-center gap-5">
                  <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center"
                    style={{ background: logoUrl ? "#fff" : "var(--muted)", border: logoUrl ? "2px solid color-mix(in srgb, var(--secondary) 35%, transparent)" : "2px dashed var(--border)" }}>
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo empresa" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImagePlus className="w-7 h-7" style={{ color: "var(--muted-foreground)" }} />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
                    <Button type="button" variant="outline" size="sm" disabled={uploadingLogo} onClick={() => logoInputRef.current?.click()} className="gap-2">
                      {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                      {logoUrl ? "Cambiar logo" : "Subir logo"}
                    </Button>
                    {logoUrl && (
                      <Button type="button" variant="ghost" size="sm" disabled={uploadingLogo} onClick={handleLogoRemove} className="gap-2 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" /> Quitar logo
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">PNG, JPG o WebP · Máx 3MB</p>
                  </div>
                </div>
                <div className="rounded-lg p-3 text-sm" style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", color: "var(--muted-foreground)" }}>
                  Al tocar <strong style={{ color: "var(--foreground)" }}>“Generar mi Análisis”</strong> creamos tu perfil y tu código NAICS automáticamente.
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
