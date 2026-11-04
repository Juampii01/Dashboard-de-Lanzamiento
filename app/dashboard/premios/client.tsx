"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Lock, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";

interface Tier { id: string; points: number; title: string; description: string | null }
interface Claim { tier_id: string; status: "pending" | "approved" | "rejected"; note: string | null }

/**
 * Premios de On Demand. No es un sorteo: cada nivel se gana al llegar a sus
 * puntos. La persona pide el premio y el equipo lo entrega.
 */
export function RewardsClient() {
  const [data, setData] = useState<{ tiers: Tier[]; claims: Claim[]; points: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/rewards", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData({ tiers: d.tiers ?? [], claims: d.claims ?? [], points: d.points ?? 0 }))
      .catch(() => setData({ tiers: [], claims: [], points: 0 }));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Los puntos suben en vivo (videos, misiones) → refrescar.
  useEffect(() => {
    const onXp = (e: Event) => {
      const total = (e as CustomEvent<{ total?: number }>).detail?.total;
      if (typeof total === "number") setData((d) => (d ? { ...d, points: total } : d));
    };
    window.addEventListener("xp-gained", onXp);
    return () => window.removeEventListener("xp-gained", onXp);
  }, []);

  async function claim(tierId: string) {
    setBusy(tierId);
    setError(null);
    try {
      const res = await fetch("/api/rewards/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier_id: tierId }) });
      const d = await res.json();
      if (!res.ok) setError(d.error === "not_enough_points" ? "Todavía no tienes los puntos para este premio." : "No se pudo enviar la solicitud.");
      load();
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(null);
    }
  }

  const claimByTier = new Map((data?.claims ?? []).map((c) => [c.tier_id, c]));
  const next = data?.tiers.find((t) => t.points > (data?.points ?? 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E42D2C", margin: 0 }}>
          Tus puntos valen
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 3vw, 30px)", fontWeight: 800, margin: "4px 0 0", color: "var(--foreground)" }}>
          Premios
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--muted-foreground)", margin: "6px 0 0", maxWidth: "62ch" }}>
          No es un sorteo: cuando llegas a los puntos de un premio, lo pides y el equipo te lo entrega. Los puntos no se descuentan.
        </p>
      </header>

      {data === null ? (
        <p style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 14 }}>
          <Loader2 size={16} className="animate-spin" /> Cargando premios…
        </p>
      ) : (
        <>
          <div className="gb-elev" style={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", padding: "18px 20px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)" }}>Tus puntos</p>
              <p style={{ margin: "2px 0 0", fontFamily: "var(--font-arcade)", fontSize: 40, lineHeight: 1, color: "var(--foreground)" }}>{data.points.toLocaleString("es-US")}</p>
            </div>
            {next && (
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted-foreground)", maxWidth: "40ch" }}>
                Te faltan <strong style={{ color: "var(--foreground)" }}>{(next.points - data.points).toLocaleString("es-US")} pts</strong> para <strong style={{ color: "var(--foreground)" }}>{next.title}</strong>.
              </p>
            )}
          </div>

          {error && <p style={{ margin: 0, fontSize: 13.5, color: "#E42D2C" }}>{error}</p>}

          {data.tiers.length === 0 ? (
            <div style={{ borderRadius: 16, border: "1px dashed var(--border)", background: "var(--card)", padding: "40px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
              Muy pronto vas a ver aquí los premios. Mientras tanto, sigue sumando puntos.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {data.tiers.map((t) => {
                const c = claimByTier.get(t.id);
                const reached = data.points >= t.points;
                const pct = Math.min(100, Math.round((data.points / t.points) * 100));
                return (
                  <div key={t.id} className="gb-elev" style={{
                    borderRadius: 16, border: `1px solid ${reached ? "color-mix(in srgb, #E42D2C 45%, transparent)" : "var(--border)"}`,
                    background: "var(--card)", padding: 18, display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 10, background: reached ? "color-mix(in srgb, #E42D2C 12%, transparent)" : "var(--muted)", color: reached ? "#E42D2C" : "var(--muted-foreground)" }}>
                        {reached ? <Gift size={20} /> : <Lock size={18} />}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 900, color: "var(--foreground)" }}>{t.points.toLocaleString("es-US")} pts</span>
                    </div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "var(--foreground)" }}>{t.title}</p>
                    {t.description && <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted-foreground)" }}>{t.description}</p>}
                    <div style={{ height: 6, borderRadius: 999, background: "var(--muted)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "#E42D2C" }} />
                    </div>
                    <div style={{ marginTop: "auto" }}>
                      {c?.status === "approved" ? (
                        <p style={statusRow("var(--success)")}><CheckCircle2 size={16} /> Premio entregado{c.note ? ` · ${c.note}` : ""}</p>
                      ) : c?.status === "pending" ? (
                        <p style={statusRow("#b88a00")}><Clock size={16} /> Solicitado: el equipo te va a contactar</p>
                      ) : c?.status === "rejected" ? (
                        <p style={statusRow("var(--muted-foreground)")}><XCircle size={16} /> No aprobado{c.note ? ` · ${c.note}` : ""}</p>
                      ) : reached ? (
                        <button type="button" disabled={busy === t.id} onClick={() => claim(t.id)} style={{
                          width: "100%", height: 40, borderRadius: 10, border: 0, background: "#E42D2C", color: "#fff",
                          fontSize: 14.5, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}>
                          {busy === t.id ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />} Pedir mi premio
                        </button>
                      ) : (
                        <p style={statusRow("var(--muted-foreground)")}>Te faltan {(t.points - data.points).toLocaleString("es-US")} pts</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function statusRow(color: string): React.CSSProperties {
  return { margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color };
}
