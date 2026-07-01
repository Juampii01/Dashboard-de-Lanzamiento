"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { triggerFlash, triggerScreenShake } from "@/lib/wow-effects";
import { CheckCircle2, Download, Loader2, ImagePlus, Trash2, ArrowRight, ListChecks, Plus, X, RefreshCw } from "lucide-react";
import { WizardModal } from "@/components/wizard-modal";
import { TaskCompleteModal } from "@/components/task-complete-modal";
import { FieldHelp } from "@/components/field-help";

const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","Washington D.C.","Puerto Rico"];

// Certificaciones divididas por nivel (sin SAM.gov).
const FEDERAL_CERTS = ["Small Business", "8(a)", "WOSB", "EDWOSB", "HUBZone", "VOSB", "SDVOSB"];
const STATE_CERTS   = ["MBE", "WBE", "MWBE", "SBE", "DBE", "VBE", "SDVBE/DVBE", "LGBTBE", "DOBE", "ACDBE"];

const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring";
import type { Database } from "@/lib/supabase/types";
import { DevTestBar } from "@/components/dev-test-bar";

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
  const [celebrateOpen, setCelebrateOpen] = useState(false);

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
      toast.error("Error al subir el logo. Intenta de nuevo.");
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

  const p0 = (existingProfile ?? {}) as Record<string, unknown>;
  const [form, setForm] = useState({
    company_name: existingProfile?.company_name ?? "",
    legal_structure: (p0.legal_structure as string) ?? "",
    year_founded: existingProfile?.year_founded?.toString() ?? "",
    us_state: (p0.us_state as string) ?? "",
    address: (p0.address as string) ?? "",
    zip_code: (p0.zip_code as string) ?? "",
    phone: (p0.phone as string) ?? "",
    corporate_email: (p0.corporate_email as string) ?? "",
    website: (p0.website as string) ?? "",
    duns_number: (p0.duns_number as string) ?? "",
    cage_code: (p0.cage_code as string) ?? "",
    uei: (p0.uei as string) ?? "",
    primary_naics: existingProfile?.primary_naics ?? "",
    niche: existingProfile?.niche ?? "",
    business_category: (p0.business_category as string) ?? "",
    problem_solved: existingProfile?.problem_solved ?? "",
    current_offering: (p0.current_offering as string) ?? "",
  });
  const [certifications, setCertifications] = useState<string[]>(
    (p0.existing_certifications as string[] | null) ?? []
  );
  const [keywords, setKeywords] = useState<string[]>((p0.keywords as string[] | null) ?? []);
  const [keywordInput, setKeywordInput] = useState("");

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) { setKeywords((p) => [...p, kw]); setKeywordInput(""); }
  };
  const toggleCert = (id: string) =>
    setCertifications((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  // ── Actualizar NAICS (solo visible tras completar el Día 1) ──
  const [naicsEditOpen, setNaicsEditOpen] = useState(false);
  const [naicsEditValue, setNaicsEditValue] = useState(existingProfile?.primary_naics ?? "");
  const [savingNaics, setSavingNaics] = useState(false);
  const [naicsChanged, setNaicsChanged] = useState(false); // avisar que re-descarguen el PDF

  async function handleUpdateNaics() {
    const code = naicsEditValue.trim();
    if (!code) return;
    setSavingNaics(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("company_profiles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ primary_naics: code } as any)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      setForm((prev) => ({ ...prev, primary_naics: code }));
      setNaicsResult((prev) => prev ? { ...prev, naics_code: code } : prev);
      setNaicsEditOpen(false);
      setNaicsChanged(true);
      toast.success("Código NAICS actualizado — vuelve a descargar tu PDF para reflejar el cambio.");
      router.refresh();
    } catch {
      toast.error("No se pudo actualizar el NAICS. Intenta de nuevo.");
    } finally {
      setSavingNaics(false);
    }
  }

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
      gameError("Ingresa el nombre de tu empresa para continuar");
      return;
    }
    if (!form.legal_structure.trim()) {
      gameError("Elige el tipo de empresa (estructura legal)");
      return;
    }
    if (!form.phone.trim()) {
      gameError("Ingresa el teléfono de la empresa");
      return;
    }
    if (!form.corporate_email.trim()) {
      gameError("Ingresa el email corporativo de la empresa");
      return;
    }
    if (!form.niche.trim()) {
      gameError("Cuéntanos qué producto o servicio ofrece tu empresa");
      return;
    }
    if (!form.problem_solved.trim()) {
      gameError("Describe qué problema resuelve tu empresa");
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
            businessCategory: form.business_category,
            problemSolved: form.problem_solved,
            currentOffering: form.current_offering,
            keywords,
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
          let msg = "No pudimos generar tu análisis con IA. Intenta de nuevo.";
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
        legal_structure: form.legal_structure || null,
        year_founded: form.year_founded ? parseInt(form.year_founded) : null,
        us_state: form.us_state || null,
        address: form.address || null,
        zip_code: form.zip_code || null,
        phone: form.phone || null,
        corporate_email: form.corporate_email || null,
        website: form.website || null,
        duns_number: form.duns_number || null,
        cage_code: form.cage_code || null,
        uei: form.uei || null,
        primary_naics: primaryNaics || null,
        niche: form.niche,
        business_category: form.business_category || null,
        problem_solved: form.problem_solved,
        current_offering: form.current_offering || null,
        keywords: keywords.length > 0 ? keywords : null,
        existing_certifications: certifications.length > 0 ? certifications : null,
        // Persistir el logo subido en el Paso 4. Necesario porque /api/profile/logo
        // hace UPDATE y si la fila aún no existía (usuario nuevo) ese update era no-op.
        logo_url: logoUrl,
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

      // Primera vez completada (se otorgó XP) → modal de festejo (dispara el confetti).
      // En reediciones (pointsAwarded 0) solo un toast, sin reabrir el festejo.
      if (xpData.pointsAwarded > 0) {
        setCelebrateOpen(true);
      } else {
        toast.success("¡Perfil actualizado! Ya puedes descargar tu análisis.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Estamos teniendo un problema. Intenta de nuevo.");
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
      setNaicsChanged(false);
    } catch {
      toast.error("Error al generar el PDF. Intenta de nuevo.");
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
            Completa el perfil de tu empresa para identificar tu oportunidad en
            el mercado gubernamental.
          </p>
        </div>
      </div>

      {/* ── Realizar tareas (launch) / Resultado ── */}
      {!isCompleted ? (
        <Card>
          <CardContent className="py-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <ListChecks className="w-6 h-6" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <p className="font-semibold text-lg">Completa tu Perfil Estratégico</p>
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

          {/* Actualizar NAICS — solo disponible tras completar el Día 1 */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Tu código NAICS</p>
                  <p className="text-sm text-muted-foreground">
                    Actual: <span className="font-mono font-semibold text-foreground">{form.primary_naics || "—"}</span>
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => { setNaicsEditValue(form.primary_naics); setNaicsEditOpen((v) => !v); }}>
                  <RefreshCw className="w-4 h-4" /> Actualizar NAICS
                </Button>
              </div>
              {naicsEditOpen && (
                <div className="flex gap-2 pt-1">
                  <Input value={naicsEditValue} onChange={(e) => setNaicsEditValue(e.target.value)} placeholder="Ej: 561720" maxLength={6} />
                  <Button onClick={handleUpdateNaics} disabled={savingNaics || !naicsEditValue.trim()}>
                    {savingNaics ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex items-center justify-between py-5">
              <div>
                <p className="font-semibold">📄 Análisis Inicial — Día 1</p>
                <p className="text-sm text-muted-foreground">
                  Tu Perfil Estratégico + código NAICS en PDF.
                </p>
                {naicsChanged && (
                  <p className="text-sm font-semibold mt-1" style={{ color: "var(--primary)" }}>
                    ⚠️ Actualizaste tu NAICS — vuelve a descargar el PDF para reflejar el cambio.
                  </p>
                )}
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

          {/* 🎁 Regalo — Manual NAICS 2022 completo (mismo doc para todos) */}
          <Card style={{ background: "color-mix(in srgb, var(--secondary) 6%, var(--card))", borderColor: "color-mix(in srgb, var(--secondary) 30%, transparent)" }}>
            <CardContent className="flex items-center justify-between py-5 gap-4 flex-wrap">
              <div>
                <p className="font-semibold">🎁 Regalo — Manual NAICS 2022 completo</p>
                <p className="text-sm text-muted-foreground">
                  El catálogo oficial con todos los códigos NAICS (US Census Bureau). Tu referencia para encontrar todos los códigos de tu negocio.
                </p>
              </div>
              <a
                href="/codigos-naics-2022.pdf"
                download="Manual-NAICS-2022.pdf"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-opacity hover:opacity-90"
                style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}
              >
                <Download className="w-4 h-4" /> Descargar
              </a>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setWizardOpen(true)} className="gap-2">
              <ListChecks className="w-4 h-4" /> Editar mi perfil
            </Button>
          </div>
        </>
      )}

      <TaskCompleteModal
        open={celebrateOpen}
        onClose={() => setCelebrateOpen(false)}
        onDownload={handleDownloadPdf}
        downloading={downloadingPdf}
        downloadLabel="Descargar mi análisis (PDF)"
      />

      {/* ── Wizard modal — formulario guiado paso a paso ── */}
      <WizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Día 1 — Perfil Estratégico"
        subtitle="Completa tu perfil para generar tu análisis inicial."
        finishLabel={isCompleted ? "Actualizar Perfil" : "Generar mi Análisis"}
        finishing={saving}
        onFinish={() => handleSubmit()}
        steps={[
          {
            label: "Tu empresa",
            isValid: () =>
              form.company_name.trim().length > 0 &&
              form.legal_structure.trim().length > 0 &&
              form.phone.trim().length > 0 &&
              form.corporate_email.trim().length > 0,
            content: (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nombre de la empresa *<FieldHelp text="El nombre legal completo de tu empresa, tal cual figura en tu registro (incluye LLC, Inc., Corp., etc.)." /></Label>
                    <Input id="company_name" value={form.company_name} onChange={setField("company_name")} placeholder="Ej: ABC Services LLC" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal_structure">Tipo de empresa *<FieldHelp text="La estructura legal con la que está registrada tu empresa. Determina a qué tipos de contrato puedes acceder." /></Label>
                    <select id="legal_structure" value={form.legal_structure} onChange={(e) => setForm((p) => ({ ...p, legal_structure: e.target.value }))} className={selectClass}>
                      <option value="">Selecciona una opción</option>
                      <option value="LLC">LLC (Limited Liability Company)</option>
                      <option value="S-Corp">S-Corporation</option>
                      <option value="C-Corp">C-Corporation</option>
                      <option value="Sole Proprietor">Sole Proprietor (Autónomo)</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Nonprofit">Nonprofit / 501(c)(3)</option>
                      <option value="Other">Otro</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="year_founded">¿En qué año se constituyó?<FieldHelp text="El año en que tu empresa fue legalmente constituida / registrada (no el año en que empezaste a operar informalmente)." /></Label>
                    <Input id="year_founded" type="number" value={form.year_founded} onChange={setField("year_founded")} placeholder="Ej: 2018" min={1900} max={2025} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="us_state">Estado donde opera<FieldHelp text="El estado de EE.UU. donde tu empresa está registrada u opera principalmente. Mejora la precisión del análisis de mercado." /></Label>
                    <select id="us_state" value={form.us_state} onChange={(e) => setForm((p) => ({ ...p, us_state: e.target.value }))} className={selectClass}>
                      <option value="">Selecciona un estado</option>
                      {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección (opcional)<FieldHelp text="La dirección de tu empresa (calle y número). Aparecerá en tu web y en tu Capability Statement." /></Label>
                    <Input id="address" value={form.address} onChange={setField("address")} placeholder="Ej: 123 Main St, Miami" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">ZIP code (opcional)<FieldHelp text="El código postal (ZIP) de la dirección de tu empresa." /></Label>
                    <Input id="zip_code" value={form.zip_code} onChange={setField("zip_code")} placeholder="Ej: 33101" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *<FieldHelp text="El teléfono de contacto de tu empresa. Un Contracting Officer lo usa para verificarte y contactarte." /></Label>
                    <Input id="phone" value={form.phone} onChange={setField("phone")} placeholder="Ej: (844) 555-0100" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="corporate_email">Email corporativo *<FieldHelp text="El email oficial de tu empresa (idealmente con tu dominio, ej: info@tuempresa.com). Aparecerá en tus documentos." /></Label>
                    <Input id="corporate_email" type="email" value={form.corporate_email} onChange={setField("corporate_email")} placeholder="Ej: info@tuempresa.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website (opcional)<FieldHelp text="El sitio web de tu empresa. Si no tienes, puedes dejarlo vacío." /></Label>
                  <Input id="website" value={form.website} onChange={setField("website")} placeholder="Ej: www.tuempresa.com" />
                </div>
              </div>
            ),
          },
          {
            label: "Registro y códigos",
            content: (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">Todo este paso es opcional — pero cargar tus identificadores hace tu perfil más profesional ante el gobierno.</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="duns_number">DUNS Number<FieldHelp text="Data Universal Numbering System (DUNS): identificador de 9 dígitos de tu empresa. Opcional." /></Label>
                    <Input id="duns_number" value={form.duns_number} onChange={setField("duns_number")} placeholder="Ej: 123456789" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cage_code">CAGE Code<FieldHelp text="Commercial and Government Entity (CAGE) Code: código de 5 caracteres que asigna el gobierno de EE.UU. Opcional." /></Label>
                    <Input id="cage_code" value={form.cage_code} onChange={setField("cage_code")} placeholder="Ej: 1A2B3" maxLength={5} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uei">UEI Number<FieldHelp text="Unique Entity ID (UEI): identificador único de 12 caracteres que reemplazó al DUNS en SAM.gov. Opcional." /></Label>
                    <Input id="uei" value={form.uei} onChange={setField("uei")} placeholder="Ej: ABC123DEF456" maxLength={12} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary_naics">Código NAICS (opcional)<FieldHelp text="Si ya conoces tu código NAICS (6 dígitos), cárgalo. Si lo dejas vacío, la IA lo genera por ti según tu negocio." /></Label>
                  <Input id="primary_naics" value={form.primary_naics} onChange={setField("primary_naics")} placeholder="Ej: 561720" maxLength={6} />
                  <p className="text-xs text-muted-foreground">Si lo dejas vacío, la IA te sugiere el más apropiado.</p>
                </div>

                <div className="space-y-2">
                  <Label>Certificaciones (opcional)<FieldHelp text="Marca las certificaciones que YA tienes. Las dividimos en federales y estatales/locales — toca cada sección para desplegarla." /></Label>
                  <details className="rounded-lg border border-border overflow-hidden" open>
                    <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold bg-muted/50">Estatales / locales</summary>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 p-3">
                      {STATE_CERTS.map((c) => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                          <input type="checkbox" checked={certifications.includes(c)} onChange={() => toggleCert(c)} className="accent-primary" />
                          {c}
                        </label>
                      ))}
                    </div>
                  </details>
                  <details className="rounded-lg border border-border overflow-hidden">
                    <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold bg-muted/50">Federales</summary>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 p-3">
                      {FEDERAL_CERTS.map((c) => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                          <input type="checkbox" checked={certifications.includes(c)} onChange={() => toggleCert(c)} className="accent-primary" />
                          {c}
                        </label>
                      ))}
                    </div>
                  </details>
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
                  <Label htmlFor="niche">¿Qué producto o servicio ofrece tu empresa? *<FieldHelp text="Describe concretamente lo que ofreces. Ej: 'Mi empresa ofrece productos de personal care: pasta dental, cepillos, enjuague bucal e hilo dental.' Cuanto más específico, mejor identifica la IA tu código." /></Label>
                  <Textarea id="niche" value={form.niche} onChange={setField("niche")} placeholder="Ej: Mi empresa ofrece productos de personal care: pasta dental, cepillos de dientes, enjuague bucal e hilo dental." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_category">¿Cuál es tu rubro o nicho de mercado?<FieldHelp text="El sector/industria general en el que se mueve tu empresa. Ej: cuidado personal, construcción, servicios de limpieza, tecnología, alimentos." /></Label>
                  <Input id="business_category" value={form.business_category} onChange={setField("business_category")} placeholder="Ej: Cuidado personal e higiene (consumer goods)" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problem_solved">¿Qué problema resuelve tu empresa para sus clientes? *<FieldHelp text="Qué necesidad o dolor concreto resolvés. Ej: 'Damos acceso a productos de higiene de calidad a precio accesible para distribuidores y comercios.'" /></Label>
                  <Textarea id="problem_solved" value={form.problem_solved} onChange={setField("problem_solved")} placeholder="Ej: Proveemos productos de higiene confiables y a buen precio, con stock constante para distribuidores." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kw">Palabras clave (keywords)<FieldHelp text="Agrega términos que describan tu negocio (en inglés es ideal para el gobierno). Ayudan a la IA a identificar mejor tu código NAICS. Toca + para sumar cada una." /></Label>
                  <div className="flex gap-2">
                    <Input id="kw" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                      placeholder="Ej: oral care, toothpaste, personal hygiene" />
                    <Button type="button" variant="outline" size="icon" onClick={addKeyword}><Plus className="w-4 h-4" /></Button>
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {keywords.map((kw) => (
                        <Badge key={kw} variant="secondary" className="flex items-center gap-1">
                          {kw}
                          <button onClick={() => setKeywords((p) => p.filter((k) => k !== kw))} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_offering">Cuéntanos con tus palabras qué le ofreces hoy a tus clientes<FieldHelp text="Explica libremente, como se lo contarías a un conocido, qué producto o servicio le das hoy a tus clientes actuales. Esto enriquece tu análisis." /></Label>
                  <Textarea id="current_offering" value={form.current_offering} onChange={setField("current_offering")} placeholder="Ej: Hoy les vendo a farmacias y minimercados packs de productos de higiene bucal; entrego semanalmente y manejo precios mayoristas." rows={3} />
                </div>
              </div>
            ),
          },
          {
            label: "Logo (opcional)",
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Si lo subes, aparecerá en todos tus documentos PDF (Análisis, Mapa de Códigos y Capability Statement).
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
