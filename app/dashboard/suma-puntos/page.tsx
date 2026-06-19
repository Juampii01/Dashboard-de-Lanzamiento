import { createClient, createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

async function getIsAdmin(): Promise<boolean> {
  if (DEV_MODE) return true; // dev preview = admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await createServiceClient()
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return (data as { is_admin?: boolean } | null)?.is_admin ?? false;
}

export default async function SumaPuntosPage() {
  const isAdmin = await getIsAdmin();

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm transition-colors"
        style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}
      >
        ← Dashboard
      </Link>

      {isAdmin ? <AdminView /> : <ComingSoon />}
    </div>
  );
}

// ─── Vista usuarios: coming soon ────────────────────────────────────────────
function ComingSoon() {
  return (
    <div
      style={{
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", gap: 18, padding: "clamp(32px, 7vw, 64px) 24px",
        borderRadius: 20, minHeight: "min(60vh, 520px)",
        background: "radial-gradient(700px circle at 50% 0%, rgba(228,45,44,0.12), transparent 60%), linear-gradient(160deg, #0d1a3d 0%, #080f24 100%)",
        border: "1px solid rgba(228,45,44,0.25)",
      }}
    >
      <div style={{ background: "#fff", borderRadius: 16, padding: "10px 16px", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/halcon.png" alt="Govbidder Challenge" style={{ height: 60, width: "auto", display: "block" }} />
      </div>

      <p style={{
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800,
        letterSpacing: "0.16em", textTransform: "uppercase", color: "#FFD700",
      }}>
        Govbidder Challenge
      </p>

      <h2 style={{
        fontFamily: "var(--font-display)", fontSize: "clamp(24px, 4.5vw, 38px)", fontWeight: 800,
        color: "#fff", lineHeight: 1.12, margin: 0,
      }}>
        ⚡ Suma Puntos
      </h2>

      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.82)", maxWidth: "48ch", margin: 0, lineHeight: 1.55 }}>
        Estamos armando <strong style={{ color: "#fff" }}>nuevas formas de ganar puntos</strong> y subir
        en el ranking. Muy pronto vas a poder sumar XP extra desde acá.
      </p>

      <span style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800,
        letterSpacing: "0.1em", textTransform: "uppercase", color: "#E42D2C",
        background: "rgba(228,45,44,0.12)", border: "1px solid rgba(228,45,44,0.4)",
        borderRadius: 999, padding: "8px 18px", marginTop: 4,
      }}>
        🔧 Próximamente
      </span>
    </div>
  );
}

// ─── Vista admin: sección en construcción (visible solo para admins) ─────────
const PLANNED = [
  {
    icon: "📸",
    title: "Compartí y ganá",
    desc: "El usuario interactúa con una publicación de Govbidder, sube una captura y suma XP. Con moderación desde el panel admin.",
    status: "En diseño",
  },
  {
    icon: "🤝",
    title: "Referidos",
    desc: "Cada usuario tiene un link propio. Cuando un referido completa el formulario verificado en la landing, el referidor suma XP.",
    status: "En desarrollo",
  },
  {
    icon: "🔥",
    title: "Racha diaria",
    desc: "Entrar todos los días del challenge otorga un bonus creciente (usa last_seen_at).",
    status: "Idea",
  },
];

function AdminView() {
  return (
    <div className="space-y-6">
      {/* Banner admin */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          padding: "14px 18px", borderRadius: 14,
          background: "color-mix(in srgb, var(--accent) 12%, var(--card))",
          border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))",
        }}
      >
        <span style={{ fontSize: 22 }}>🛠️</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 800, color: "var(--foreground)", fontSize: 15, fontFamily: "var(--font-display)" }}>
            Vista admin · sección en construcción
          </p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Los usuarios ven un <strong>“Próximamente”</strong>. Acá vas a ir viendo las mecánicas a medida que se construyan.
          </p>
        </div>
      </div>

      {/* Encabezado */}
      <div>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
          letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted-foreground)",
          marginBottom: 4,
        }}>
          ⚡ Suma Puntos
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.15 }}>
          Nuevas formas de ganar XP
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 6, maxWidth: "60ch" }}>
          Mecánicas planificadas para que los usuarios sumen puntos más allá de las 4 fases del challenge.
        </p>
      </div>

      {/* Mecánicas planificadas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {PLANNED.map((m) => (
          <div
            key={m.title}
            style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "18px 16px",
              display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 26 }}>{m.icon}</span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "var(--accent-foreground)", background: "var(--accent)",
                borderRadius: 999, padding: "3px 10px",
              }}>
                {m.status}
              </span>
            </div>
            <p style={{ fontWeight: 800, color: "var(--foreground)", fontSize: 16 }}>{m.title}</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{m.desc}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>
        Esta sección es solo visible para admins. Cuando una mecánica esté lista, se publica para todos los usuarios.
      </p>
    </div>
  );
}
