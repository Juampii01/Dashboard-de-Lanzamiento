"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, MessageCircle, X, FileText, ChevronDown, Play } from "lucide-react";
import { toast } from "sonner";
import { FlagBanner } from "@/components/flag-banner";
import { useUserAvatar } from "@/lib/hooks/use-user-avatar";
import { type Breakdown, breakdownRows } from "@/lib/points-breakdown";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HomeClientProps {
  initialPoints: number;
  fullName: string;
  devMode: boolean;
  avatarUrl?: string | null;
  recordings?: (string | null)[];
  tutorialVideoId?: string;
}

interface Comment {
  id: string;
  display_name: string;
  content: string;
  created_at: string;
}

interface ContractNiche {
  id: string;
  label: string;
  icon: string;
  // Cada nicho tiene 1+ contratos reales (fotos). Se navegan con flechas.
  contracts: { src: string; title: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Replace this with your real Loom video ID (the part after loom.com/share/)
const TUTORIAL_YT_ID = "2A6EB_cDk-A"; // ID de YouTube del tutorial de inicio ("" = coming soon)

const CONTRACT_NICHES: ContractNiche[] = [
  { id: "limpieza", label: "Cleaning", icon: "🧹", contracts: [{ src: "/contracts/limpieza-1.png", title: "Power Washing" }, { src: "/contracts/limpieza-2.png", title: "Window Cleaning" }, { src: "/contracts/limpieza-3.png", title: "Laundry Services" }, { src: "/contracts/limpieza-4.png", title: "Uniforms" }] },
  { id: "hvac", label: "HVAC & Plumbing", icon: "⚙️", contracts: [{ src: "/contracts/hvac-1.png", title: "HVAC Replacement" }, { src: "/contracts/hvac-2.png", title: "Heating & Cooling (HVAC)" }, { src: "/contracts/hvac-3.png", title: "495 River St — Passaic County (real)" }, { src: "/contracts/hvac-4.png", title: "Plumbing Supply" }] },
  { id: "construccion", label: "Construction & Maintenance", icon: "🏗️", contracts: [{ src: "/contracts/construccion-1.png", title: "Roofing" }, { src: "/contracts/construccion-2.png", title: "Elevator Maintenance" }, { src: "/contracts/construccion-3.png", title: "Elevator Services" }, { src: "/contracts/construccion-4.png", title: "Hardware Supplies" }, { src: "/contracts/construccion-5.png", title: "Auto Body Shop" }] },
  { id: "areas-verdes", label: "Landscaping", icon: "🌿", contracts: [{ src: "/contracts/areas-verdes-1.png", title: "Landscape Maintenance" }, { src: "/contracts/areas-verdes-2.png", title: "Tree Removal" }, { src: "/contracts/areas-verdes-3.png", title: "Fertilizer Supply" }] },
  { id: "invierno", label: "Winter Products", icon: "❄️", contracts: [{ src: "/contracts/invierno-1.png", title: "Snow Removal" }, { src: "/contracts/invierno-2.png", title: "Salt & Winter Products" }, { src: "/contracts/invierno-3.png", title: "Holiday Tree Lighting" }] },
  { id: "it", label: "IT & Technology", icon: "💻", contracts: [{ src: "/contracts/it-1.png", title: "IT Support" }, { src: "/contracts/it-2.png", title: "Software" }, { src: "/contracts/it-3.png", title: "Call Center" }, { src: "/contracts/it-4.png", title: "Translation Services" }] },
  { id: "alimentacion", label: "Food & Catering", icon: "🍽️", contracts: [{ src: "/contracts/alimentacion-1.png", title: "Food Services" }, { src: "/contracts/alimentacion-2.png", title: "Hospital Food Service" }, { src: "/contracts/alimentacion-3.png", title: "Bread Supply" }, { src: "/contracts/alimentacion-4.png", title: "Ice Cream" }] },
  { id: "eventos", label: "Events", icon: "🎉", contracts: [{ src: "/contracts/eventos-1.png", title: "Party & Event Rental" }, { src: "/contracts/eventos-2.png", title: "Special Events" }] },
  { id: "fotografia", label: "Photography", icon: "📸", contracts: [{ src: "/contracts/fotografia-1.png", title: "Photography" }] },
  { id: "seguridad", label: "Security", icon: "🔒", contracts: [{ src: "/contracts/seguridad-1.png", title: "Security Services" }] },
  { id: "transporte", label: "Transportation", icon: "🚛", contracts: [{ src: "/contracts/transporte-1.png", title: "Transportation" }] },
  { id: "oficina", label: "Office Services", icon: "📋", contracts: [{ src: "/contracts/oficina-1.png", title: "Accounting Services" }, { src: "/contracts/oficina-2.png", title: "Printing Services" }] },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PointsCard({ initial, avatarUrl }: { initial: number; avatarUrl?: string | null }) {
  const [points, setPoints] = useState(initial);

  // Avatar: misma fuente de verdad que el sidebar / barra de progreso.
  const { photoUrl } = useUserAvatar(avatarUrl);
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [photoUrl]);

  // Desglose de puntos (se carga al abrir).
  const [open, setOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [bdLoading, setBdLoading] = useState(false);

  const fetchBreakdown = useCallback(async () => {
    setBdLoading(true);
    try {
      const r = await fetch("/api/xp/breakdown");
      const d = await r.json();
      if (d.ok) setBreakdown({ total: d.total ?? 0, tracked: d.tracked ?? 0, by_category: d.by_category ?? {} });
    } catch { /* noop */ }
    setBdLoading(false);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ total?: number }>).detail;
      if (typeof detail?.total === "number") setPoints(detail.total);
    };
    window.addEventListener("xp-gained", handler);
    return () => window.removeEventListener("xp-gained", handler);
  }, []);

  const toggle = useCallback(() => {
    const next = !open;
    setOpen(next);
    // El fetch va FUERA del updater (los updaters deben ser puros). Guard de
    // in-flight + ya-cargado para evitar requests duplicados.
    if (next && !breakdown && !bdLoading) fetchBreakdown();
  }, [open, breakdown, bdLoading, fetchBreakdown]);

  const rows = breakdownRows(breakdown);

  return (
    <div
      style={{
        background: "var(--score-bg)",
        border: "1px solid var(--score-border)",
        borderRadius: "14px",
        padding: "16px 20px",
        position: "relative",
        overflow: "hidden",
        alignSelf: "flex-start",
        maxWidth: "460px",
        width: "100%",
      }}
    >
      {/* Corner brackets */}
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <div
          key={pos}
          style={{
            position: "absolute",
            width: "10px", height: "10px",
            top: pos.startsWith("t") ? 0 : "auto",
            bottom: pos.startsWith("b") ? 0 : "auto",
            left: pos.endsWith("l") ? 0 : "auto",
            right: pos.endsWith("r") ? 0 : "auto",
            borderTop: pos.startsWith("t") ? "2px solid var(--score-bracket)" : "none",
            borderBottom: pos.startsWith("b") ? "2px solid var(--score-bracket)" : "none",
            borderLeft: pos.endsWith("l") ? "2px solid var(--score-bracket)" : "none",
            borderRight: pos.endsWith("r") ? "2px solid var(--score-bracket)" : "none",
          }}
        />
      ))}

      {/* Fila clickeable: avatar + puntos + chevron → despliega el desglose */}
      <button
        onClick={toggle}
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: "16px",
          width: "100%", background: "none", border: "none", padding: 0,
          cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit",
          position: "relative",
        }}
      >
        {/* Avatar (águila de fondo + foto del usuario si tiene) */}
        <div style={{
          flexShrink: 0, width: "52px", height: "52px", borderRadius: "50%",
          overflow: "hidden", position: "relative",
          border: "2px solid color-mix(in srgb, var(--accent) 55%, transparent)",
          boxShadow: "0 0 16px color-mix(in srgb, var(--accent) 22%, transparent)",
          background: "var(--secondary)",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aguila.png" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
          {photoUrl && !imgError && (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={photoUrl} src={photoUrl} alt="" onError={() => setImgError(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-arcade)",
            fontSize: "8px", fontWeight: 700,
            color: "var(--score-label)", letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: "2px",
          }}>
            TUS PUNTOS ACUMULADOS
          </div>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: "36px", fontWeight: 900,
            color: "var(--score-num)", letterSpacing: "-1px", lineHeight: 1,
          }}>
            {points.toLocaleString()}
          </div>
          <div style={{
            fontSize: "10px", color: "var(--muted-foreground)",
            fontWeight: 600, marginTop: "2px",
          }}>
            {open ? "Ocultar el desglose de puntos" : "Toca para ver de dónde salieron tus puntos"}
          </div>
        </div>

        <ChevronDown
          size={20}
          style={{
            flexShrink: 0, color: "var(--muted-foreground)",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {/* Panel de desglose */}
      {open && (
        <div style={{ borderTop: "1px solid var(--border)", marginTop: "14px", paddingTop: "12px" }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 700,
            color: "var(--muted-foreground)", letterSpacing: "0.1em",
            textTransform: "uppercase", margin: "0 0 6px",
          }}>
            De dónde salieron
          </p>

          {bdLoading && rows.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>Cargando…</p>
          ) : rows.length > 0 ? (
            rows.map(([label, pts]) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", gap: 14,
                fontSize: 12.5, marginTop: 5,
              }}>
                <span style={{ color: "var(--foreground)" }}>{label}</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontWeight: 700, whiteSpace: "nowrap",
                  color: pts < 0 ? "var(--destructive)" : "var(--success)",
                }}>
                  {pts > 0 ? `+${pts.toLocaleString()}` : pts.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>
              Todavía no sumaste puntos. Quédate en el dashboard, mira los videos y completa misiones para empezar a sumar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// 4 botones de grabaciones (2x2) que van al lado de los puntos. Cada uno abre su
// link de YouTube en pestaña nueva. Los links se configuran desde /admin.
function RecordingsButtons({ urls }: { urls: (string | null)[] }) {
  const openRec = (u: string | null) => {
    if (u) window.open(u, "_blank", "noopener,noreferrer");
  };
  return (
    <div
      style={{
        flex: "1 1 260px",
        maxWidth: 420,
        minWidth: 220,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 10,
      }}
    >
      {[0, 1, 2, 3].map((i) => {
        const u = urls[i] ?? null;
        const ready = !!u;
        return (
          <button
            key={i}
            type="button"
            onClick={() => openRec(u)}
            disabled={!ready}
            title={ready ? "Abrir grabación en YouTube" : "Grabación próximamente"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              minHeight: 54,
              padding: "0 12px",
              borderRadius: 12,
              // Cargada → look YouTube: borde y sombra rojos. Sin cargar → apagada (gris, punteada).
              border: ready ? "1.5px solid rgba(255,0,0,0.6)" : "1.5px dashed var(--border)",
              background: ready ? "color-mix(in srgb, #FF0000 9%, var(--card))" : "transparent",
              color: ready ? "var(--foreground)" : "var(--muted-foreground)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 700,
              textAlign: "left",
              cursor: ready ? "pointer" : "not-allowed",
              opacity: ready ? 1 : 0.5,
              boxShadow: ready ? "0 3px 12px -4px rgba(255,0,0,0.5)" : "none",
              transition: "transform .12s, box-shadow .12s, border-color .12s",
            }}
            onMouseEnter={(e) => {
              if (!ready) return;
              const el = e.currentTarget;
              el.style.transform = "translateY(-1px)";
              el.style.boxShadow = "0 6px 18px -4px rgba(255,0,0,0.65)";
              el.style.borderColor = "#FF0000";
            }}
            onMouseLeave={(e) => {
              if (!ready) return;
              const el = e.currentTarget;
              el.style.transform = "none";
              el.style.boxShadow = "0 3px 12px -4px rgba(255,0,0,0.5)";
              el.style.borderColor = "rgba(255,0,0,0.6)";
            }}
          >
            {/* Badge de play estilo YouTube (círculo rojo + triángulo blanco) */}
            <span
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: ready ? "#FF0000" : "color-mix(in srgb, var(--muted-foreground) 28%, transparent)",
                boxShadow: ready ? "0 0 10px rgba(255,0,0,0.6)" : "none",
              }}
            >
              <Play size={13} style={{ color: "#fff", fill: "#fff", marginLeft: 1 }} />
            </span>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.15 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Grabación día {i + 1}
              </span>
              {!ready && (
                <span style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.85 }}>próximamente</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function VideoTutorial({ videoId }: { videoId?: string }) {
  const id = videoId ?? TUTORIAL_YT_ID;
  const isPlaceholder = !id;

  return (
    <div>
      <div style={{ marginBottom: "12px" }}>
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px", fontWeight: 700,
          color: "var(--muted-foreground)", textTransform: "uppercase",
          letterSpacing: "0.14em", marginBottom: "4px",
        }}>
          🎬 Tutorial
        </p>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "20px", fontWeight: 800,
          color: "var(--foreground)", lineHeight: 1.2,
        }}>
          Cómo usar el dashboard
        </h2>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
          Mira el tutorial completo antes de empezar los retos.
        </p>
      </div>

      <div
        style={{
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid #1E3A5C",
          background: "#060D1A",
          position: "relative",
          paddingBottom: "56.25%", // 16:9
          height: 0,
        }}
      >
        {isPlaceholder ? (
          /* Tutorial "coming soon": invita a presionar pero avisa que está llegando */
          <div
            role="button"
            tabIndex={0}
            onClick={() => toast("El tutorial está llegando — lo subimos en breve 🚀")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toast("El tutorial está llegando — lo subimos en breve 🚀"); } }}
            aria-label="Ver el tutorial (próximamente)"
            style={{ position: "absolute", inset: 0, cursor: "pointer" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/flag-usa.jpg"
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%" }}
            />
            <div
              style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(700px circle at 50% 18%, rgba(228,45,44,0.18), transparent 60%), linear-gradient(135deg, rgba(13,46,77,0.86) 0%, rgba(6,13,26,0.94) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "14px", padding: "20px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/halcon.png"
                alt="GovBidder"
                style={{ height: "38px", width: "auto", objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.75))" }}
              />
              {/* Botón de play */}
              <div
                style={{
                  width: "62px", height: "62px", borderRadius: "999px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(228,45,44,0.92)",
                  boxShadow: "0 0 0 8px rgba(228,45,44,0.18), 0 8px 24px rgba(0,0,0,0.5)",
                  cursor: "pointer",
                }}
              >
                <span style={{ color: "#fff", fontSize: "24px", marginLeft: "4px", lineHeight: 1 }}>▶</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#fff", fontSize: "16px", fontWeight: 700, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
                  Presiona para ver el tutorial
                </p>
                <p style={{ color: "#C9D6EC", fontSize: "13px", marginTop: "5px", maxWidth: "42ch", textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
                  Te mostramos cómo aprovechar el dashboard al máximo en pocos minutos.
                </p>
              </div>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 800,
                letterSpacing: "0.1em", textTransform: "uppercase", color: "#1a1205",
                background: "#FFC53D", border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: "999px", padding: "5px 14px",
              }}>
                ⏳ Próximamente · Coming soon
              </span>
            </div>
          </div>
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%",
              border: "none",
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title="Tutorial del dashboard"
          />
        )}
      </div>
    </div>
  );
}

// ─── Comments ─────────────────────────────────────────────────────────────────

function CommentsSection({ over10k = false }: { over10k?: boolean }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/comments");
      if (res.status === 404 || res.status === 501) { setAvailable(false); return; }
      if (!res.ok) return;
      const data = await res.json();
      if (data.comments) setComments(data.comments);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.status === 501) { setAvailable(false); return; }
      if (!res.ok) throw new Error("error");
      const data = await res.json() as { ok?: boolean; awarded?: boolean; delta?: number; total?: number };
      setContent("");
      if (data.awarded && data.delta) {
        window.dispatchEvent(new CustomEvent("xp-gained", {
          detail: { delta: data.delta, total: data.total, source: "community" },
        }));
        toast.success(`¡Comentario publicado! +${data.delta} pts por participar 🎉`);
      } else {
        toast.success("¡Comentario publicado!");
      }
      load();
    } catch {
      toast.error("No se pudo publicar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "12px" }}>
        <p style={{
          fontFamily: "var(--font-arcade)",
          fontSize: "8px", fontWeight: 700,
          color: "var(--muted-foreground)", textTransform: "uppercase",
          letterSpacing: "0.14em", marginBottom: "4px",
        }}>
          💬 Comunidad
        </p>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "20px", fontWeight: 900,
          color: "var(--foreground)",
        }}>
          ¡Comenta qué te parece el programa aquí!
        </h2>
      </div>

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        {/* Input form */}
        {available && (
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "16px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  marginBottom: "6px",
                }}>
                  <MessageCircle style={{ width: "13px", height: "13px", color: "var(--muted-foreground)" }} />
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 600 }}>
                    Tu comentario
                  </span>
                  <span style={{
                    fontSize: "10px", fontWeight: 800, whiteSpace: "nowrap",
                    color: "var(--accent-foreground)", background: "var(--accent)",
                    borderRadius: 999, padding: "1px 8px",
                  }}>
                    +{over10k ? 100 : 200} pts · primeras 3 veces
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribe tu opinión, duda o experiencia con el programa..."
                  maxLength={500}
                  rows={2}
                  style={{
                    width: "100%",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--foreground)",
                    fontSize: "13px",
                    padding: "8px 12px",
                    resize: "none",
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                />
                <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "3px", textAlign: "right" }}>
                  {content.length}/500
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "10px 16px",
                  background: content.trim() ? "#D7263D" : "rgba(215,38,61,0.2)",
                  border: "1px solid rgba(215,38,61,0.4)",
                  borderRadius: "8px",
                  color: content.trim() ? "#FFFFFF" : "var(--muted-foreground)",
                  fontSize: "12px", fontWeight: 700,
                  cursor: content.trim() ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  marginBottom: "20px",
                }}
              >
                <Send style={{ width: "13px", height: "13px" }} />
                {submitting ? "Enviando..." : "Publicar"}
              </button>
            </div>
          </form>
        )}

        {/* Comments list */}
        <div style={{ maxHeight: "320px", overflowY: "auto" }}>
          {!available ? (
            <div style={{
              padding: "32px 16px", textAlign: "center",
              color: "var(--muted-foreground)", fontSize: "13px",
            }}>
              <MessageCircle style={{ width: "24px", height: "24px", margin: "0 auto 8px", opacity: 0.4 }} />
              <p style={{ color: "var(--foreground)", fontWeight: 600 }}>Sección de comentarios próximamente</p>
              <p style={{ fontSize: "11px", marginTop: "4px" }}>
                Ejecuta la migración SQL para activarla.
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div style={{
              padding: "32px 16px", textAlign: "center",
              color: "var(--muted-foreground)", fontSize: "13px",
            }}>
              <p style={{ color: "var(--foreground)", fontWeight: 600 }}>Sé el primero en comentar 👆</p>
              <p style={{ fontSize: "11px", marginTop: "4px", color: "var(--muted-foreground)" }}>
                Tu opinión ayuda a mejorar el programa.
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex", gap: "10px", alignItems: "flex-start",
                }}
              >
                {/* Avatar circle */}
                <div
                  style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #143A6B 0%, #0A2540 100%)",
                    border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 700, color: "#E5ECF7",
                    flexShrink: 0,
                  }}
                >
                  {c.display_name.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)" }}>
                      {c.display_name}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                      {new Date(c.created_at).toLocaleDateString("es-AR", {
                        day: "numeric", month: "short",
                      })}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--foreground)", lineHeight: 1.5, margin: 0 }}>
                    {c.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Certificate Modal ────────────────────────────────────────────────────────

function CertificateModal({ onClose, name }: { onClose: () => void; name: string }) {
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
  const NAVY = "#152340";
  const displayName = (name || "").trim() || "Tu Nombre Completo";
  const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 99990,
        background: "rgba(6,13,26,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px", backdropFilter: "blur(4px)",
      }}
    >
      <div style={{ position: "relative", width: "min(840px, 100%)" }}>
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: "absolute", top: "-40px", right: 0,
            background: "rgba(255,255,255,0.14)", border: "none", borderRadius: "8px",
            padding: "7px 9px", color: "#fff", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
          }}
        >
          <X style={{ width: 15, height: 15 }} /> Cerrar
        </button>

        {/* Certificado */}
        <div style={{
          position: "relative", overflow: "hidden",
          background: "linear-gradient(160deg, #ffffff 0%, #f6f7fb 100%)",
          borderRadius: "14px", aspectRatio: "1.4 / 1",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          fontFamily: "var(--font-sans)",
        }}>
          {/* Ondas decorativas */}
          <svg viewBox="0 0 840 600" preserveAspectRatio="none" aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <path key={i} fill="none" stroke="rgba(21,41,120,0.10)" strokeWidth="1"
                d={`M -40 ${150 + i * 13} C 220 ${60 + i * 13}, 600 ${330 + i * 13}, 880 ${150 + i * 13}`} />
            ))}
          </svg>

          {/* Swoosh rojo + navy esquina inferior izquierda */}
          <svg viewBox="0 0 300 240" aria-hidden
            style={{ position: "absolute", bottom: -6, left: -6, width: "30%", height: "auto" }}>
            <path d="M -20 260 C 70 210, 150 150, 90 -20" fill="none" stroke="#E42D2C" strokeWidth="16" strokeLinecap="round" />
            <path d="M -20 285 C 110 220, 190 150, 130 -20" fill="none" stroke={NAVY} strokeWidth="20" strokeLinecap="round" />
          </svg>

          {/* Contenido */}
          <div style={{
            position: "relative", height: "100%",
            display: "flex", flexDirection: "column", alignItems: "center",
            textAlign: "center", padding: "5.5% 9% 4.5%",
          }}>
            {/* Header: sello + título */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "center" }}>
              {/* Sello con cinta */}
              <svg width="58" height="74" viewBox="0 0 58 74" aria-hidden style={{ flexShrink: 0 }}>
                <path d="M20 42 L15 70 L23 62 L29 70 L29 44 Z" fill={NAVY} />
                <path d="M38 42 L43 70 L35 62 L29 70 L29 44 Z" fill="#0d1a3d" />
                {Array.from({ length: 16 }).map((_, i) => (
                  <rect key={i} x="27.5" y="0" width="3" height="9" rx="1.2" fill="#C8A33A"
                    transform={`rotate(${i * 22.5} 29 27)`} />
                ))}
                <circle cx="29" cy="27" r="20" fill={NAVY} />
                <circle cx="29" cy="27" r="14.5" fill="none" stroke="#E5B83B" strokeWidth="2" />
                <circle cx="29" cy="27" r="6" fill="#E5B83B" />
              </svg>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: NAVY, lineHeight: 0.92, fontSize: "clamp(28px, 5.2vw, 46px)", letterSpacing: "1px" }}>
                  CERTIFICADO
                </div>
                <div style={{ fontWeight: 500, color: "#2a3550", letterSpacing: "3px", fontSize: "clamp(13px, 2.3vw, 21px)", marginTop: "2px" }}>
                  DE CULMINACIÓN
                </div>
              </div>
            </div>

            <p style={{ fontWeight: 700, color: NAVY, fontSize: "clamp(11px, 1.7vw, 15px)", marginTop: "3%" }}>
              Otorgado a
            </p>
            <p style={{ fontWeight: 700, color: NAVY, fontSize: "clamp(22px, 4.2vw, 38px)", lineHeight: 1.1, margin: "1.5% 0" }}>
              {displayName}
            </p>
            <p style={{ color: "#3a4055", fontSize: "clamp(10px, 1.6vw, 14px)", maxWidth: "62ch" }}>
              Por haber completado con éxito el programa <strong style={{ color: NAVY }}>GOVBIDDER CHALLENGE</strong>
            </p>
            <p style={{ fontStyle: "italic", color: "#5A6B85", fontSize: "clamp(10px, 1.5vw, 14px)", marginTop: "2.5%" }}>
              {today}
            </p>

            {/* Pie: firma · logo · QR */}
            <div style={{
              marginTop: "auto", width: "100%",
              display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px",
            }}>
              {/* Firma */}
              <div style={{ textAlign: "center", flex: "1 1 0", minWidth: 0 }}>
                <div style={{ height: "2px", background: "#1a1a1a", margin: "0 auto 6px", width: "min(150px, 80%)" }} />
                <div style={{ fontWeight: 800, color: "#1a1a1a", fontSize: "clamp(11px, 1.7vw, 15px)" }}>Santo González</div>
                <div style={{ color: NAVY, fontSize: "clamp(10px, 1.5vw, 13px)" }}>Certificado</div>
              </div>

              {/* Logo */}
              <div style={{ flex: "1 1 0", display: "flex", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/halcon.png" alt="GovBidder Challenge" style={{ height: "clamp(48px, 9vw, 78px)", width: "auto", objectFit: "contain" }} />
              </div>

              {/* QR */}
              <div style={{ textAlign: "center", flex: "1 1 0", minWidth: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=https://dboard.govbidder.net"
                  alt="QR grupo de graduados"
                  style={{ width: "clamp(54px, 9vw, 82px)", height: "auto", display: "block", margin: "0 auto 4px" }}
                />
                <div style={{ color: "#5A6B85", fontSize: "clamp(8px, 1.2vw, 11px)", lineHeight: 1.25 }}>
                  Lee el código QR y únete al<br />grupo de graduados
                </div>
              </div>
            </div>
          </div>

          {/* Marca de agua MUESTRA — evita que se use el preview como certificado real */}
          <div aria-hidden style={{
            position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
            display: "flex", flexDirection: "column", justifyContent: "center", gap: "34px",
            transform: "rotate(-22deg) scale(1.45)", opacity: 0.13,
          }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{
                whiteSpace: "nowrap", textAlign: "center",
                fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "30px",
                letterSpacing: "8px", color: "#152340",
              }}>
                VISTA&nbsp;PREVIA&nbsp;·&nbsp;MUESTRA&nbsp;·&nbsp;VISTA&nbsp;PREVIA&nbsp;·&nbsp;MUESTRA&nbsp;·&nbsp;VISTA&nbsp;PREVIA
              </div>
            ))}
          </div>
        </div>

        {/* Caption preview */}
        <p style={{ textAlign: "center", marginTop: "12px", fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
          Vista previa — tu certificado se emite al completar los 4 días del programa.
        </p>
      </div>
    </div>
  );
}

// ─── Contract Models ──────────────────────────────────────────────────────────

function ContractModal({ niche, onClose }: { niche: ContractNiche; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const list = niche.contracts;
  const current = list[Math.min(idx, list.length - 1)] ?? list[0];
  const go = (d: number) => { setZoomed(false); setIdx((i) => (i + d + list.length) % list.length); };
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose(); };
  const arrow: React.CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 42, height: 42, borderRadius: "50%",
    background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.35)",
    color: "#fff", fontSize: 26, lineHeight: 1, cursor: "pointer", zIndex: 3,
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div onClick={handleBackdrop} style={{ position: "fixed", inset: 0, zIndex: 99990, background: "rgba(6,13,26,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backdropFilter: "blur(4px)" }}>
      <div style={{ position: "relative", background: "#fff", borderRadius: "12px", maxWidth: "760px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ background: "#1a365d", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{niche.icon}</span>
            {niche.label}
            {list.length > 1 && <span style={{ fontWeight: 500, opacity: 0.85, fontSize: 12 }}>· {idx + 1} de {list.length}</span>}
          </span>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "4px", padding: "4px 9px", color: "#fff", cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>

        {/* Imagen — en zoom se RECORRE (scroll/pan en ambos ejes). Clave: en zoom el
            contenedor pasa a display:block y la imagen NO se achica (flexShrink:0 +
            ancho fijo), así desborda de verdad y aparecen las barras de scroll. En
            modo "fit" usa flex centrado. */}
        <div style={{ position: "relative", background: "#0b1426", flex: 1, minHeight: 0, overflow: "auto", WebkitOverflowScrolling: "touch", display: zoomed ? "block" : "flex", alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.src}
            alt={current.title}
            onClick={() => setZoomed((z) => !z)}
            title={zoomed ? "Clic para achicar" : "Clic para acercar y ver el detalle"}
            style={zoomed
              ? { display: "block", flexShrink: 0, width: "1400px", maxWidth: "none", height: "auto", cursor: "zoom-out" }
              : { display: "block", maxWidth: "100%", maxHeight: "72vh", width: "auto", height: "auto", cursor: "zoom-in" }}
          />
        </div>

        {/* Flechas (fijas a los bordes del modal, no scrollean con la imagen) */}
        {list.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Contrato anterior" style={{ ...arrow, left: 10 }}>‹</button>
            <button onClick={() => go(1)} aria-label="Contrato siguiente" style={{ ...arrow, right: 10 }}>›</button>
          </>
        )}

        {/* Footer: título del contrato + puntos de navegación */}
        <div style={{ padding: "11px 16px", borderTop: "1px solid #e6e6e6", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a365d", margin: 0 }}>{current.title}</p>
            <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0", fontStyle: "italic" }}>Contrato gubernamental real · clic en la imagen para ampliar 🔍</p>
          </div>
          {list.length > 1 && (
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {list.map((_, i) => (
                <button key={i} onClick={() => { setZoomed(false); setIdx(i); }} aria-label={`Ver contrato ${i + 1}`}
                  style={{ width: 9, height: 9, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", background: i === idx ? "#D7263D" : "#cbd5e1" }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContractModels({ fullName }: { fullName?: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const selectedNiche = CONTRACT_NICHES.find((n) => n.id === selected) ?? null;

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <p style={{
          fontFamily: "var(--font-arcade)",
          fontSize: "8px", fontWeight: 700,
          color: "var(--muted-foreground)", textTransform: "uppercase",
          letterSpacing: "0.14em", marginBottom: "4px",
        }}>
          🏆 Contratos Reales
        </p>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "22px", fontWeight: 900,
          color: "var(--foreground)",
        }}>
          ¡Mira contratos gubernamentales ganados!
        </h2>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
          Contratos reales adjudicados a pequeñas empresas. Elige tu sector y míralos (usá las flechas si hay varios).
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "8px",
        }}
      >
        {CONTRACT_NICHES.map((niche) => (
          <button
            key={niche.id}
            onClick={() => setSelected(niche.id)}
            style={{
              background: "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 12px",
              cursor: "pointer",
              transition: "all 0.15s",
              textAlign: "left",
              display: "flex", alignItems: "center", gap: "10px",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = "rgba(215,38,61,0.12)";
              el.style.borderColor = "rgba(215,38,61,0.45)";
              el.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = "var(--muted)";
              el.style.borderColor = "var(--border)";
              el.style.transform = "none";
            }}
          >
            <span style={{ fontSize: "22px", flexShrink: 0 }}>{niche.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: "12px", fontWeight: 700,
                color: "var(--foreground)", lineHeight: 1.2,
              }}>
                {niche.label}
              </div>
              <div style={{ fontSize: "9px", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", marginTop: "1px" }}>
                {niche.contracts.length} contrato{niche.contracts.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: "12px", color: "#D7263D", flexShrink: 0 }}>
              →
            </div>
          </button>
        ))}
      </div>

      {/* Certificado de participación button */}
      <button
        onClick={() => setCertOpen(true)}
        style={{
          marginTop: "4px",
          width: "100%",
          padding: "12px 16px",
          borderRadius: "10px",
          border: "1.5px solid color-mix(in srgb, var(--cert-gold) 45%, transparent)",
          background: "color-mix(in srgb, var(--cert-gold) 10%, transparent)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          transition: "all 0.15s",
          color: "var(--cert-gold)",
          fontSize: "13px", fontWeight: 700,
          fontFamily: "var(--font-display)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "color-mix(in srgb, var(--cert-gold) 18%, transparent)";
          el.style.borderColor = "color-mix(in srgb, var(--cert-gold) 70%, transparent)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "color-mix(in srgb, var(--cert-gold) 10%, transparent)";
          el.style.borderColor = "color-mix(in srgb, var(--cert-gold) 45%, transparent)";
        }}
      >
        <span style={{ fontSize: "18px" }}>📜</span>
        Ver Certificado de Participación
        <span style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 400, fontFamily: "var(--font-sans)" }}>
          — boceto
        </span>
      </button>

      {selectedNiche && (
        <ContractModal niche={selectedNiche} onClose={() => setSelected(null)} />
      )}
      {certOpen && <CertificateModal onClose={() => setCertOpen(false)} name={fullName ?? ""} />}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function HomeClient({ initialPoints, devMode, avatarUrl, fullName, recordings, tutorialVideoId }: HomeClientProps) {
  const firstName = (fullName || "").trim().split(/\s+/)[0] || "";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
      {/* 0. Hero banner con la bandera de marca (isla oscura) */}
      <FlagBanner minHeight={150} priority>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.14em",
          color: "#FFD700", marginBottom: "8px",
        }}>
          GovBidder Challenge
        </p>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 800,
          lineHeight: 1.15, color: "#ffffff", margin: 0,
        }}>
          {firstName ? <>Hola, {firstName} 👋</> : <>Bienvenido</>}
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.78)", marginTop: "6px", maxWidth: "46ch" }}>
          Tu empresa puede ganar contratos con el Gobierno de USA. Completa las fases del programa para avanzar.
        </p>
      </FlagBanner>

      {/* 1. Points card + botones de grabaciones (al lado, misma altura, compacto) */}
      {!devMode && (
        <div style={{ display: "flex", gap: "16px", alignItems: "stretch", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 320px", maxWidth: 460, minWidth: 0, display: "flex" }}>
            <PointsCard initial={initialPoints} avatarUrl={avatarUrl} />
          </div>
          <RecordingsButtons urls={recordings ?? [null, null, null, null]} />
        </div>
      )}

      {/* 2. Loom tutorial video */}
      <VideoTutorial videoId={tutorialVideoId} />

      {/* 3. Comments */}
      {!devMode && <CommentsSection over10k={initialPoints >= 10000} />}

      {/* 4. Contract models */}
      <ContractModels fullName={fullName} />

    </div>
  );
}
