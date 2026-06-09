"use client";

import { useEffect, useRef, useState } from "react";
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
  // The step currently animating OUT (rendered alongside the entering one for a brief overlap)
  const [exiting, setExiting] = useState<{ idx: number; dir: 1 | -1 } | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to first step whenever the modal opens
  useEffect(() => { if (open) { setCurrent(0); setExiting(null); } }, [open]);

  // Clean up the exit timer on unmount
  useEffect(() => () => { if (exitTimer.current) clearTimeout(exitTimer.current); }, []);

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

  const transitionTo = (target: number, direction: 1 | -1) => {
    if (target === current) return;
    setDir(direction);
    if (reduceMotion()) { setCurrent(target); return; }
    // Keep the outgoing step mounted briefly so it can slide out while the next slides in.
    setExiting({ idx: current, dir: direction });
    setCurrent(target);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setExiting(null), 420); // ~ --dur-med
  };

  const goNext = () => {
    if (!canNext) return;
    if (isLast) { onFinish(); return; }
    transitionTo(Math.min(total - 1, current + 1), 1);
  };
  const goBack = () => { transitionTo(Math.max(0, current - 1), -1); };

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
                Paso{" "}
                <span key={current} style={{ display: "inline-block", animation: reduceMotion() ? "none" : "wz-num-swap var(--dur-fast) var(--ease-out) both" }}>
                  {current + 1}
                </span>{" "}
                de {total}
              </span>
              <span key={`lbl-${current}`} style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", animation: reduceMotion() ? "none" : "wz-num-swap var(--dur-fast) var(--ease-out) both" }}>{step.label}</span>
            </div>
            <div style={{ height: 5, borderRadius: 5, background: "var(--muted)", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`, borderRadius: 5,
                background: "var(--success)", transition: "width var(--dur-med) var(--ease-out)",
              }} />
            </div>
          </div>
        </div>

        {/* Body — directional enter/exit with field stagger (transform+opacity only) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px" }}>
          <div style={{ position: "relative" }}>
            {exiting && (
              <div className="wz-step wz-step-exit" data-dir={exiting.dir} key={`exit-${exiting.idx}`} aria-hidden>
                {steps[exiting.idx].content}
              </div>
            )}
            <div className="wz-step wz-step-enter" data-dir={dir} key={`enter-${current}`}>
              {step.content}
            </div>
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
