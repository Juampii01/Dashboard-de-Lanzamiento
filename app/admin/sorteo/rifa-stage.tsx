"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Dices, Loader2, X } from "lucide-react";
import { formatPoints } from "@/lib/points";
import { ordinalWinner } from "@/lib/rifa";

export interface StageWinner { position: number; full_name: string | null; points: number; claimed?: boolean }

/**
 * Pantalla completa de la rifa de un rango, pensada para compartir pantalla:
 * arriba un banner grande con el último ganador (con unos segundos de nombres
 * pasando antes de revelarlo) y abajo, en chico, los ganadores anteriores.
 * Después de cada sorteo el equipo marca si el ganador reclamó el premio en la
 * llamada: "Reclamó" habilita el siguiente sorteo; "No reclamó" lo saca de la
 * rifa y vuelve a sortear ese mismo lugar.
 */
export function RifaStage({
  name, emoji, color, prize, target, winners, candidateNames, onDraw, onClaim, onForfeit, onClose,
}: {
  name: string; emoji: string; color: string; prize: string; target: number;
  winners: StageWinner[];
  candidateNames: string[];
  onDraw: () => Promise<StageWinner | null>;
  onClaim: (position: number) => Promise<boolean>;
  onForfeit: (position: number) => Promise<boolean>;
  onClose: () => void;
}) {
  const [rolling, setRolling] = useState(false);
  const [rollName, setRollName] = useState("");
  const [revealed, setRevealed] = useState<StageWinner | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const [deciding, setDeciding] = useState(false);
  const [forfeited, setForfeited] = useState<StageWinner | null>(null);

  // El último ganador sale de la lista del servidor (trae si reclamó o no).
  const fromServer = (pos?: number) => winners.find((w) => w.position === pos);
  const latest = forfeited ? null : (revealed ? (fromServer(revealed.position) ?? revealed) : (winners.length ? winners[winners.length - 1] : null));
  const pending = winners.find((w) => !w.claimed) ?? null;
  const previous = winners.filter((w) => w.position !== latest?.position);
  const done = winners.length >= target && !pending;
  const next = winners.length + 1;

  async function decide(claimed: boolean) {
    if (!pending || deciding) return;
    setDeciding(true);
    const ok = claimed ? await onClaim(pending.position) : await onForfeit(pending.position);
    setDeciding(false);
    if (!ok) return;
    if (!claimed) { setForfeited(pending); setRevealed(null); }
  }

  async function draw() {
    if (rolling || done || pending) return;
    setRolling(true);
    setRevealed(null);
    setForfeited(null);
    const pool = candidateNames.length ? candidateNames : ["…"];
    timer.current = setInterval(() => {
      setRollName(pool[Math.floor(Math.random() * pool.length)]);
    }, 80);
    // Suspenso mínimo de 3 s, aunque el servidor responda antes.
    const [result] = await Promise.all([onDraw(), new Promise((r) => setTimeout(r, 3000))]);
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRolling(false);
    if (result) setRevealed(result);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto",
        background: `radial-gradient(1000px 600px at 50% -10%, color-mix(in srgb, ${color} 35%, transparent), transparent 60%), linear-gradient(160deg, #0b1437 0%, #070d24 100%)`,
        color: "#fff", padding: "32px 20px 48px", fontFamily: "var(--font-sans)",
      }}
    >
      <button
        onClick={onClose}
        disabled={rolling}
        aria-label="Cerrar"
        style={{
          position: "fixed", top: 18, right: 18, width: 44, height: 44, borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: rolling ? "not-allowed" : "pointer",
        }}
      >
        <X size={22} />
      </button>

      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
          Rifa · Tu Primer Contrato Challenge
        </p>
        <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(34px, 6vw, 56px)", fontWeight: 900, lineHeight: 1.05 }}>
          {emoji} Rango {name}
        </h1>
        {prize && <p style={{ margin: "0 0 28px", fontSize: 18, color: "rgba(255,255,255,0.8)" }}>{prize}</p>}

        {/* Banner grande */}
        <div
          style={{
            borderRadius: 28, padding: "clamp(28px, 5vw, 56px) 24px", minHeight: 260,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, color-mix(in srgb, ${color} 55%, #0b1437), color-mix(in srgb, ${color} 25%, #070d24))`,
            border: `2px solid ${color}`, boxShadow: `0 0 80px color-mix(in srgb, ${color} 45%, transparent)`,
          }}
        >
          {rolling ? (
            <>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>
                {ordinalWinner(next)}…
              </p>
              <p style={{ margin: "14px 0 0", fontSize: "clamp(34px, 7vw, 72px)", fontWeight: 900, lineHeight: 1.05, opacity: 0.85 }}>
                {rollName}
              </p>
            </>
          ) : forfeited ? (
            <>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fca5a5" }}>
                ❌ No reclamó
              </p>
              <p style={{ margin: "14px 0 6px", fontSize: "clamp(30px, 6vw, 56px)", fontWeight: 900, lineHeight: 1.05, textDecoration: "line-through", opacity: 0.7 }}>
                {forfeited.full_name ?? "Participante"}
              </p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Se vuelve a sortear el {ordinalWinner(next).toLowerCase()}</p>
            </>
          ) : latest ? (
            <>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}>
                🎉 {ordinalWinner(latest.position)}
              </p>
              <p style={{ margin: "14px 0 6px", fontSize: "clamp(38px, 8vw, 84px)", fontWeight: 900, lineHeight: 1.02 }}>
                {latest.full_name ?? "Participante"}
              </p>
              <p style={{ margin: 0, fontSize: 18, color: "rgba(255,255,255,0.8)" }}>{formatPoints(latest.points)} pts</p>
              {latest.claimed ? (
                <p style={{ margin: "14px 0 0", fontSize: 20, fontWeight: 900, color: "#86efac" }}>✅ Premio reclamado</p>
              ) : (
                <p style={{ margin: "14px 0 0", fontSize: 18, fontWeight: 800, color: "#fde68a" }}>⏳ Esperando que reclame su premio</p>
              )}
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 64, lineHeight: 1 }}>🎟️</p>
              <p style={{ margin: "16px 0 0", fontSize: "clamp(26px, 5vw, 44px)", fontWeight: 900 }}>
                {target} {target === 1 ? "ganador" : "ganadores"} en este rango
              </p>
            </>
          )}
        </div>

        {/* Botón para el siguiente ganador */}
        <div style={{ margin: "26px 0 32px" }}>
          {pending && !rolling ? (
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => decide(true)}
                disabled={deciding}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10, border: "none", borderRadius: 999,
                  padding: "18px 36px", fontSize: 20, fontWeight: 900, cursor: deciding ? "wait" : "pointer",
                  background: "#16a34a", color: "#fff", boxShadow: "0 10px 30px rgba(22,163,74,0.45)",
                }}
              >
                {deciding ? <Loader2 size={22} className="animate-spin" /> : <Check size={22} />} Reclamó
              </button>
              <button
                onClick={() => decide(false)}
                disabled={deciding}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10, borderRadius: 999,
                  padding: "18px 36px", fontSize: 20, fontWeight: 900, cursor: deciding ? "wait" : "pointer",
                  background: "transparent", color: "#fff", border: "2px solid rgba(255,255,255,0.5)",
                }}
              >
                <X size={22} /> No reclamó
              </button>
            </div>
          ) : done ? (
            <p style={{ fontSize: 18, fontWeight: 800, color: "#86efac", margin: 0 }}>✅ Están todos los ganadores de {name}</p>
          ) : (
            <button
              onClick={draw}
              disabled={rolling}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10, border: "none", borderRadius: 999,
                padding: "18px 40px", fontSize: 20, fontWeight: 900, cursor: rolling ? "wait" : "pointer",
                background: "#E42D2C", color: "#fff", boxShadow: "0 10px 30px rgba(228,45,44,0.45)",
              }}
            >
              {rolling ? <Loader2 size={22} className="animate-spin" /> : <Dices size={22} />}
              {forfeited ? "Volver a sortear" : winners.length ? "Siguiente:" : "Sortear"} {ordinalWinner(next).toLowerCase()}
            </button>
          )}
        </div>

        {/* Banners chicos: ganadores anteriores */}
        {previous.length > 0 && (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", textAlign: "left" }}>
            {previous.map((w) => (
              <div
                key={w.position}
                style={{
                  borderRadius: 16, padding: "14px 18px", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color }}>
                  {ordinalWinner(w.position)}
                </p>
                <p style={{ margin: "4px 0 2px", fontSize: 18, fontWeight: 800 }}>{w.full_name ?? "Participante"}</p>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{formatPoints(w.points)} pts</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
