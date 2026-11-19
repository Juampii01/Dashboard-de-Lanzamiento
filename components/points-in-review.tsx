"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Clock3, CheckCircle2, XCircle } from "lucide-react";
import type { ReviewItem, ReviewSummary } from "@/lib/missions/pending-points";

/**
 * Puntos en revisión: misiones que revisa el equipo (ráfagas y misión del día).
 * Los puntos se suman recién cuando el equipo aprueba la respuesta. Aquí el
 * participante ve cuánto tiene en revisión, el estado de cada envío y, cuando
 * el equipo revisa, el resumen de cuánto se le acreditó.
 *
 * Se recarga sola cuando se envía una misión (evento "mission-submitted").
 */
export const MISSION_SUBMITTED_EVENT = "mission-submitted";

const fmt = (n: number) => n.toLocaleString("es");

function StatusChip({ item }: { item: ReviewItem }) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 9px",
  };
  if (item.status === "pending") {
    return (
      <span style={{ ...base, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
        <Clock3 size={12} /> En revisión · +{fmt(item.reward)}
      </span>
    );
  }
  if (item.status === "approved") {
    return (
      <span style={{ ...base, color: "var(--success)", background: "color-mix(in srgb, var(--success) 12%, transparent)" }}>
        <CheckCircle2 size={12} /> Acreditada · +{fmt(item.credited)}
      </span>
    );
  }
  return (
    <span style={{ ...base, color: "var(--destructive)", background: "color-mix(in srgb, var(--destructive) 12%, transparent)" }}>
      <XCircle size={12} /> Respuesta incorrecta · 0
    </span>
  );
}

export function PointsInReview({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [data, setData] = useState<ReviewSummary | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/points/review", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (alive && d?.ok) setData(d as ReviewSummary); })
        .catch(() => { /* noop */ });
    };
    load();
    window.addEventListener(MISSION_SUBMITTED_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(MISSION_SUBMITTED_EVENT, load);
    };
  }, []);

  const acknowledge = useCallback(async () => {
    setDismissed(true);
    try { await fetch("/api/points/review", { method: "POST" }); } catch { /* noop */ }
  }, []);

  if (!data || data.items.length === 0) return null;

  const { unseen } = data;
  const hasResults = !dismissed && (unseen.credited_count > 0 || unseen.rejected_count > 0);

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid color-mix(in srgb, var(--primary) 30%, var(--border))",
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      {/* Resumen de lo que el equipo revisó desde la última vez */}
      {hasResults && (
        <div
          style={{
            borderRadius: 10, padding: "10px 12px", marginBottom: 10,
            background: "color-mix(in srgb, var(--success) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--success) 35%, transparent)",
          }}
        >
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
            El equipo revisó tus misiones
          </p>
          {unseen.credited_count > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--success)", fontWeight: 600 }}>
              ✅ Se te acreditaron {fmt(unseen.credited_points)} pts
              {unseen.credited_count > 1 ? ` (${unseen.credited_count} misiones)` : ""}.
            </p>
          )}
          {unseen.rejected_count > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--destructive)", fontWeight: 600 }}>
              ❌ {fmt(unseen.rejected_points)} pts no se acreditaron: respuesta incorrecta
              {unseen.rejected_count > 1 ? ` (${unseen.rejected_count} misiones)` : ""}.
              {" "}Si la misión sigue abierta, puedes volver a responderla.
            </p>
          )}
          <button
            onClick={acknowledge}
            style={{
              marginTop: 8, padding: "5px 12px", borderRadius: 7, cursor: "pointer",
              fontSize: 12, fontWeight: 700, color: "var(--foreground)",
              background: "var(--muted)", border: "1px solid var(--border)",
            }}
          >
            Entendido
          </button>
        </div>
      )}

      {/* Total en revisión + detalle desplegable */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          background: "none", border: "none", padding: 0, cursor: "pointer",
          textAlign: "left", font: "inherit", color: "inherit",
        }}
      >
        <Clock3 size={18} style={{ flexShrink: 0, color: "var(--primary)" }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>
            {data.pending_count > 0
              ? `${fmt(data.pending_points)} pts en revisión`
              : "No tienes puntos en revisión"}
          </span>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--muted-foreground)" }}>
            {data.pending_count > 0
              ? `${data.pending_count} ${data.pending_count === 1 ? "misión enviada espera" : "misiones enviadas esperan"} la revisión del equipo. Se suman cuando se aprueban.`
              : "Las misiones que envías se suman cuando el equipo las aprueba."}
          </span>
        </span>
        <ChevronDown
          size={18}
          style={{ flexShrink: 0, color: "var(--muted-foreground)", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <ul style={{ listStyle: "none", margin: "10px 0 0", padding: "8px 0 0", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
          {data.items.map((it) => (
            <li key={`${it.kind}-${it.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span style={{ minWidth: 0, flex: "1 1 180px" }}>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.kind === "rafaga" ? "⚡ " : "🎯 "}{it.title}
                </span>
                <span style={{ display: "block", fontSize: 10.5, color: "var(--muted-foreground)" }}>
                  Enviada el {new Date(it.submitted_at).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
              <StatusChip item={it} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
