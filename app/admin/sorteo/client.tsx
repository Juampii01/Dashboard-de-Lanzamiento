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

const WEIGHTED_RANKS = new Set(["elevate", "prime"]);
const GATED_RANKS = new Set(["legacy", "expert"]);
const CONFETTI_COLORS = ["#E42D2C", "#FFD700", "#16A65F", "#ffffff", "#152978"];

export function SorteoClient() {
  const [loading, setLoading] = useState(true);
  const [pools, setPools] = useState<Record<string, EligibleUser[]>>({});
  const [winners, setWinners] = useState<Record<string, Winner[]>>({});
  const [excluded, setExcluded] = useState<Record<string, Set<string>>>({});
  const [drawingRank, setDrawingRank] = useState<string | null>(null);
  const [cyclingName, setCyclingName] = useState<string>("");
  const [confettiRank, setConfettiRank] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sorteo");
      const json = await res.json();
      if (res.status === 501) {
        toast.error("Falta correr la migración de sorteo (sorteo_winners o sorteo_confirmed_payers).");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "error");
      setPools(json.pools ?? {});
      setWinners(json.winners ?? {});
    } catch {
      toast.error("No se pudo cargar el sorteo.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function toggleExclude(rankKey: string, userId: string) {
    setExcluded((prev) => {
      const set = new Set(prev[rankKey] ?? []);
      if (set.has(userId)) set.delete(userId); else set.add(userId);
      return { ...prev, [rankKey]: set };
    });
  }

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
    const pool = pools[rankKey] ?? [];
    const exSet = excluded[rankKey] ?? new Set<string>();
    const rankWinners = winners[rankKey] ?? [];
    const target = TARGET_COUNT[rankKey] ?? 1;
    const claimedCount = rankWinners.filter((w) => w.status === "claimed").length;
    const pendingCount = rankWinners.filter((w) => w.status === "pending_claim").length;
    const remaining = target - claimedCount;

    const allowed = pool.filter((u) => !exSet.has(u.id));
    const allowedIds = allowed.map((u) => u.id);

    if (allowedIds.length < remaining) {
      toast.error(`Necesitás al menos ${remaining} candidatos seleccionados (hay ${allowedIds.length}).`);
      return;
    }
    const confirmMsg = pendingCount > 0
      ? `Hay ${pendingCount} sin reclamar — quedan eliminados y se sortean ${remaining} reemplazo${remaining > 1 ? "s" : ""}. ¿Confirmás?`
      : `¿Sortear ${remaining} ganador${remaining > 1 ? "es" : ""} de "${RANKS.find((r) => r.key === rankKey)?.name}" entre ${allowedIds.length} candidatos?`;
    if (!confirm(confirmMsg)) return;

    setDrawingRank(rankKey);
    setConfettiRank(null);

    // Animación "slot machine": cicla nombres al azar mientras esperamos la respuesta real.
    intervalRef.current = setInterval(() => {
      const candidate = allowed[Math.floor(Math.random() * allowed.length)];
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
      await load(); // recarga winners + pool (los eliminados salen de la vista, el pool se actualiza)
      setConfettiRank(rankKey);
      toast.success(`¡Sorteados ${json.winners.length} ganador${json.winners.length > 1 ? "es" : ""}!`);
      setTimeout(() => setConfettiRank((cur) => (cur === rankKey ? null : cur)), 1700);
    } catch (e) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const msg = (e as Error).message;
      if (msg === "already_complete") toast.error("Este rango ya tiene todos los lugares reclamados.");
      else toast.error("Error al sortear: " + msg);
    }
    setDrawingRank(null);
  }

  async function resetRank(rankKey: string) {
    if (!confirm(`¿Reiniciar TODO "${RANKS.find((r) => r.key === rankKey)?.name}" (incluso los ya reclamados) para sortear de cero?`)) return;
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

      {/* ── Rangos ── */}
      {RANKS.map((rank) => {
        const pool = pools[rank.key] ?? [];
        const rankWinners = winners[rank.key] ?? [];
        const target = TARGET_COUNT[rank.key] ?? 1;
        const exSet = excluded[rank.key] ?? new Set<string>();
        const selectedCount = pool.filter((u) => !exSet.has(u.id)).length;
        const isDrawing = drawingRank === rank.key;
        const showConfetti = confettiRank === rank.key;
        const claimedCount = rankWinners.filter((w) => w.status === "claimed").length;
        const pendingCount = rankWinners.filter((w) => w.status === "pending_claim").length;
        const remaining = target - claimedCount;
        const isComplete = remaining <= 0;

        return (
          <div
            key={rank.key}
            className={isDrawing ? "sorteo-drawing" : undefined}
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
                {rank.key === "expert" && (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "3px 0 0" }}>
                    Se excluyen quienes ya pagaron esta mentoría por fuera del challenge (no tendría sentido que la ganen de nuevo).
                  </p>
                )}
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
                {GATED_RANKS.has(rank.key) && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "4px 10px", borderRadius: 999,
                    background: "rgba(228,45,44,0.16)", color: "#ff6b6a", border: "1px solid rgba(228,45,44,0.4)",
                  }}>
                    Igual chance
                  </span>
                )}
                {WEIGHTED_RANKS.has(rank.key) && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "4px 10px", borderRadius: 999,
                    background: "rgba(255,215,0,0.16)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.4)",
                  }}>
                    Ponderado por puntos
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
                            title={claimed ? "Reclamado — click para deshacer" : "Marcar como reclamado"}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                              background: claimed ? rank.color : "rgba(255,255,255,0.08)",
                              border: claimed ? "none" : "1px solid rgba(255,255,255,0.25)",
                              cursor: togglingId === w.winnerId ? "default" : "pointer",
                            }}
                          >
                            {togglingId === w.winnerId
                              ? <Loader2 style={{ width: 15, height: 15, color: "#fff" }} className="animate-spin" />
                              : <Check style={{ width: 16, height: 16, color: claimed ? "#0d1a3d" : "rgba(255,255,255,0.35)" }} />}
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
                    <div style={{
                      maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3,
                      padding: 6, borderRadius: 10, background: "rgba(0,0,0,0.22)",
                    }}>
                      {pool.map((u) => (
                        <label
                          key={u.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7,
                            fontSize: 12.5, cursor: "pointer", color: "rgba(255,255,255,0.85)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!exSet.has(u.id)}
                            onChange={() => toggleExclude(rank.key, u.id)}
                          />
                          <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{u.full_name || "—"}</span>
                          <span style={{ color: "rgba(255,255,255,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
                          <span style={{ color: rank.color, marginLeft: "auto", flexShrink: 0, fontWeight: 700 }}>{u.total_points.toLocaleString()} pts</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={() => draw(rank.key)}
                      disabled={selectedCount < remaining}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                        alignSelf: "flex-start", padding: "12px 24px", borderRadius: 12,
                        background: selectedCount < remaining ? "rgba(255,255,255,0.08)" : rank.color,
                        color: selectedCount < remaining ? "rgba(255,255,255,0.4)" : "#0d1a3d",
                        fontWeight: 800, fontSize: 14.5, border: "none",
                        cursor: selectedCount < remaining ? "not-allowed" : "pointer",
                        boxShadow: selectedCount < remaining ? undefined : `0 6px 20px -4px color-mix(in srgb, ${rank.color} 60%, transparent)`,
                      }}
                    >
                      🎲 {pendingCount > 0 ? `Rehacer sorteo — faltan ${remaining}` : `Sortear ${remaining} de ${selectedCount} seleccionados`}
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
    </div>
  );
}
