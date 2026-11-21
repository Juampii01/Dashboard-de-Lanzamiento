"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, CheckCircle2, Download, ExternalLink, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

const NAME_MAX = 45;

type Claim = { certificate_number: string; full_name: string; issue_date: string; verify_url: string | null };
type State = { eligible: boolean; claim: Claim | null; fullName: string | null; isViewer: boolean };

const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 22 };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: "100%", fontSize: 16, padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)",
  background: "var(--background)", color: "var(--foreground)",
};

function splitName(full: string | null): { first: string; last: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
  if (parts.length === 2) return { first: parts[0], last: parts[1] };
  return { first: parts.slice(0, parts.length - 2).join(" "), last: parts.slice(-2).join(" ") };
}

function fmtDate(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function CertificadoClient() {
  const [state, setState] = useState<State | null>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [display, setDisplay] = useState("");
  const [displayTouched, setDisplayTouched] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/certificate", { cache: "no-store" });
    if (!r.ok) { setState({ eligible: false, claim: null, fullName: null, isViewer: false }); return; }
    const d = (await r.json()) as State;
    setState(d);
    const s = splitName(d.fullName);
    setFirst(s.first); setLast(s.last); setDisplay((d.fullName ?? "").trim().slice(0, NAME_MAX));
  }, []);
  useEffect(() => { void load(); }, [load]);

  // Mientras no toque el nombre del certificado, se arma solo con nombre + apellido.
  const autoDisplay = useMemo(() => `${first} ${last}`.replace(/\s+/g, " ").trim().slice(0, NAME_MAX), [first, last]);
  const shownName = displayTouched ? display : (autoDisplay || display);

  async function claim() {
    if (!confirmed || sending) return;
    setSending(true);
    const r = await fetch("/api/certificate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: first, last_name: last, full_name: shownName }),
    });
    const d = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) { toast.error(d.message ?? "No se pudo emitir el certificado"); return; }
    toast.success(d.emailed === false ? "¡Listo! Tu certificado está emitido." : "¡Listo! También te lo enviamos por email.");
    await load();
  }

  async function download() {
    setDownloading(true);
    try {
      const r = await fetch("/api/certificate/pdf", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${state?.claim?.certificate_number ?? "certificado"}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo descargar. Intenta de nuevo en unos segundos.");
    }
    setDownloading(false);
  }

  if (!state) {
    return <p className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</p>;
  }

  return (
    <div className="space-y-6" style={{ maxWidth: 760, margin: "0 auto" }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B8860B", margin: 0 }}>GovBidder Academy</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: "6px 0 4px", color: "var(--foreground)" }}>Tu certificado de finalización</h1>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>
          Certificado oficial con número único y código QR. Cualquier persona puede verificarlo en verify.govbidder.net.
        </p>
      </div>

      {state.claim ? (
        <div style={{ ...card, borderColor: "color-mix(in srgb, #16A65F 45%, transparent)" }} className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 shrink-0" style={{ color: "#16A65F" }} />
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--foreground)" }}>¡Tu certificado está emitido!</p>
              <p style={{ fontSize: 14, margin: 0, color: "var(--muted-foreground)" }}>También te lo enviamos por email.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3" style={{ fontSize: 14 }}>
            <div><p style={{ margin: 0, color: "var(--muted-foreground)" }}>Nombre</p><p style={{ margin: 0, fontWeight: 800 }}>{state.claim.full_name}</p></div>
            <div><p style={{ margin: 0, color: "var(--muted-foreground)" }}>Número</p><p style={{ margin: 0, fontWeight: 800 }}>{state.claim.certificate_number}</p></div>
            <div><p style={{ margin: 0, color: "var(--muted-foreground)" }}>Fecha</p><p style={{ margin: 0, fontWeight: 800 }}>{fmtDate(state.claim.issue_date)}</p></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={download} disabled={downloading}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#152978", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 15, fontWeight: 800, cursor: downloading ? "wait" : "pointer" }}>
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Descargar PDF
            </button>
            {state.claim.verify_url && (
              <a href={state.claim.verify_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 10, padding: "12px 20px", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                <ExternalLink className="w-4 h-4" /> Ver verificación
              </a>
            )}
          </div>
        </div>
      ) : !state.eligible ? (
        <div style={card} className="flex items-start gap-3">
          <Lock className="w-6 h-6 shrink-0" style={{ color: "var(--muted-foreground)" }} />
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px", color: "var(--foreground)" }}>Se desbloquea al completar el Día 4</p>
            <p style={{ fontSize: 14, margin: 0, color: "var(--muted-foreground)" }}>
              Termina los 4 días del challenge y vuelve aquí para reclamar tu certificado.
            </p>
            <Link href="/dashboard/dia-4" style={{ display: "inline-block", marginTop: 12, fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>Ir al Día 4 →</Link>
          </div>
        </div>
      ) : state.isViewer ? (
        <div style={card}><p style={{ margin: 0 }}>Solo la persona titular de la cuenta puede reclamar el certificado.</p></div>
      ) : (
        <div style={card} className="space-y-5">
          <div className="flex items-center gap-3">
            <Award className="w-7 h-7 shrink-0" style={{ color: "#D4A017" }} />
            <p style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "var(--foreground)" }}>Completaste el challenge. Reclama tu certificado</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label style={labelStyle} htmlFor="cert-first">Nombre(s)</label>
              <input id="cert-first" style={inputStyle} value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" />
            </div>
            <div>
              <label style={labelStyle} htmlFor="cert-last">Apellido(s)</label>
              <input id="cert-last" style={inputStyle} value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
            </div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="cert-display">Nombre tal como va a aparecer en el certificado</label>
            <input id="cert-display" style={inputStyle} maxLength={NAME_MAX} value={shownName}
              onChange={(e) => { setDisplayTouched(true); setDisplay(e.target.value); }} />
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "6px 0 0" }}>
              {shownName.length}/{NAME_MAX} caracteres. Revisa mayúsculas y tildes: así se va a imprimir.
            </p>
          </div>

          {/* Vista previa del nombre sobre el certificado */}
          <div style={{ borderRadius: 14, background: "#F8F8F8", border: "1px solid #e5e7eb", padding: "22px 16px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>This certificate recognizes that</p>
            <p style={{ margin: "8px 0", fontSize: "clamp(20px, 5vw, 30px)", fontWeight: 800, color: "#0d1a3d", wordBreak: "break-word" }}>{shownName || "Tu nombre"}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>has successfully completed the program GovBidder Challenge</p>
          </div>

          <label className="flex items-start gap-3" style={{ fontSize: 14, color: "var(--foreground)", cursor: "pointer" }}>
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1 }} />
            <span>Confirmo que mi nombre está bien escrito. Después de emitido no se puede cambiar.</span>
          </label>

          <button onClick={claim} disabled={!confirmed || sending || !first.trim() || !last.trim() || !shownName.trim()}
            style={{
              width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
              background: confirmed ? "#E42D2C" : "var(--muted)", color: confirmed ? "#fff" : "var(--muted-foreground)",
              border: "none", borderRadius: 12, padding: "16px 20px", fontSize: 17, fontWeight: 900,
              cursor: confirmed && !sending ? "pointer" : "not-allowed",
            }}>
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
            {sending ? "Emitiendo tu certificado…" : "Reclamar mi certificado"}
          </button>
        </div>
      )}
    </div>
  );
}
