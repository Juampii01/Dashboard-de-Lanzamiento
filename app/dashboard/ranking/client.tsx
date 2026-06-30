"use client";

import { useEffect, useState, useCallback } from "react";
import { FlagBanner } from "@/components/flag-banner";
import { GiftCard } from "@/components/gift-card";
import { getRank, rankProgress, RANKS } from "@/lib/ranks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FullEntry {
  rank: number;            // posición global (no se usa para mostrar)
  display_name: string;
  total_points: number;
  is_current_user: boolean;
}

interface FullData {
  all: FullEntry[];
  my_global_rank: number | null;
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOP_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

const MAX_PER_RANK = 20;
const RANK_ORDER = ["expert", "legacy", "prime", "elevate"] as const;

// Link de pago de Hotmart para que un usuario gratuito desbloquee los premios.
// Vacío = aún sin configurar (no se muestra el botón "Pagar"). Pegar el link acá.
const HOTMART_PAY_URL = "";

// ─── PositionBadge — número de posición a la izquierda, bien legible ──────────
function PositionBadge({ position }: { position: number }) {
  const medal = TOP_COLORS[position];
  if (medal) {
    return (
      <span style={{
        width: 28, height: 28, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: "50%",
        background: `color-mix(in srgb, ${medal} 20%, transparent)`,
        border: `1.5px solid ${medal}`,
        color: medal, fontFamily: "var(--font-arcade)", fontSize: 12, fontWeight: 800,
        textShadow: `0 0 8px ${medal}90`,
      }}>{position}</span>
    );
  }
  return (
    <span style={{
      width: 28, height: 28, flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800,
      color: "#D6E2F5",
    }}>{position}</span>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────────
function LeaderRow({
  position, name, points, isCurrentUser,
}: { position: number; name: string; points: number; isCurrentUser: boolean }) {
  const medal = TOP_COLORS[position];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px",
      background: isCurrentUser ? "rgba(255,214,10,0.10)" : "transparent",
      borderLeft: isCurrentUser ? "3px solid #FFD60A" : "3px solid transparent",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      minHeight: 42,
    }}>
      <PositionBadge position={position} />
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 12.5,
        color: isCurrentUser ? "#FFD60A" : "#C8D6E8",
        fontWeight: isCurrentUser ? 700 : 500,
        fontFamily: "var(--font-sans)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {name}
        {isCurrentUser && <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.6 }}>(tú)</span>}
      </span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
        color: medal ?? "#9FB4D4", flexShrink: 0,
      }}>
        {points.toLocaleString()}
      </span>
    </div>
  );
}

// ─── MyRankCard ──────────────────────────────────────────────────────────────
// Bloque "Tu rango" — se renderiza DENTRO del FlagBanner (sobre la bandera),
// separado del título por un divisor. Sin caja propia: el banner da el fondo.
function MyRankCard({ points }: { points: number }) {
  const { rank, next, pointsToNext, pct } = rankProgress(points);
  return (
    <div style={{
      marginTop: 18, paddingTop: 16,
      borderTop: "1px solid rgba(255,255,255,0.16)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
            Tu rango
          </p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "27px", fontWeight: 800, color: rank.color, lineHeight: 1.1, textShadow: `0 0 18px color-mix(in srgb, ${rank.color} 50%, transparent)` }}>
            {rank.emoji} {rank.name}
          </p>
          <p style={{ fontSize: "13px", color: "#C8D6E8", marginTop: 2 }}>
            {points.toLocaleString()} pts
          </p>
          <p style={{ fontSize: "12.5px", color: "#C8D6E8", marginTop: 6 }}>
            🎁 Participando por: <strong style={{ color: rank.color }}>{rank.prize}</strong>
          </p>
        </div>
        {next && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)" }}>Próximo rango</p>
            <p style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "14px", color: next.color }}>{next.emoji} {next.name}</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${rank.color}, ${next?.color ?? rank.color})`, transition: "width .5s ease" }} />
        </div>
        <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
          {next
            ? <>Te faltan <strong style={{ color: "#fff" }}>{pointsToNext.toLocaleString()} pts</strong> para subir a <strong style={{ color: next.color }}>{next.name}</strong> y competir por <strong style={{ color: next.color }}>{next.prize}</strong>.</>
            : <>¡Estás en <strong style={{ color: rank.color }}>{rank.name}</strong>, el rango máximo! 🎉 Compites por el premio mayor.</>}
        </p>
      </div>

      {points >= 10000 && (
        <div style={{
          marginTop: 14, padding: "10px 12px", borderRadius: 10,
          background: "rgba(255,215,0,0.10)", border: "1px solid rgba(255,215,0,0.32)",
          display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <span style={{ fontSize: 15, lineHeight: 1.2 }}>⚖️</span>
          <p style={{ fontSize: "12.5px", color: "#FFE9A6", margin: 0, lineHeight: 1.5 }}>
            Pasaste los <strong style={{ color: "#FFD700" }}>10.000 puntos</strong>: a partir de acá <strong style={{ color: "#FFD700" }}>todo lo que sumes cuenta la mitad</strong> — misiones, keywords, referidos, videos, llamadas… <strong style={{ color: "#FFD700" }}>en todos lados</strong>. Y el <strong style={{ color: "#FFD700" }}>tiempo en el dashboard</strong> y las <strong style={{ color: "#FFD700" }}>rachas</strong> ya <strong style={{ color: "#FFD700" }}>no suman</strong>. Es para emparejar la carrera en la cima. 🦅
          </p>
        </div>
      )}
    </div>
  );
}

// ─── RankColumn — una tabla por rango (top 20 + fila propia si está más abajo) ─
function RankColumn({ rankKey, all, loading }: { rankKey: string; all: FullEntry[]; loading: boolean }) {
  const rankDef = RANKS.find((r) => r.key === rankKey);
  if (!rankDef) return null;

  // `all` viene ordenado por puntos desc → el bucket también lo está.
  const bucket = all.filter((e) => getRank(e.total_points).key === rankKey);
  const top = bucket.slice(0, MAX_PER_RANK);
  const meIdx = bucket.findIndex((e) => e.is_current_user);
  const showMeRow = meIdx >= MAX_PER_RANK;          // está en el rango pero fuera del top 20
  const meEntry = showMeRow ? bucket[meIdx] : null;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(20,58,107,0.88) 0%, rgba(10,37,64,0.92) 100%)",
      border: `1px solid color-mix(in srgb, ${rankDef.color} 35%, #1E3A5C)`,
      borderRadius: "12px",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px",
        borderBottom: `1px solid color-mix(in srgb, ${rankDef.color} 22%, transparent)`,
        background: `color-mix(in srgb, ${rankDef.color} 8%, transparent)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{
            fontSize: 26, lineHeight: 1, flexShrink: 0,
            filter: `drop-shadow(0 0 9px color-mix(in srgb, ${rankDef.color} 55%, transparent))`,
          }}>{rankDef.emoji}</span>
          <span style={{
            fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800,
            color: rankDef.color, textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1.05,
            textShadow: `0 0 16px color-mix(in srgb, ${rankDef.color} 45%, transparent)`,
          }}>{rankDef.short}</span>
        </div>
        <p style={{ fontSize: 11, color: "#9FB4D4", margin: "7px 0 0", lineHeight: 1.3, fontWeight: 600 }}>
          {rankDef.min.toLocaleString()}{rankDef.max === Infinity ? "+" : `–${(rankDef.max - 1).toLocaleString()}`} pts
        </p>
        <p style={{ fontSize: 11, color: rankDef.color, margin: "3px 0 0", lineHeight: 1.35, opacity: 0.95 }}>
          🎁 {rankDef.prize}
        </p>
      </div>

      {/* Rows */}
      <div style={{ flex: 1 }}>
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
            <div className="skeleton" style={{ width: 28, height: 12, borderRadius: 4 }} />
            <div className="skeleton" style={{ flex: 1, height: 12, borderRadius: 4 }} />
          </div>
        ))}

        {!loading && top.length === 0 && !showMeRow && (
          <p style={{ textAlign: "center", padding: "20px 12px", fontSize: 12, color: "#8DA2C4" }}>
            Nadie en este rango todavía.
          </p>
        )}

        {!loading && top.map((entry, idx) => (
          <LeaderRow
            key={idx}
            position={idx + 1}
            name={entry.display_name}
            points={entry.total_points}
            isCurrentUser={entry.is_current_user}
          />
        ))}

        {/* Fila propia cuando el usuario está fuera del top 20 de su rango */}
        {!loading && showMeRow && meEntry && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px", background: "rgba(0,0,0,0.22)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#647FA8", letterSpacing: "0.3em" }}>• • •</span>
            </div>
            <LeaderRow
              position={meIdx + 1}
              name={meEntry.display_name}
              points={meEntry.total_points}
              isCurrentUser
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── RankingClient ────────────────────────────────────────────────────────────

// ─── StudentNote (perfil alumno) ─────────────────────────────────────────────
// Reemplaza a "Tu rango" para los alumnos: suman puntos pero no compiten.
function StudentNote({ points }: { points: number }) {
  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.16)" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FFD700" }}>
        🎁 Acceso gratuito
      </p>
      <p style={{ fontSize: "13.5px", color: "rgba(255,255,255,0.85)", marginTop: 6, maxWidth: "54ch", lineHeight: 1.5 }}>
        Sumas puntos y usas todo el dashboard, pero <strong style={{ color: "#fff" }}>no compites por el ranking ni los premios</strong>. Tus puntos: <strong style={{ color: "#fff" }}>{points.toLocaleString("es")}</strong>.
      </p>

      {/* Upsell: pagar el acceso para competir por los premios (con los puntos ya sumados) */}
      {HOTMART_PAY_URL && (
        <div style={{ marginTop: 14, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 12, padding: "13px 15px", maxWidth: "54ch" }}>
          <p style={{ fontSize: "13.5px", color: "#fff", fontWeight: 800, margin: "0 0 4px" }}>
            ¿Quieres competir por los premios?
          </p>
          <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.82)", margin: "0 0 11px", lineHeight: 1.5 }}>
            Ya tienes <strong style={{ color: "#FFD700" }}>{points.toLocaleString("es")} pts</strong> acumulados. Paga el acceso al challenge y empiezas a competir por los premios <strong style={{ color: "#fff" }}>con esos mismos puntos</strong>.
          </p>
          <a
            href={HOTMART_PAY_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "10px 18px", borderRadius: 10, textDecoration: "none",
              fontSize: "14px", fontWeight: 800, color: "#fff",
              background: "linear-gradient(135deg, #E42D2C 0%, #A11D2E 100%)",
              boxShadow: "0 8px 22px -6px rgba(228,45,44,0.6)",
            }}
          >
            💳 Pagar acceso y competir →
          </a>
        </div>
      )}
    </div>
  );
}

// ─── HowToEarnPoints — explica TODAS las formas de sumar puntos ───────────────
// Valores verificados contra el código (constantes de las rutas /api/xp y
// /api/missions; la migración points_x10 multiplicó todo ×10).
const EARN_METHODS: { icon: string; title: string; points: string; variable?: boolean; zero10k?: boolean; detail: string }[] = [
  { icon: "⏱️", title: "Tiempo activo en el dashboard", points: "+25", zero10k: true, detail: "Con el dashboard abierto sumas automáticamente cada 10 minutos de actividad, hasta 20 veces por día (máx. 500 pts/día)." },
  { icon: "👆", title: "Clic en el avatar de la barra de progreso", points: "+30", detail: "Toca el avatar ubicado en la barra de progreso. Puedes volver a sumar recién una hora después (sin tope diario)." },
  { icon: "🔥", title: "Racha diaria", points: "+300", zero10k: true, detail: "Entra al dashboard días seguidos: desde el segundo día consecutivo sumas racha, una vez por día." },
  { icon: "🎬", title: "Misiones en video", points: "+100", detail: "Mira y completa una cápsula de video del día. Suma una vez por cápsula, con 5 minutos de espera entre una y otra." },
  { icon: "❓", title: "Quiz de la cápsula", points: "+100", detail: "Responde bien el quiz de una cápsula. Solo el primer acierto otorga puntos." },
  { icon: "🎙️", title: "Cápsula de podcast", points: "+300", detail: "Escuchá y reclama una cápsula de tipo podcast. Suma una vez por cada una." },
  { icon: "🚀", title: "Iniciar un día", points: "+250", detail: "Entra por primera vez a un día desbloqueado. Una sola vez por cada día (1 a 4)." },
  { icon: "🔴", title: "Unirte a la llamada en vivo", points: "+125", detail: "Cuando el contador del día llega a 0, entra con el botón “Unirse a la clase”. +125 por llamada · son 4 llamadas (hasta 500 pts)." },
  { icon: "🏁", title: "Completar un día", points: "+500", detail: "Terminá todas las misiones del día y marcá la fase como completada. Una sola vez por cada día." },
  { icon: "🔑", title: "Palabra clave del día", points: "+1.000", detail: "Escribe la palabra clave que se menciona en la clase (no importan mayúsculas ni acentos). Una vez por día." },
  { icon: "📸", title: "Historia diaria", points: "+500", detail: "Sube la captura de tu historia del día (imagen, máx. 8 MB). Una por día; se reinicia a las 8 AM hora Miami." },
  { icon: "✅", title: "Misión diaria", points: "+1.000", detail: "Completa la misión diaria activa (sube una captura, un link o un texto). Suma una vez por misión." },
  { icon: "⚡", title: "Misión ráfaga", points: "Variable", variable: true, detail: "Reclama la misión relámpago mientras está activa, dentro de su ventana de tiempo. Una vez por ráfaga; los puntos los define el equipo." },
  { icon: "💬", title: "Comentario en la comunidad", points: "+200", detail: "Comenta en la comunidad del programa. Suma en tus primeros 3 comentarios." },
  { icon: "🤝", title: "Referido que ingresa", points: "+1.000", detail: "Comparte tu link de referido: ganas por cada persona que entra al challenge (se acredita cuando se crea su cuenta). Sin límite." },
];

function HowToEarnPoints({ over10k = false }: { over10k?: boolean }) {
  return (
    <div style={{
      background: "rgba(10,37,64,0.8)",
      border: "1px solid #1E3A5C",
      borderRadius: "14px",
      overflow: "hidden",
      marginBottom: "28px",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1E3A5C" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 800, color: "#00D4FF", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          💡 Cómo sumar puntos
        </span>
        <p style={{ fontSize: "12px", color: "#8DA2C4", marginTop: "3px" }}>
          Todas las formas de ganar puntos en el challenge. Cuanto más sumas, más alto es tu rango.
        </p>
        {over10k && (
          <p style={{ fontSize: "12px", color: "#FFD60A", marginTop: "5px", fontWeight: 600 }}>
            ⚖️ Estás sobre los 10.000 puntos: estos valores ya van a la mitad, y el tiempo en el dashboard y las rachas no suman.
          </p>
        )}
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 10,
        padding: "14px 16px",
      }}>
        {EARN_METHODS.map((m) => {
          const zeroed = over10k && m.zero10k;
          const muted = m.variable || zeroed;
          const half = m.variable ? m.points : "+" + Math.floor(parseInt(m.points.replace(/[^\d]/g, ""), 10) / 2).toLocaleString("es");
          const label = m.variable ? m.points : zeroed ? "no suma" : `${over10k ? half : m.points} pts`;
          return (
          <div key={m.title} style={{
            background: "rgba(20,58,107,0.45)",
            border: "1px solid #1E3A5C",
            borderRadius: 10,
            padding: "11px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, color: "#E6EEFA", lineHeight: 1.2 }}>
                {m.title}
              </span>
              <span style={{
                flexShrink: 0,
                fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 800,
                color: muted ? "#9FB4D4" : "#FFD60A",
                background: muted ? "rgba(159,180,212,0.12)" : "rgba(255,214,10,0.1)",
                border: `1px solid ${muted ? "rgba(159,180,212,0.3)" : "rgba(255,214,10,0.3)"}`,
                borderRadius: 5, padding: "3px 7px", whiteSpace: "nowrap",
              }}>
                {label}
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: "#A9BAD4", lineHeight: 1.45, margin: 0 }}>
              {m.detail}
            </p>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export function RankingClient({ isStudent = false, studentPoints = 0 }: { isStudent?: boolean; studentPoints?: number }) {
  const [board, setBoard]     = useState<FullData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/leaderboard/ranks");
      const data = await res.json() as FullData;
      setBoard(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const all   = board?.all ?? [];
  const total = board?.total ?? 0;
  const me    = all.find((e) => e.is_current_user) ?? null;

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px 16px" }}>

      {/* Page title */}
      <FlagBanner minHeight={170} priority contentStyle={{ padding: "26px 28px" }} className="gb-ranking-hero">
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px", fontWeight: 700,
          color: "#FFD700", textTransform: "uppercase",
          letterSpacing: "0.14em", marginBottom: "8px",
        }}>
          🏆 Rangos y Premios
        </p>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "28px", fontWeight: 800,
          color: "#ffffff", lineHeight: 1.15,
          marginBottom: "6px",
        }}>
          Sube de rango, gana premios
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.78)", maxWidth: "52ch" }}>
          Acumula puntos y sube de rango. <strong style={{ color: "#fff" }}>Cada rango compite por su propio premio</strong> — se <strong style={{ color: "#fff" }}>sortea</strong> al cierre del challenge.
        </p>

        <p style={{
          fontSize: "11.5px", color: "rgba(255,255,255,0.62)", marginTop: 12,
          background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 8, padding: "8px 12px", maxWidth: "60ch", lineHeight: 1.45,
        }}>
          🔒 El ranking y los premios son únicamente para los usuarios que <strong style={{ color: "#fff" }}>pagaron el acceso al challenge</strong>.
        </p>

        {/* Tu rango — fusionado dentro del banner, sobre la bandera */}
        {!loading && (isStudent ? <StudentNote points={studentPoints} /> : <MyRankCard points={me?.total_points ?? 0} />)}
      </FlagBanner>
      <div style={{ height: "24px" }} />

      {/* Regalo: 1 mes gratis de GovBidder Connect al completar el challenge */}
      <div style={{ marginBottom: "28px" }}>
        <GiftCard />
      </div>

      {/* Cómo sumar puntos — guía completa de todas las formas de ganar */}
      <HowToEarnPoints over10k={(me?.total_points ?? 0) >= 10000} />

      {/* Prize tiers */}
      <div style={{
        background: "rgba(10,37,64,0.8)",
        border: "1px solid #1E3A5C",
        borderRadius: "14px",
        overflow: "hidden",
        marginBottom: "28px",
      }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1E3A5C" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 800, color: "#FFD60A", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Premios del Challenge
          </span>
          <p style={{ fontSize: "12px", color: "#8DA2C4", marginTop: "3px" }}>
            Cada premio se sortea entre los del rango al cierre. Sube para competir por uno más grande. 🎲
          </p>
        </div>

        {/* Expert */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "rgba(0,214,122,0.06)", borderBottom: "1px solid rgba(0,214,122,0.12)" }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>🏆</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 700, color: "#00D67A", marginBottom: "2px" }}>
              🏆 GovBidder Expert · 15,000+ pts
            </p>
            <p style={{ fontSize: "13px", color: "#C8D6E8" }}>
              Servicio <strong style={{ color: "#FFFFFF" }}>Done For You</strong> — lo hacemos por ti
            </p>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 800, color: "#00D67A", background: "rgba(0,214,122,0.1)", border: "1px solid rgba(0,214,122,0.3)", borderRadius: "5px", padding: "4px 10px", whiteSpace: "nowrap" }}>$15,000 USD</span>
        </div>

        {/* Legacy */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "rgba(255,214,10,0.04)", borderBottom: "1px solid rgba(255,214,10,0.1)" }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>👑</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 700, color: "#FFD700", marginBottom: "2px" }}>
              👑 GovBidder Legacy · 10,000–14,999 pts
            </p>
            <p style={{ fontSize: "13px", color: "#C8D6E8" }}>
              Cupón de <strong style={{ color: "#FFFFFF" }}>$1,000 USD</strong> para productos GovBidder
            </p>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 800, color: "#FFD700", background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: "5px", padding: "4px 10px", whiteSpace: "nowrap" }}>$1,000 USD</span>
        </div>

        {/* Prime */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "rgba(192,192,192,0.04)", borderBottom: "1px solid rgba(192,192,192,0.1)" }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 700, color: "#C0C0C0", marginBottom: "2px" }}>
              ⚡ GovBidder Prime · 5,000–9,999 pts
            </p>
            <p style={{ fontSize: "13px", color: "#C8D6E8" }}>
              Consultoría 1:1 de 1 hora con <strong style={{ color: "#FFFFFF" }}>Santo</strong>
            </p>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 800, color: "#C0C0C0", background: "rgba(192,192,192,0.08)", border: "1px solid rgba(192,192,192,0.25)", borderRadius: "5px", padding: "4px 10px", whiteSpace: "nowrap" }}>1 hora 1:1</span>
        </div>

        {/* Elevate */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px" }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>🔥</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 700, color: "#CD7F32", marginBottom: "2px" }}>
              🔥 GovBidder Elevate · 0–4,999 pts
            </p>
            <p style={{ fontSize: "13px", color: "#C8D6E8" }}>
              <strong style={{ color: "#FFFFFF" }}>10 auditorías</strong> con el Team GovBidder
            </p>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 800, color: "#CD7F32", background: "rgba(205,127,50,0.08)", border: "1px solid rgba(205,127,50,0.25)", borderRadius: "5px", padding: "4px 10px", whiteSpace: "nowrap" }}>10 lugares</span>
        </div>
      </div>

      {/* Tablas de líderes — 4 columnas, una por rango */}
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 800, color: "#8DA2C4", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "14px" }}>
        Tablas de líderes por rango · top {MAX_PER_RANK} por rango
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 12,
        alignItems: "start",
      }}>
        {RANK_ORDER.map((key) => (
          <RankColumn key={key} rankKey={key} all={all} loading={loading} />
        ))}
      </div>

      {/* Footer */}
      {!loading && (
        <p style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "9px", color: "#647FA8", marginTop: 16 }}>
          {total > 0 ? `${total} participante${total !== 1 ? "s" : ""} · ` : ""}
          Al cierre del challenge los premios se sortean — más rango, más chances
        </p>
      )}
    </div>
  );
}
