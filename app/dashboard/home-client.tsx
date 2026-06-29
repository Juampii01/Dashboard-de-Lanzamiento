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
}

interface Comment {
  id: string;
  display_name: string;
  content: string;
  created_at: string;
}

interface Niche {
  id: string;
  label: string;
  icon: string;
  naics: string;
  contractTitle: string;
  agency: string;
  contractNo: string;
  scopeItems: string[];
  value: string;
  period: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Replace this with your real Loom video ID (the part after loom.com/share/)
const LOOM_VIDEO_ID = "REPLACE_WITH_LOOM_VIDEO_ID";

const NICHES: Niche[] = [
  {
    id: "cleaning",
    label: "Limpieza",
    icon: "🧹",
    naics: "561720",
    contractTitle: "Contract for Janitorial & Building Maintenance Services",
    agency: "General Services Administration",
    contractNo: "GS-07F-0012X",
    scopeItems: [
      "Daily cleaning of office spaces, restrooms, and common areas",
      "Weekly deep-cleaning of carpets, windows, and high-touch surfaces",
      "Monthly restocking of cleaning supplies (contractor-furnished)",
      "Emergency cleanup response within 4 hours of notification",
    ],
    value: "$184,500 / year",
    period: "12 months + 4 option years",
  },
  {
    id: "construction",
    label: "Construcción",
    icon: "🏗️",
    naics: "236220",
    contractTitle: "Contract for Building Renovation & Construction Services",
    agency: "Department of Veterans Affairs",
    contractNo: "VA101-24-C-0087",
    scopeItems: [
      "Renovation of existing federal building spaces per SOW",
      "Construction of new office partitions and accessibility upgrades",
      "ADA compliance modifications throughout the facility",
      "All materials, labor, permits, and inspections included",
    ],
    value: "$2,350,000",
    period: "18 months",
  },
  {
    id: "it",
    label: "IT y Ciberseguridad",
    icon: "💻",
    naics: "541512",
    contractTitle: "Contract for IT Support & Cybersecurity Services",
    agency: "Department of Homeland Security",
    contractNo: "HSHQDC-24-T-00033",
    scopeItems: [
      "24/7 help desk support for all government personnel",
      "Network security monitoring, threat detection, and incident response",
      "Monthly FISMA-compliance audits and reporting",
      "Cloud migration, management, and zero-trust architecture",
    ],
    value: "$920,000 / year",
    period: "Base year + 4 option years",
  },
  {
    id: "landscaping",
    label: "Áreas Verdes",
    icon: "🌿",
    naics: "561730",
    contractTitle: "Contract for Grounds Maintenance Services",
    agency: "National Park Service",
    contractNo: "P24PC00144",
    scopeItems: [
      "Weekly mowing, edging, trimming, and leaf removal",
      "Seasonal planting, mulching, and irrigation management",
      "Irrigation system maintenance and leak repairs",
      "Snow and ice removal during winter months",
    ],
    value: "$67,200 / year",
    period: "12 months + 2 option years",
  },
  {
    id: "security",
    label: "Seguridad",
    icon: "🔒",
    naics: "561612",
    contractTitle: "Contract for Physical Security Guard Services",
    agency: "Social Security Administration",
    contractNo: "SSA-RFQ-2024-0431",
    scopeItems: [
      "Armed and unarmed security personnel (FLETC-trained preferred)",
      "24/7 on-site security coverage, 365 days per year",
      "Access control management and visitor credentialing",
      "Monthly incident reports submitted to Contracting Officer",
    ],
    value: "$410,000 / year",
    period: "12 months + 4 option years",
  },
  {
    id: "supplies",
    label: "Suministros",
    icon: "📦",
    naics: "453210",
    contractTitle: "Contract for Office Supplies & Consumables",
    agency: "Department of Education",
    contractNo: "ED-IDIQ-2024-OSC",
    scopeItems: [
      "Just-in-time delivery of all office supplies within 48 hours",
      "Toner cartridges, paper, and printing consumables",
      "Furniture procurement and white-glove installation",
      "Quarterly inventory reporting and spend analysis",
    ],
    value: "$155,000 IDIQ",
    period: "Indefinite Delivery, 3 years",
  },
  {
    id: "healthcare",
    label: "Personal de Salud",
    icon: "🏥",
    naics: "621111",
    contractTitle: "Contract for Healthcare Staffing Services",
    agency: "Department of Veterans Affairs",
    contractNo: "VA-36C-2024-4391",
    scopeItems: [
      "Registered Nurses, LPNs, and Certified Medical Assistants",
      "Per diem, temp-to-perm, and direct placement options",
      "Full background checks, credentialing, and licensing verification",
      "30-day satisfaction guarantee and free replacement",
    ],
    value: "$780,000 / year",
    period: "Base year + 2 option years",
  },
  {
    id: "transport",
    label: "Transporte",
    icon: "🚛",
    naics: "484121",
    contractTitle: "Contract for Freight Transportation & Logistics",
    agency: "USDA Agricultural Research Service",
    contractNo: "12-3A94-24-B-0014",
    scopeItems: [
      "Long-haul freight for federal materials and equipment",
      "Last-mile delivery to federal facilities nationwide",
      "GPS tracking, chain-of-custody, and real-time reporting",
      "Hazmat-certified drivers and TWIC-card holders on staff",
    ],
    value: "$340,000 / year",
    period: "12 months + 3 option years",
  },
  {
    id: "food",
    label: "Alimentación",
    icon: "🍽️",
    naics: "722310",
    contractTitle: "Contract for Food & Cafeteria Services",
    agency: "Department of Defense",
    contractNo: "W91248-24-D-0055",
    scopeItems: [
      "Daily cafeteria operations for up to 600 personnel",
      "Special event catering and VIP dining services",
      "USDA-compliant menu planning and allergen management",
      "Monthly nutritional analysis reports to facility manager",
    ],
    value: "$1,200,000 / year",
    period: "Base + 4 option years",
  },
  {
    id: "hvac",
    label: "HVAC",
    icon: "⚙️",
    naics: "238220",
    contractTitle: "Contract for HVAC Maintenance & Repair Services",
    agency: "General Services Administration",
    contractNo: "GS-P-2024-HVAC-088",
    scopeItems: [
      "Preventive maintenance on all HVAC units (bi-monthly)",
      "Emergency repair response within 2 hours, 24/7/365",
      "Energy efficiency audits and optimization reporting",
      "Parts and labor warranty: 2 years on all completed work",
    ],
    value: "$225,000 / year",
    period: "12 months + 4 option years",
  },
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
                Grabación {i + 1}
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

function VideoTutorial() {
  const isPlaceholder = LOOM_VIDEO_ID === "REPLACE_WITH_LOOM_VIDEO_ID";

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
          /* Placeholder cuando no hay video configurado — poster con imagen */
          <div style={{ position: "absolute", inset: 0 }}>
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
                letterSpacing: "0.1em", textTransform: "uppercase", color: "#fff",
                background: "rgba(228,45,44,0.92)", border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: "999px", padding: "5px 14px",
              }}>
                ▶ Ver tutorial
              </span>
            </div>
          </div>
        ) : (
          <iframe
            src={`https://www.loom.com/embed/${LOOM_VIDEO_ID}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`}
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%",
              border: "none",
            }}
            allowFullScreen
            title="Tutorial del dashboard"
          />
        )}
      </div>
    </div>
  );
}

// ─── Comments ─────────────────────────────────────────────────────────────────

function CommentsSection() {
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
                    +500 pts · primeras 3 veces
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

function ContractModal({ niche, onClose }: { niche: Niche; onClose: () => void }) {
  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 99990,
        background: "rgba(6,13,26,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "8px",
          maxWidth: "640px", width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          fontFamily: "Times New Roman, serif",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            background: "#1a365d",
            padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText style={{ width: "16px", height: "16px", color: "#FFFFFF", flexShrink: 0 }} />
            <span style={{ color: "#FFFFFF", fontSize: "12px", fontWeight: 700, fontFamily: "sans-serif", letterSpacing: "0.05em" }}>
              CONTRATO FEDERAL ADJUDICADO — {niche.icon} {niche.label.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: "4px", padding: "4px 6px",
              color: "#FFFFFF", cursor: "pointer",
              display: "flex", alignItems: "center",
            }}
          >
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        </div>

        {/* Contract document body */}
        <div style={{ padding: "32px 40px", color: "#1a1a1a", lineHeight: 1.6 }}>
          {/* Seal placeholder */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{
              width: "64px", height: "64px",
              borderRadius: "50%",
              border: "3px solid #1a365d",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 8px",
              fontSize: "28px",
            }}>
              🦅
            </div>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "#1a365d", textTransform: "uppercase" }}>
              United States Federal Government
            </p>
          </div>

          {/* Title */}
          <h1 style={{
            textAlign: "center", fontSize: "15px", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            borderTop: "2px solid #1a365d", borderBottom: "2px solid #1a365d",
            padding: "10px 0", margin: "0 0 24px",
            color: "#1a365d",
          }}>
            {niche.contractTitle}
          </h1>

          {/* Header info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "24px", fontSize: "12px" }}>
            <div>
              <strong>Contracting Agency:</strong><br />
              {niche.agency}
            </div>
            <div>
              <strong>Contract No.:</strong><br />
              <span style={{ fontFamily: "monospace" }}>{niche.contractNo}</span>
            </div>
            <div>
              <strong>NAICS Code:</strong><br />
              {niche.naics}
            </div>
            <div>
              <strong>Contract Value:</strong><br />
              <strong style={{ color: "#1a365d" }}>{niche.value}</strong>
            </div>
            <div>
              <strong>Period of Performance:</strong><br />
              {niche.period}
            </div>
            <div>
              <strong>Set-Aside:</strong><br />
              Small Business (FAR 19.502-2)
            </div>
          </div>

          {/* Parties */}
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", borderBottom: "1px solid #ddd", paddingBottom: "4px" }}>
              1. PARTIES
            </p>
            <p style={{ fontSize: "12px", marginBottom: "6px" }}>
              <strong>Government (Buyer):</strong> {niche.agency}, Washington, D.C.
            </p>
            <p style={{ fontSize: "12px" }}>
              <strong>Contractor:</strong> [Your Company Name], [City, State] · EIN: XX-XXXXXXX · UEI: XXXXXXXXXXXX
            </p>
          </div>

          {/* Scope */}
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", borderBottom: "1px solid #ddd", paddingBottom: "4px" }}>
              2. SCOPE OF WORK
            </p>
            <p style={{ fontSize: "12px", marginBottom: "10px" }}>
              The Contractor shall provide all labor, materials, equipment, and supervision necessary to perform the following services:
            </p>
            <ol style={{ fontSize: "12px", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {niche.scopeItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>

          {/* Key clauses */}
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", borderBottom: "1px solid #ddd", paddingBottom: "4px" }}>
              3. KEY CONTRACT CLAUSES
            </p>
            <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <p>• FAR 52.212-4 — Contract Terms and Conditions — Commercial Items</p>
              <p>• FAR 52.222-26 — Equal Opportunity</p>
              <p>• FAR 52.228-5 — Insurance — Work on a Government Installation</p>
              <p>• FAR 52.232-33 — Payment by Electronic Funds Transfer</p>
            </div>
          </div>

          {/* Signature block */}
          <div style={{
            marginTop: "28px",
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "24px", fontSize: "11px",
          }}>
            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "6px" }}>
              <p style={{ fontWeight: 700 }}>Contracting Officer Signature</p>
              <p style={{ color: "#666", marginTop: "20px" }}>Name: _______________________</p>
              <p style={{ color: "#666" }}>Title: Contracting Officer</p>
              <p style={{ color: "#666" }}>Date: _______________________</p>
            </div>
            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "6px" }}>
              <p style={{ fontWeight: 700 }}>Contractor Signature</p>
              <p style={{ color: "#666", marginTop: "20px" }}>Name: _______________________</p>
              <p style={{ color: "#666" }}>Title: _______________________</p>
              <p style={{ color: "#666" }}>Date: _______________________</p>
            </div>
          </div>

          {/* Footer note */}
          <p style={{
            marginTop: "24px", fontSize: "9px", color: "#999",
            textAlign: "center", fontStyle: "italic",
            borderTop: "1px solid #eee", paddingTop: "12px",
          }}>
            Este es un ejemplo de contrato adjudicado real, simplificado con fines educativos. Los términos varían por agencia y solicitud.
            Consulta siempre el SOW original y las regulaciones FAR antes de firmar.
          </p>
        </div>
      </div>
    </div>
  );
}

function ContractModels({ fullName }: { fullName?: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const selectedNiche = NICHES.find((n) => n.id === selected) ?? null;

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
          Estos son contratos reales adjudicados a pequeñas empresas como la tuya. Selecciona tu sector.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "8px",
        }}
      >
        {NICHES.map((niche) => (
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
                NAICS {niche.naics}
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

export function HomeClient({ initialPoints, devMode, avatarUrl, fullName, recordings }: HomeClientProps) {
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
      <VideoTutorial />

      {/* 3. Comments */}
      {!devMode && <CommentsSection />}

      {/* 4. Contract models */}
      <ContractModels fullName={fullName} />

    </div>
  );
}
