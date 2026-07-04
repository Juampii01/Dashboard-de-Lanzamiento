"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RANKS } from "@/lib/ranks";
import { Loader2, Trophy, Sparkles, Check } from "lucide-react";

interface EligibleUser {
  id: string;
  full_name: string | null;
  email: string;
  total_points: number;
}

interface Winner {
  id: string; // user id
  winnerId: string; // sorteo_winners row id
  full_name: string | null;
  email: string;
  drawn_at: string;
  status: "pending_claim" | "claimed" | "eliminated";
  claimed_at: string | null;
}

const TARGET_COUNT: Record<string, number> = {
  elevate: 10,
  prime: 1,
  legacy: 1,
  expert: 1,
};

const CONFETTI_COLORS = ["#E42D2C", "#FFD700", "#16A65F", "#ffffff", "#152978"];

export function SorteoClient() {
  const [loading, setLoading] = useState(true);
  const [pools, setPools] = useState<Record<string, EligibleUser[]>>({});
  const [displayCounts, setDisplayCounts] = useState<Record<string, number>>({});
  const [winners, setWinners] = useState<Record<string, Winner[]>>({});
  const [drawingRank, setDrawingRank] = useState<string | null>(null);
  const [cyclingName, setCyclingName] = useState<string>("");
  const [confettiRank, setConfettiRank] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ message: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);
  // Revelado uno por uno (en vivo): tras sortear, en vez de mostrar toda la
  // grilla de golpe, se va mostrando un ganador a la vez con "Siguiente →".
  const [revealRank, setRevealRank] = useState<string | null>(null);
  const [revealQueue, setRevealQueue] = useState<Winner[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  // Modo "presentes": si se completa, Elevate y Prime dejan de sortear por
  // rango de puntos y sortean entre TODA esta lista (pegada por email),
  // sin importar el rango real de cada uno — para cuando solo importa
  // quién está en la llamada, no cuántos puntos tiene.
  const [presentEmailsText, setPresentEmailsText] = useState("");
  const [presentModeOn, setPresentModeOn] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sorteo rápido por nombres — no depende de la base de datos ni de
  // cuentas reales. Solo toma la lista de texto pegada, sortea al azar y
  // revela uno por uno con la misma animación. No se guarda en ningún lado.
  const [quickNamesText, setQuickNamesText] = useState("");
  const [quickCount, setQuickCount] = useState(9);
  const [quickDrawing, setQuickDrawing] = useState(false);
  const [quickCycling, setQuickCycling] = useState("");
  const [quickRevealQueue, setQuickRevealQueue] = useState<string[]>([]);
  const [quickRevealIndex, setQuickRevealIndex] = useState(0);
  const [quickConfetti, setQuickConfetti] = useState(false);
  const [quickResults, setQuickResults] = useState<string[]>([]);
  const quickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function quickDraw() {
    const names = quickNamesText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) {
      toast.error("Pegá al menos un nombre.");
      return;
    }
    if (names.length < quickCount) {
      toast.error(`Hacen falta ${quickCount} y solo hay ${names.length} nombres.`);
      return;
    }
    const ok = await askConfirm(`¿Sortear ${quickCount} ganador${quickCount > 1 ? "es" : ""} entre los nombres pegados?`);
    if (!ok) return;

    setQuickDrawing(true);
    setQuickConfetti(false);
    quickIntervalRef.current = setInterval(() => {
      setQuickCycling(names[Math.floor(Math.random() * names.length)] || "…");
    }, 90);

    await new Promise((r) => setTimeout(r, 1400));
    if (quickIntervalRef.current) clearInterval(quickIntervalRef.current);

    const shuffled = [...names];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const winners = shuffled.slice(0, quickCount);
    setQuickDrawing(false);
    setQuickRevealQueue(winners);
    setQuickRevealIndex(0);
  }

  function finishQuickReveal() {
    setQuickResults((prev) => [...prev, ...quickRevealQueue]);
    setQuickRevealQueue([]);
    setQuickRevealIndex(0);
    setQuickConfetti(true);
    setTimeout(() => setQuickConfetti(false), 1700);
  }

  const presentEmails = new Set(
    presentEmailsText.split(/[\n,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
  );

  function effectivePool(rankKey: string): EligibleUser[] {
    if (presentModeOn && presentEmails.size > 0 && (rankKey === "elevate" || rankKey === "prime")) {
      const all = Object.values(pools).flat();
      const seen = new Set<string>();
      const union: EligibleUser[] = [];
      for (const u of all) {
        if (presentEmails.has(u.email.toLowerCase()) && !seen.has(u.id)) {
          seen.add(u.id);
          union.push(u);
        }
      }
      return union;
    }
    return pools[rankKey] ?? [];
  }

  function askConfirm(message: string, opts?: { danger?: boolean }): Promise<boolean> {
    return new Promise((resolve) => {
      setConfirmState({ message, danger: opts?.danger, resolve });
    });
  }

  async function load(): Promise<{ pools?: Record<string, EligibleUser[]>; winners?: Record<string, Winner[]>; displayCounts?: Record<string, number> } | null> {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sorteo");
      const json = await res.json();
      if (res.status === 501) {
        toast.error("Falta correr la migración de sorteo (sorteo_winners o sorteo_confirmed_payers).");
        return null;
      }
      if (!res.ok) throw new Error(json.error ?? "error");
      setPools(json.pools ?? {});
      setWinners(json.winners ?? {});
      setDisplayCounts(json.displayCounts ?? {});
      return json;
    } catch {
      toast.error("No se pudo cargar el sorteo.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function finishReveal(rankKey: string) {
    setRevealRank(null);
    setRevealQueue([]);
    setRevealIndex(0);
    setConfettiRank(rankKey);
    setTimeout(() => setConfettiRank((cur) => (cur === rankKey ? null : cur)), 1700);
  }

  useEffect(() => {
    load();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function toggleClaim(rankKey: string, winnerId: string, claimed: boolean) {
    setTogglingId(winnerId);
    try {
      const res = await fetch("/api/admin/sorteo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, claimed }),
      });
      if (!res.ok) throw new Error();
      setWinners((prev) => ({
        ...prev,
        [rankKey]: (prev[rankKey] ?? []).map((w) =>
          w.winnerId === winnerId
            ? { ...w, status: claimed ? "claimed" : "pending_claim", claimed_at: claimed ? new Date().toISOString() : null }
            : w
        ),
      }));
    } catch {
      toast.error("No se pudo actualizar.");
    }
    setTogglingId(null);
  }

  async function draw(rankKey: string) {
    const pool = effectivePool(rankKey);
    const rankWinners = winners[rankKey] ?? [];
    const target = TARGET_COUNT[rankKey] ?? 1;
    const claimedCount = rankWinners.filter((w) => w.status === "claimed").length;
    const pendingCount = rankWinners.filter((w) => w.status === "pending_claim").length;
    const remaining = target - claimedCount;

    // Todo el pool elegible entra automáticamente — no se elige a mano ni se
    // muestran nombres en pantalla (esto se proyecta en vivo).
    const allowedIds = pool.map((u) => u.id);
    const usingPresentMode = presentModeOn && presentEmails.size > 0 && (rankKey === "elevate" || rankKey === "prime");
    // Para todo lo que se vea en pantalla (modal, toasts) usamos SIEMPRE
    // displayCount — el mismo número que la página pública de ranking — para
    // no filtrar por dentro que el pool real (allowedIds) es más chico.
    // Excepción: en modo presentes el número YA es intencional (lista de
    // Zoom), no hay nada que ocultar ahí.
    const displayCount = usingPresentMode ? pool.length : (displayCounts[rankKey] ?? pool.length);

    if (allowedIds.length < remaining) {
      toast.error(
        usingPresentMode
          ? `Faltan candidatos: hacen falta ${remaining} y no alcanza con la lista de presentes.`
          : `Faltan candidatos: hacen falta ${remaining} y hay ${displayCount} elegibles.`
      );
      return;
    }
    const confirmMsg = pendingCount > 0
      ? `Hay ${pendingCount} sin reclamar — quedan eliminados y se sortean ${remaining} reemplazo${remaining > 1 ? "s" : ""}. ¿Confirmás?`
      : usingPresentMode
        ? `¿Sortear ${remaining} ganador${remaining > 1 ? "es" : ""} de "${RANKS.find((r) => r.key === rankKey)?.name}" entre los presentes en la llamada?`
        : `¿Sortear ${remaining} ganador${remaining > 1 ? "es" : ""} de "${RANKS.find((r) => r.key === rankKey)?.name}" entre ${displayCount} elegibles?`;
    if (!(await askConfirm(confirmMsg))) return;

    setDrawingRank(rankKey);
    setConfettiRank(null);

    // Animación "slot machine": cicla nombres al azar mientras esperamos la respuesta real.
    intervalRef.current = setInterval(() => {
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      setCyclingName(candidate?.full_name || candidate?.email || "…");
    }, 90);

    const started = Date.now();
    try {
      const res = await fetch("/api/admin/sorteo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankKey, allowedIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "error");

      const elapsed = Date.now() - started;
      if (elapsed < 1400) await new Promise((r) => setTimeout(r, 1400 - elapsed));

      if (intervalRef.current) clearInterval(intervalRef.current);
      const fresh = await load(); // recarga winners + pool (los eliminados salen de la vista, el pool se actualiza)
      toast.success(`¡Sorteados ${json.winners.length} ganador${json.winners.length > 1 ? "es" : ""}!`);

      const newIds = new Set((json.winners as Array<{ id: string }>).map((w) => w.id));
      const freshWinners = (fresh?.winners?.[rankKey] ?? []).filter((w) => newIds.has(w.id));
      if (freshWinners.length > 0) {
        // Revelado dramático (flip + chispas + trofeo pulsando) para cada
        // ganador — 1 sola pantalla si es 1 ganador, "Siguiente →" si son varios.
        setRevealRank(rankKey);
        setRevealQueue(freshWinners);
        setRevealIndex(0);
      } else {
        setConfettiRank(rankKey);
        setTimeout(() => setConfettiRank((cur) => (cur === rankKey ? null : cur)), 1700);
      }
    } catch (e) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const msg = (e as Error).message;
      if (msg === "already_complete") toast.error("Este rango ya tiene todos los lugares reclamados.");
      else toast.error("Error al sortear: " + msg);
    }
    setDrawingRank(null);
  }

  async function resetRank(rankKey: string) {
    const ok = await askConfirm(
      `¿Reiniciar TODO "${RANKS.find((r) => r.key === rankKey)?.name}" (incluso los ya reclamados) para sortear de cero?`,
      { danger: true }
    );
    if (!ok) return;
    setResetting(rankKey);
    try {
      const res = await fetch("/api/admin/sorteo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankKey }),
      });
      if (!res.ok) throw new Error();
      await load();
      toast.success("Reiniciado. Ya podés volver a sortear.");
    } catch {
      toast.error("Error al reiniciar.");
    }
    setResetting(null);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", color: "rgba(255,255,255,0.6)" }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ marginRight: 10 }} />
        Cargando elegibles…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── Hero ── */}
      <div
        style={{
          position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", gap: 14, padding: "clamp(28px, 5vw, 48px) 24px",
          borderRadius: 20,
          background: "radial-gradient(700px circle at 50% 0%, rgba(255,215,0,0.14), transparent 60%), linear-gradient(160deg, #0d1a3d 0%, #080f24 100%)",
          border: "1px solid rgba(255,215,0,0.28)",
        }}
      >
        <div style={{ background: "#fff", borderRadius: 16, padding: "10px 16px", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/halcon.png" alt="GovBidder Challenge" style={{ height: 48, width: "auto", display: "block" }} />
        </div>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800,
          letterSpacing: "0.16em", textTransform: "uppercase", color: "#FFD700",
        }}>
          GovBidder Challenge
        </p>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 800,
          color: "#fff", lineHeight: 1.1, margin: 0, display: "flex", alignItems: "center", gap: 12,
        }}>
          <Trophy style={{ width: "1em", height: "1em", color: "#FFD700" }} /> Sorteo de Premios
        </h1>
        <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.75)", maxWidth: "66ch", margin: 0, lineHeight: 1.6 }}>
          Elegibles: pago 100% confirmado (Hotmart + SEM + Stripe) y haber ingresado al menos una vez al dashboard.{" "}
          <strong style={{ color: "#fff" }}>Marcá quién reclamó su premio en vivo</strong> — si sortear de nuevo, los que
          no reclamaron quedan eliminados y se sortean reemplazos solo para los lugares que faltan.
        </p>
      </div>

      {/* ── Sorteo rápido por nombres (sin base de datos) ── */}
      <div
        className={quickDrawing ? "sorteo-drawing" : undefined}
        style={{
          position: "relative", overflow: "hidden",
          borderRadius: 18, padding: "22px 24px",
          background: "linear-gradient(160deg, color-mix(in srgb, #FFD700 10%, #0d1a3d) 0%, #080f24 100%)",
          border: "1px solid color-mix(in srgb, #FFD700 45%, transparent)",
          // @ts-expect-error CSS custom property
          "--sorteo-glow": "#FFD70099",
        }}
      >
        {quickConfetti && (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                className="sorteo-confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                  animationDelay: `${Math.random() * 0.4}s`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>
        )}

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
          🎲 Sorteo rápido por nombres
        </h2>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", margin: "0 0 14px" }}>
          Independiente de la base de datos — pegá cualquier lista de nombres, sortea entre ellos y no se guarda en ningún lado.
        </p>

        {quickDrawing ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "36px 16px", textAlign: "center" }}>
            <Sparkles style={{ width: 26, height: 26, color: "#FFD700" }} className="spin-slow" />
            <p key={quickCycling} className="sorteo-name-cycling" style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>
              {quickCycling || "…"}
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0, letterSpacing: "0.04em", textTransform: "uppercase" }}>Sorteando…</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              value={quickNamesText}
              onChange={(e) => setQuickNamesText(e.target.value)}
              placeholder={"Un nombre por línea…"}
              rows={6}
              style={{
                width: "100%", borderRadius: 10, padding: "10px 12px", fontSize: 13,
                background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", resize: "vertical",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <label style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 6 }}>
                Ganadores:
                <input
                  type="number"
                  min={1}
                  value={quickCount}
                  onChange={(e) => setQuickCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{
                    width: 60, borderRadius: 8, padding: "6px 8px", fontSize: 13,
                    background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
                  }}
                />
              </label>
              <button
                onClick={quickDraw}
                style={{
                  padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 800, border: "none",
                  background: "#FFD700", color: "#0d1a3d", cursor: "pointer",
                }}
              >
                🎲 Sortear
              </button>
              {quickResults.length > 0 && (
                <button
                  onClick={() => setQuickResults([])}
                  style={{ padding: "8px 14px", borderRadius: 8, fontSize: 11.5, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
                >
                  Limpiar resultados
                </button>
              )}
            </div>

            {quickResults.length > 0 && (
              <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", marginTop: 4 }}>
                {quickResults.map((name, i) => (
                  <div
                    key={i}
                    className="sorteo-winner-pop"
                    style={{
                      animationDelay: `${i * 40}ms`,
                      display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10,
                      background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
                    }}
                  >
                    <Trophy style={{ width: 16, height: 16, color: "#FFD700", flexShrink: 0 }} />
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ventana emergente del revelado del sorteo rápido */}
      {quickRevealQueue.length > 0 && (() => {
        const current = quickRevealQueue[quickRevealIndex];
        const isLast = quickRevealIndex + 1 >= quickRevealQueue.length;
        return (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 99996,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(4,8,20,0.82)", backdropFilter: "blur(4px)", padding: 20,
            }}
          >
            <div
              style={{
                position: "relative", overflow: "visible",
                width: "100%", maxWidth: 440, borderRadius: 20, padding: "34px 28px 28px",
                background: "radial-gradient(500px circle at 50% 0%, rgba(255,215,0,0.18), transparent 60%), linear-gradient(160deg, color-mix(in srgb, #FFD700 12%, #0d1a3d) 0%, #080f24 100%)",
                border: "1px solid rgba(255,215,0,0.5)",
                boxShadow: "0 24px 70px -14px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,215,0,0.3)",
              }}
            >
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
                letterSpacing: "0.14em", textTransform: "uppercase", color: "#FFD700", margin: "0 0 4px", textAlign: "center",
              }}>
                🎲 Sorteo rápido
              </p>
              <div
                key={`${current}-${quickRevealIndex}`}
                className="sorteo-reveal-in"
                style={{
                  position: "relative", overflow: "visible",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "18px 4px 6px", textAlign: "center",
                }}
              >
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span
                      key={i}
                      className="sorteo-sparkle-piece"
                      style={{
                        left: `${50 + (Math.random() - 0.5) * 80}%`,
                        top: `${35 + (Math.random() - 0.5) * 40}%`,
                        fontSize: 10 + Math.random() * 9,
                        color: "#FFD700",
                        animationDelay: `${0.1 + Math.random() * 0.3}s`,
                      }}
                    >
                      ✦
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                  Ganador {quickRevealIndex + 1} de {quickRevealQueue.length}
                </p>
                <Trophy className="sorteo-trophy-pulse" style={{ width: 38, height: 38, color: "#FFD700", margin: "8px 0" }} />
                <p style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 800, color: "#fff", margin: 0 }}>
                  {current}
                </p>

                <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
                  <button
                    onClick={() => (isLast ? finishQuickReveal() : setQuickRevealIndex((i) => i + 1))}
                    style={{
                      padding: "11px 20px", borderRadius: 10, fontSize: 14, fontWeight: 800, border: "none",
                      background: isLast ? "#3ddc84" : "#FFD700", color: "#0d1a3d", cursor: "pointer",
                    }}
                  >
                    {isLast ? "Finalizar ✓" : "Siguiente →"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modo presentes (opcional) ── */}
      <div
        style={{
          borderRadius: 14, padding: "16px 18px",
          background: presentModeOn ? "rgba(255,215,0,0.06)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${presentModeOn ? "rgba(255,215,0,0.35)" : "rgba(255,255,255,0.1)"}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: presentModeOn ? 10 : 0 }}>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", margin: 0 }}>🎥 Modo presentes (Elevate + Prime)</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: "2px 0 0" }}>
              Pegá los emails de quienes están en la llamada. Si lo activás, Elevate y Prime sortean entre TODOS ellos
              sin importar su rango real de puntos.
            </p>
          </div>
          <button
            onClick={() => setPresentModeOn((v) => !v)}
            style={{
              padding: "8px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, border: "none", cursor: "pointer", flexShrink: 0,
              background: presentModeOn ? "#FFD700" : "rgba(255,255,255,0.1)",
              color: presentModeOn ? "#0d1a3d" : "rgba(255,255,255,0.7)",
            }}
          >
            {presentModeOn ? "✓ Activado" : "Activar"}
          </button>
        </div>
        {presentModeOn && (
          <>
            <textarea
              value={presentEmailsText}
              onChange={(e) => setPresentEmailsText(e.target.value)}
              placeholder="un-email@ejemplo.com&#10;otro-email@ejemplo.com&#10;..."
              rows={4}
              style={{
                width: "100%", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "monospace",
                background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", resize: "vertical",
              }}
            />
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", margin: "6px 0 0" }}>
              {presentEmails.size > 0 ? "Lista cargada." : ""}
            </p>
          </>
        )}
      </div>

      {/* ── Rangos ── */}
      {RANKS.map((rank) => {
        const pool = effectivePool(rank.key);
        const usingPresentMode = presentModeOn && presentEmails.size > 0 && (rank.key === "elevate" || rank.key === "prime");
        const displayCount = usingPresentMode ? pool.length : (displayCounts[rank.key] ?? pool.length);
        const rankWinners = winners[rank.key] ?? [];
        const target = TARGET_COUNT[rank.key] ?? 1;
        const isDrawing = drawingRank === rank.key;
        const isRevealing = revealRank === rank.key;
        const showConfetti = confettiRank === rank.key;
        const claimedCount = rankWinners.filter((w) => w.status === "claimed").length;
        const pendingCount = rankWinners.filter((w) => w.status === "pending_claim").length;
        const remaining = target - claimedCount;
        const isComplete = remaining <= 0;

        return (
          <div
            key={rank.key}
            className={isDrawing || isRevealing ? "sorteo-drawing" : undefined}
            style={{
              // @ts-expect-error CSS custom property
              "--sorteo-glow": `${rank.color}99`,
              position: "relative", overflow: "hidden",
              borderRadius: 18, padding: "22px 24px",
              background: `linear-gradient(160deg, color-mix(in srgb, ${rank.color} 10%, #0d1a3d) 0%, #080f24 100%)`,
              border: `1px solid color-mix(in srgb, ${rank.color} 45%, transparent)`,
              boxShadow: isComplete ? `0 0 0 1px color-mix(in srgb, ${rank.color} 40%, transparent), 0 8px 32px -8px color-mix(in srgb, ${rank.color} 35%, transparent)` : undefined,
            }}
          >
            {showConfetti && (
              <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
                {Array.from({ length: 28 }).map((_, i) => (
                  <span
                    key={i}
                    className="sorteo-confetti-piece"
                    style={{
                      left: `${Math.random() * 100}%`,
                      background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                      animationDelay: `${Math.random() * 0.4}s`,
                      transform: `rotate(${Math.random() * 360}deg)`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Header del rango */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontSize: 34, lineHeight: 1 }}>{rank.emoji}</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>
                  {rank.name}
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: "2px 0 0" }}>
                  {claimedCount}/{target} reclamado{target > 1 ? "s" : ""} · premio: <strong style={{ color: rank.color }}>{rank.prize}</strong>
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {isComplete && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "4px 10px", borderRadius: 999,
                    background: "rgba(22,166,95,0.18)", color: "#3ddc84", border: "1px solid rgba(22,166,95,0.4)",
                  }}>
                    ✓ Completo
                  </span>
                )}
              </div>
            </div>

            {/* Contenido */}
            {isDrawing ? (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 10, padding: "36px 16px", textAlign: "center",
              }}>
                <Sparkles style={{ width: 26, height: 26, color: rank.color }} className="spin-slow" />
                <p key={cyclingName} className="sorteo-name-cycling" style={{
                  fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#fff", margin: 0,
                }}>
                  {cyclingName || "…"}
                </p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Sorteando…
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {rankWinners.length > 0 && (
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: rankWinners.length > 3 ? "repeat(auto-fill, minmax(220px, 1fr))" : "1fr" }}>
                    {rankWinners.map((w, i) => {
                      const claimed = w.status === "claimed";
                      return (
                        <div
                          key={w.winnerId}
                          className="sorteo-winner-pop"
                          style={{
                            animationDelay: `${i * 60}ms`,
                            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12,
                            background: claimed
                              ? `linear-gradient(135deg, color-mix(in srgb, ${rank.color} 22%, transparent) 0%, color-mix(in srgb, ${rank.color} 8%, transparent) 100%)`
                              : "rgba(255,255,255,0.04)",
                            border: claimed
                              ? `1px solid color-mix(in srgb, ${rank.color} 55%, transparent)`
                              : "1px dashed rgba(255,255,255,0.25)",
                          }}
                        >
                          <Trophy style={{ width: 20, height: 20, color: claimed ? rank.color : "rgba(255,255,255,0.35)", flexShrink: 0 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {w.full_name || w.email}
                            </p>
                            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {w.email}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleClaim(rank.key, w.winnerId, !claimed)}
                            disabled={togglingId === w.winnerId}
                            title={claimed ? "Está presente — click para deshacer" : "Marcar presente"}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                              padding: "7px 12px", borderRadius: 8, flexShrink: 0,
                              fontSize: 12, fontWeight: 700,
                              background: claimed ? rank.color : "rgba(255,255,255,0.08)",
                              color: claimed ? "#0d1a3d" : "rgba(255,255,255,0.55)",
                              border: claimed ? "none" : "1px solid rgba(255,255,255,0.25)",
                              cursor: togglingId === w.winnerId ? "default" : "pointer",
                            }}
                          >
                            {togglingId === w.winnerId
                              ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                              : <Check style={{ width: 14, height: 14 }} />}
                            {claimed ? "Está" : "No está"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isComplete && pool.length === 0 && rankWinners.length === 0 && (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", padding: "8px 0 4px" }}>
                    No hay elegibles en este rango todavía.
                  </p>
                )}

                {!isComplete && pool.length > 0 && (
                  <>
                    <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                      {usingPresentMode
                        ? `Sorteando entre los presentes en la llamada (cualquier rango).`
                        : `Sorteando entre ${displayCount} participante${displayCount === 1 ? "" : "s"} de este rango.`}
                    </p>
                    <button
                      onClick={() => draw(rank.key)}
                      disabled={pool.length < remaining}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                        alignSelf: "flex-start", padding: "12px 24px", borderRadius: 12,
                        background: pool.length < remaining ? "rgba(255,255,255,0.08)" : rank.color,
                        color: pool.length < remaining ? "rgba(255,255,255,0.4)" : "#0d1a3d",
                        fontWeight: 800, fontSize: 14.5, border: "none",
                        cursor: pool.length < remaining ? "not-allowed" : "pointer",
                        boxShadow: pool.length < remaining ? undefined : `0 6px 20px -4px color-mix(in srgb, ${rank.color} 60%, transparent)`,
                      }}
                    >
                      🎲 {pendingCount > 0 ? `Rehacer sorteo — faltan ${remaining}` : `Sortear ${remaining}`}
                    </button>
                  </>
                )}

                {rankWinners.length > 0 && (
                  <button
                    onClick={() => resetRank(rank.key)}
                    disabled={resetting === rank.key}
                    style={{
                      alignSelf: "flex-start", marginTop: 4, padding: "7px 14px", borderRadius: 8,
                      background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)",
                      fontSize: 11.5, fontWeight: 600, cursor: resetting === rank.key ? "default" : "pointer",
                    }}
                  >
                    {resetting === rank.key ? "..." : "↺ Reiniciar todo este rango"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Ventana emergente de revelado — aparece PRIMERO acá, sobre toda la
          pantalla (ideal para proyectar en vivo); al marcar presente/avanzar
          también se actualiza la tarjeta del rango de fondo, así que al
          cerrarla ya queda reflejado en la sección original. */}
      {revealRank && (() => {
        const rank = RANKS.find((r) => r.key === revealRank);
        const current = revealQueue[revealIndex];
        const live = current ? (winners[revealRank] ?? []).find((w) => w.winnerId === current.winnerId) ?? current : null;
        if (!rank || !live) return null;
        const isLast = revealIndex + 1 >= revealQueue.length;
        const claimed = live.status === "claimed";
        return (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 99996,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(4,8,20,0.82)", backdropFilter: "blur(4px)", padding: 20,
            }}
          >
            <div
              style={{
                position: "relative", overflow: "visible",
                width: "100%", maxWidth: 440, borderRadius: 20, padding: "34px 28px 28px",
                background: `radial-gradient(500px circle at 50% 0%, color-mix(in srgb, ${rank.color} 18%, transparent), transparent 60%), linear-gradient(160deg, color-mix(in srgb, ${rank.color} 12%, #0d1a3d) 0%, #080f24 100%)`,
                border: `1px solid color-mix(in srgb, ${rank.color} 50%, transparent)`,
                boxShadow: `0 24px 70px -14px rgba(0,0,0,0.65), 0 0 0 1px color-mix(in srgb, ${rank.color} 30%, transparent)`,
              }}
            >
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
                letterSpacing: "0.14em", textTransform: "uppercase", color: rank.color, margin: "0 0 4px", textAlign: "center",
              }}>
                {rank.emoji} {rank.name}
              </p>

              <div
                key={live.winnerId}
                className="sorteo-reveal-in"
                style={{
                  position: "relative", overflow: "visible",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "18px 4px 6px", textAlign: "center",
                }}
              >
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span
                      key={i}
                      className="sorteo-sparkle-piece"
                      style={{
                        left: `${50 + (Math.random() - 0.5) * 80}%`,
                        top: `${35 + (Math.random() - 0.5) * 40}%`,
                        fontSize: 10 + Math.random() * 9,
                        color: rank.color,
                        animationDelay: `${0.1 + Math.random() * 0.3}s`,
                      }}
                    >
                      ✦
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                  Ganador {revealIndex + 1} de {revealQueue.length}
                </p>
                <Trophy className="sorteo-trophy-pulse" style={{ width: 38, height: 38, color: rank.color, margin: "8px 0" }} />
                <p style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 800, color: "#fff", margin: 0 }}>
                  {live.full_name || live.email}
                </p>
                <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", margin: 0 }}>{live.email}</p>

                <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
                  <button
                    onClick={() => toggleClaim(revealRank, live.winnerId, !claimed)}
                    disabled={togglingId === live.winnerId}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "11px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, border: "none",
                      background: claimed ? rank.color : "rgba(255,255,255,0.08)",
                      color: claimed ? "#0d1a3d" : "rgba(255,255,255,0.8)",
                      boxShadow: claimed ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.2)",
                      cursor: togglingId === live.winnerId ? "default" : "pointer",
                    }}
                  >
                    {togglingId === live.winnerId
                      ? <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
                      : <Check style={{ width: 15, height: 15 }} />}
                    {claimed ? "Está presente" : "Marcar presente"}
                  </button>
                  <button
                    onClick={() => (isLast ? finishReveal(revealRank) : setRevealIndex((i) => i + 1))}
                    style={{
                      padding: "11px 20px", borderRadius: 10, fontSize: 14, fontWeight: 800, border: "none",
                      background: isLast ? "#3ddc84" : "#FFD700", color: "#0d1a3d", cursor: "pointer",
                    }}
                  >
                    {isLast ? "Finalizar ✓" : "Siguiente →"}
                  </button>
                </div>
                <button
                  onClick={() => finishReveal(revealRank)}
                  style={{ marginTop: 10, background: "none", border: "none", fontSize: 11.5, color: "rgba(255,255,255,0.4)", textDecoration: "underline", cursor: "pointer" }}
                >
                  Cerrar y ver todos de una vez
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {confirmState && (
        <div
          onClick={() => { confirmState.resolve(false); setConfirmState(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 99995,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(4,8,20,0.72)", backdropFilter: "blur(3px)", padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="sorteo-winner-pop"
            style={{
              width: "100%", maxWidth: 420, borderRadius: 18, padding: "26px 26px 22px",
              background: "radial-gradient(500px circle at 50% 0%, rgba(255,215,0,0.12), transparent 60%), linear-gradient(160deg, #12224d 0%, #080f24 100%)",
              border: `1px solid ${confirmState.danger ? "rgba(228,45,44,0.4)" : "rgba(255,215,0,0.3)"}`,
              boxShadow: "0 20px 60px -12px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              {confirmState.danger
                ? <span style={{ fontSize: 22 }}>⚠️</span>
                : <Trophy style={{ width: 20, height: 20, color: "#FFD700" }} />}
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: confirmState.danger ? "#ff6b6a" : "#FFD700", margin: 0,
              }}>
                {confirmState.danger ? "Confirmar reinicio" : "Confirmar sorteo"}
              </p>
            </div>
            <p style={{ fontSize: 15, color: "#fff", lineHeight: 1.55, margin: "0 0 22px" }}>
              {confirmState.message}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { confirmState.resolve(false); setConfirmState(null); }}
                style={{
                  padding: "10px 18px", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)",
                  color: "rgba(255,255,255,0.75)", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { confirmState.resolve(true); setConfirmState(null); }}
                style={{
                  padding: "10px 20px", borderRadius: 10, fontSize: 13.5, fontWeight: 800,
                  background: confirmState.danger ? "#E42D2C" : "#FFD700",
                  color: confirmState.danger ? "#fff" : "#0d1a3d",
                  border: "none", cursor: "pointer",
                  boxShadow: confirmState.danger
                    ? "0 6px 20px -4px rgba(228,45,44,0.55)"
                    : "0 6px 20px -4px rgba(255,215,0,0.55)",
                }}
              >
                {confirmState.danger ? "Sí, reiniciar" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
