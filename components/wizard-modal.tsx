"use client";

import { useEffect, useState } from "react";
import { X, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

export interface WizardStep {
  label: string;
  /** Optional: block "Siguiente" until this returns true */
  isValid?: () => boolean;
  content: React.ReactNode;
}

const reduceMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * A launched, full-screen modal that walks the user through a set of steps
 * with smooth transitions. PRESENTATION ONLY — it just controls navigation
 * and reveal; the actual fields/state/submit live in the parent.
 */
export function WizardModal({
  open,
  onClose,
  title,
  subtitle,
  steps,
  onFinish,
  finishLabel = "Finalizar",
  finishing = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  steps: WizardStep[];
  onFinish: () => void;
  finishLabel?: string;
  finishing?: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  // Reset to first step whenever the modal opens
  useEffect(() => { if (open) setCurrent(0); }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const total = steps.length;
  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === total - 1;
  const canNext = step.isValid ? step.isValid() : true;
  const pct = ((current + 1) / total) * 100;

  const goNext = () => {
    if (!canNext) return;
    if (isLast) { onFinish(); return; }
    setDir(1);
    setCurrent((c) => Math.min(total - 1, c + 1));
  };
  const goBack = () => { setDir(-1); setCurrent((c) => Math.max(0, c - 1)); };

  const animName = reduceMotion() ? "none" : dir === 1 ? "wz-slide-next" : "wz-slide-prev";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99995,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        background: "rgba(8,15,36,0.62)", backdropFilter: "blur(8px)",
        animation: reduceMotion() ? "none" : "wz-fade 0.2s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "min(680px, 100%)", maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          background: "var(--card)", color: "var(--card-foreground)",
          border: "1px solid var(--border)", borderRadius: 20,
          boxShadow: "0 30px 80px -20px rgba(8,15,36,0.55)",
          overflow: "hidden",
          animation: reduceMotion() ? "none" : "wz-pop 0.28s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2, color: "var(--foreground)" }}>{title}</h2>
              {subtitle && <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                flexShrink: 0, width: 34, height: 34, borderRadius: 9,
                background: "var(--muted)", border: "1px solid var(--border)",
                color: "var(--muted-foreground)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={17} />
            </button>
          </div>

          {/* Step progress */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
                Paso {current + 1} de {total}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{step.label}</span>
            </div>
            <div style={{ height: 5, borderRadius: 5, background: "var(--muted)", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`, borderRadius: 5,
                background: "var(--success)", transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
          </div>
        </div>

        {/* Body — animated per step */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px" }}>
          <div key={current} style={{ animation: `${animName} 0.32s cubic-bezier(0.22,1,0.36,1) both` }}>
            {step.content}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 22px", borderTop: "1px solid var(--border)", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <button
            onClick={goBack}
            disabled={isFirst}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 16px", borderRadius: 10,
              background: "transparent", border: "1px solid var(--border)",
              color: "var(--muted-foreground)", fontWeight: 600, fontSize: 14,
              cursor: isFirst ? "not-allowed" : "pointer", opacity: isFirst ? 0.4 : 1,
            }}
          >
            <ArrowLeft size={15} /> Atrás
          </button>

          <button
            onClick={goNext}
            disabled={!canNext || finishing}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "11px 22px", borderRadius: 10, border: "none",
              background: "var(--primary)", color: "var(--primary-foreground)",
              fontWeight: 700, fontSize: 14,
              cursor: !canNext || finishing ? "not-allowed" : "pointer",
              opacity: !canNext ? 0.5 : 1,
              boxShadow: "0 4px 14px -3px color-mix(in srgb, var(--primary) 55%, transparent)",
            }}
          >
            {finishing ? (
              <><Loader2 size={15} className="animate-spin" /> Generando…</>
            ) : isLast ? (
              <><Check size={15} /> {finishLabel}</>
            ) : (
              <>Siguiente <ArrowRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
