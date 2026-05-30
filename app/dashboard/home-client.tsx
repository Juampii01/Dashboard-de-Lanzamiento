"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, MessageCircle, X, FileText } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HomeClientProps {
  initialPoints: number;
  fullName: string;
  devMode: boolean;
  avatarUrl?: string | null;
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
  const LS_AVATAR_KEY = "govbidder_avatar_url_v1";
  const [points, setPoints] = useState(initial);
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl ?? null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  // localStorage fallback after mount
  useEffect(() => {
    if (!avatarUrl) {
      const stored = localStorage.getItem(LS_AVATAR_KEY);
      if (stored) setCurrentAvatar(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep in sync with uploads/deletions
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ url: string | null }>).detail?.url;
      if (url) { setCurrentAvatar(url); setAvatarLoaded(false); }
      else setCurrentAvatar(null);
    };
    window.addEventListener("avatar-updated", handler);
    return () => window.removeEventListener("avatar-updated", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ total?: number }>).detail;
      if (typeof detail?.total === "number") setPoints(detail.total);
    };
    window.addEventListener("xp-gained", handler);
    return () => window.removeEventListener("xp-gained", handler);
  }, []);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(20,58,107,0.8) 0%, rgba(10,37,64,0.9) 100%)",
        border: "1px solid rgba(255,214,10,0.25)",
        borderRadius: "14px",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        position: "relative",
        overflow: "hidden",
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
            borderTop: pos.startsWith("t") ? "2px solid rgba(255,214,10,0.4)" : "none",
            borderBottom: pos.startsWith("b") ? "2px solid rgba(255,214,10,0.4)" : "none",
            borderLeft: pos.endsWith("l") ? "2px solid rgba(255,214,10,0.4)" : "none",
            borderRight: pos.endsWith("r") ? "2px solid rgba(255,214,10,0.4)" : "none",
          }}
        />
      ))}

      {/* Avatar or trophy */}
      <div style={{ flexShrink: 0, position: "relative" }}>
        {currentAvatar ? (
          <div style={{
            width: "52px", height: "52px", borderRadius: "50%",
            overflow: "hidden", position: "relative",
            border: "2px solid rgba(255,214,10,0.5)",
            boxShadow: "0 0 16px rgba(255,214,10,0.25)",
          }}>
            <img
              key={currentAvatar}
              src={currentAvatar}
              alt=""
              onLoad={() => setAvatarLoaded(true)}
              onError={() => setCurrentAvatar(null)}
              style={{ width: "100%", height: "100%", objectFit: "cover",
                objectPosition: "center top",
                opacity: avatarLoaded ? 1 : 0, transition: "opacity 0.25s" }}
            />
            {!avatarLoaded && (
              <span style={{ position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🏆</span>
            )}
          </div>
        ) : (
          <div style={{ fontSize: "40px" }}>🏆</div>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "var(--font-arcade)",
          fontSize: "8px", fontWeight: 700,
          color: "#A8B5CC", letterSpacing: "0.1em",
          textTransform: "uppercase", marginBottom: "2px",
        }}>
          TUS PUNTOS ACUMULADOS
        </div>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: "36px", fontWeight: 900,
          color: "#FFD60A", letterSpacing: "-1px", lineHeight: 1,
        }}>
          {points.toLocaleString()}
        </div>
        <div style={{
          fontSize: "10px", color: "#5A6B85",
          fontWeight: 600, marginTop: "2px",
        }}>
          Seguí completando retos y viendo videos para subir en el ranking
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--font-arcade)",
          fontSize: "9px", fontWeight: 700,
          color: "#00D67A",
          background: "rgba(0,214,122,0.1)",
          border: "1px solid rgba(0,214,122,0.25)",
          borderRadius: "20px",
          padding: "4px 10px",
          flexShrink: 0,
          fontStyle: "italic",
        }}
      >
        puede tardar unos segundos
      </div>
    </div>
  );
}

function VideoTutorial() {
  const isPlaceholder = LOOM_VIDEO_ID === "REPLACE_WITH_LOOM_VIDEO_ID";

  return (
    <div>
      <div style={{ marginBottom: "12px" }}>
        <p style={{
          fontFamily: "var(--font-arcade)",
          fontSize: "8px", fontWeight: 700,
          color: "#5A6B85", textTransform: "uppercase",
          letterSpacing: "0.14em", marginBottom: "4px",
        }}>
          🎬 Tutorial
        </p>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "20px", fontWeight: 900,
          color: "#FFFFFF", lineHeight: 1.2,
        }}>
          Cómo usar el dashboard
        </h2>
        <p style={{ fontSize: "13px", color: "#A8B5CC", marginTop: "4px" }}>
          Mirá el tutorial completo antes de empezar los retos.
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
          /* Placeholder cuando no hay video configurado */
          <div
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "12px",
              background: "linear-gradient(135deg, #0D2E4D 0%, #060D1A 100%)",
            }}
          >
            <div style={{ fontSize: "48px" }}>🎬</div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#A8B5CC", fontSize: "14px", fontWeight: 600 }}>
                Video tutorial próximamente
              </p>
              <p style={{ color: "#5A6B85", fontSize: "12px", marginTop: "4px" }}>
                Reemplazá <code style={{ color: "#FFD60A" }}>LOOM_VIDEO_ID</code> en <code style={{ color: "#00D4FF" }}>home-client.tsx</code>
              </p>
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
      setContent("");
      toast.success("¡Comentario publicado!");
      load();
    } catch {
      toast.error("No se pudo publicar. Intentá de nuevo.");
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
          color: "#5A6B85", textTransform: "uppercase",
          letterSpacing: "0.14em", marginBottom: "4px",
        }}>
          💬 Comunidad
        </p>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "20px", fontWeight: 900,
          color: "#FFFFFF",
        }}>
          ¡Comentá qué te parece el programa aquí!
        </h2>
      </div>

      <div
        style={{
          background: "rgba(10,37,64,0.8)",
          border: "1px solid #1E3A5C",
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
              borderBottom: "1px solid #1E3A5C",
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  marginBottom: "6px",
                }}>
                  <MessageCircle style={{ width: "13px", height: "13px", color: "#5A6B85" }} />
                  <span style={{ fontSize: "11px", color: "#5A6B85", fontWeight: 600 }}>
                    Tu comentario
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribí tu opinión, duda o experiencia con el programa..."
                  maxLength={500}
                  rows={2}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid #1E3A5C",
                    borderRadius: "8px",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    padding: "8px 12px",
                    resize: "none",
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#00D4FF"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#1E3A5C"; }}
                />
                <p style={{ fontSize: "10px", color: "#3A5070", marginTop: "3px", textAlign: "right" }}>
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
                  color: content.trim() ? "#FFFFFF" : "#5A6B85",
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
              color: "#5A6B85", fontSize: "13px",
            }}>
              <MessageCircle style={{ width: "24px", height: "24px", margin: "0 auto 8px", opacity: 0.4 }} />
              <p style={{ color: "#A8B5CC", fontWeight: 600 }}>Sección de comentarios próximamente</p>
              <p style={{ fontSize: "11px", marginTop: "4px" }}>
                Ejecutá la migración SQL para activarla.
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div style={{
              padding: "32px 16px", textAlign: "center",
              color: "#5A6B85", fontSize: "13px",
            }}>
              <p style={{ color: "#A8B5CC", fontWeight: 600 }}>Sé el primero en comentar 👆</p>
              <p style={{ fontSize: "11px", marginTop: "4px", color: "#5A6B85" }}>
                Tu opinión ayuda a mejorar el programa.
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  display: "flex", gap: "10px", alignItems: "flex-start",
                }}
              >
                {/* Avatar circle */}
                <div
                  style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #143A6B 0%, #0A2540 100%)",
                    border: "1px solid #1E3A5C",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 700, color: "#A8B5CC",
                    flexShrink: 0,
                  }}
                >
                  {c.display_name.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#C8D6E8" }}>
                      {c.display_name}
                    </span>
                    <span style={{ fontSize: "10px", color: "#3A5070" }}>
                      {new Date(c.created_at).toLocaleDateString("es-AR", {
                        day: "numeric", month: "short",
                      })}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#A8B5CC", lineHeight: 1.5, margin: 0 }}>
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

function CertificateModal({ onClose }: { onClose: () => void }) {
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
        padding: "16px", backdropFilter: "blur(4px)",
      }}
    >
      <div style={{
        background: "#FFFFFF", borderRadius: "8px",
        maxWidth: "520px", width: "100%",
        fontFamily: "Times New Roman, serif",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}>
        {/* Header bar */}
        <div style={{
          background: "#1a365d", padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ color: "#FFFFFF", fontSize: "12px", fontWeight: 700, fontFamily: "sans-serif", letterSpacing: "0.05em" }}>
            📜 CERTIFICADO DE PARTICIPACIÓN — GOVBIDDER CHALLENGE
          </span>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "4px", padding: "4px 6px", color: "#FFFFFF", cursor: "pointer" }}
          >
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        </div>

        {/* Certificate body */}
        <div style={{ padding: "32px 40px", color: "#1a1a1a", lineHeight: 1.6 }}>
          {/* Seal */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", border: "3px solid #1a365d", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: "28px" }}>🦅</div>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "#1a365d", textTransform: "uppercase" }}>Govbidder Academy</p>
          </div>

          {/* Title */}
          <h1 style={{ textAlign: "center", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "2px solid #1a365d", borderBottom: "2px solid #1a365d", padding: "10px 0", margin: "0 0 24px", color: "#1a365d" }}>
            Certificado de Participación
          </h1>

          {/* Content */}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "12px", color: "#666" }}>Este certificado se otorga a</p>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "#1a365d", letterSpacing: "0.05em" }}>[Tu nombre completo]</p>
            <p style={{ fontSize: "12px", color: "#666" }}>por su participación en el programa</p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#D7263D" }}>Govbidder Challenge</p>
            <p style={{ fontSize: "11px", color: "#666" }}>Programa de capacitación en contratos gubernamentales</p>

            {/* Day badges */}
            <div style={{ display: "flex", justifyContent: "center", gap: "16px", margin: "8px 0" }}>
              {[1,2,3,4].map(d => (
                <div key={d} style={{ textAlign: "center" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid #1a365d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#1a365d", margin: "0 auto 3px" }}>D{d}</div>
                  <span style={{ fontSize: "8px", color: "#999" }}>Reto</span>
                </div>
              ))}
            </div>

            {/* Signature */}
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ height: "1px", width: "120px", background: "#1a1a1a", margin: "0 auto 4px" }} />
                <p style={{ fontSize: "9px", color: "#666" }}>Govbidder Academy · Director</p>
              </div>
            </div>
          </div>

          {/* BOCETO notice */}
          <div style={{ marginTop: "20px", padding: "10px 14px", background: "#FFF3CD", border: "1px solid #FFD60A", borderRadius: "6px", textAlign: "center" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#856404", margin: 0 }}>
              ⚠️ Este certificado será entregado al finalizar el challenge. Completá los 4 días para recibirlo.
            </p>
          </div>

          {/* Watermark BOCETO */}
          <p style={{ textAlign: "center", marginTop: "12px", fontSize: "9px", color: "#CCC", textTransform: "uppercase", letterSpacing: "0.2em", fontStyle: "italic" }}>
            Vista previa — Boceto
          </p>
        </div>
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
              display: "inline-block",
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
            Consultá siempre el SOW original y las regulaciones FAR antes de firmar.
          </p>
        </div>
      </div>
    </div>
  );
}

function ContractModels() {
  const [selected, setSelected] = useState<string | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const selectedNiche = NICHES.find((n) => n.id === selected) ?? null;

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <p style={{
          fontFamily: "var(--font-arcade)",
          fontSize: "8px", fontWeight: 700,
          color: "#5A6B85", textTransform: "uppercase",
          letterSpacing: "0.14em", marginBottom: "4px",
        }}>
          🏆 Contratos Reales
        </p>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "22px", fontWeight: 900,
          color: "#FFFFFF",
        }}>
          ¡Mirá contratos gubernamentales ganados!
        </h2>
        <p style={{ fontSize: "13px", color: "#A8B5CC", marginTop: "4px" }}>
          Estos son contratos reales adjudicados a pequeñas empresas como la tuya. Seleccioná tu sector.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "8px",
        }}
      >
        {NICHES.map((niche) => (
          <button
            key={niche.id}
            onClick={() => setSelected(niche.id)}
            style={{
              background: "rgba(20,58,107,0.5)",
              border: "1px solid #1E3A5C",
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
              el.style.borderColor = "rgba(215,38,61,0.4)";
              el.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = "rgba(20,58,107,0.5)";
              el.style.borderColor = "#1E3A5C";
              el.style.transform = "none";
            }}
          >
            <span style={{ fontSize: "22px", flexShrink: 0 }}>{niche.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: "12px", fontWeight: 700,
                color: "#FFFFFF", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {niche.label}
              </div>
              <div style={{ fontSize: "9px", color: "#5A6B85", fontFamily: "var(--font-mono)" }}>
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
          border: "1.5px solid rgba(255,214,10,0.35)",
          background: "rgba(255,214,10,0.06)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          transition: "all 0.15s",
          color: "#FFD60A",
          fontSize: "13px", fontWeight: 700,
          fontFamily: "var(--font-display)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "rgba(255,214,10,0.12)";
          el.style.borderColor = "rgba(255,214,10,0.6)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "rgba(255,214,10,0.06)";
          el.style.borderColor = "rgba(255,214,10,0.35)";
        }}
      >
        <span style={{ fontSize: "18px" }}>📜</span>
        Ver Certificado de Participación
        <span style={{ fontSize: "11px", color: "#A8B5CC", fontWeight: 400, fontFamily: "var(--font-sans)" }}>
          — boceto
        </span>
      </button>

      {selectedNiche && (
        <ContractModal niche={selectedNiche} onClose={() => setSelected(null)} />
      )}
      {certOpen && <CertificateModal onClose={() => setCertOpen(false)} />}
    </div>
  );
}

// ─── LeaderboardHome ─────────────────────────────────────────────────────────

interface LeaderEntry {
  rank: number;
  display_name: string;
  total_points: number;
  raffle_entries: number;
  is_current_user: boolean;
}

interface LeaderboardData {
  top:     LeaderEntry[];
  me:      Omit<LeaderEntry, "is_current_user"> | null;
  my_rank: number | null;
  in_top:  boolean;
  total:   number;
}

const TOP_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

function HomePrizeBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span style={{
        fontSize: "8px", fontWeight: 700,
        color: "#FFD60A",
        background: "rgba(255,214,10,0.12)",
        border: "1px solid rgba(255,214,10,0.3)",
        borderRadius: "4px", padding: "1px 4px",
        whiteSpace: "nowrap", fontFamily: "var(--font-mono)", flexShrink: 0,
      }}>🥇 $12K</span>
    );
  }
  if (rank === 2) {
    return (
      <span style={{
        fontSize: "8px", fontWeight: 700,
        color: "#C0C0C0",
        background: "rgba(192,192,192,0.08)",
        border: "1px solid rgba(192,192,192,0.25)",
        borderRadius: "4px", padding: "1px 4px",
        whiteSpace: "nowrap", fontFamily: "var(--font-mono)", flexShrink: 0,
      }}>🥈 Premio</span>
    );
  }
  if (rank >= 3 && rank <= 12) {
    return (
      <span style={{
        fontSize: "8px", fontWeight: 700,
        color: "#00D67A",
        background: "rgba(0,214,122,0.06)",
        border: "1px solid rgba(0,214,122,0.2)",
        borderRadius: "4px", padding: "1px 4px",
        whiteSpace: "nowrap", fontFamily: "var(--font-mono)", flexShrink: 0,
      }}>🏆 Premio</span>
    );
  }
  return null;
}

function LeaderboardHome() {
  const [board, setBoard]     = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/leaderboard");
      const data = await res.json() as LeaderboardData;
      setBoard(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();


  }, [load]);

  const top     = (board?.top ?? []).slice(0, 12);
  const me      = board?.me ?? null;
  const inTop   = board?.in_top ?? true;
  const myRank  = board?.my_rank ?? null;
  const total   = board?.total ?? 0;
  const meEntry: LeaderEntry | null = me ? { ...me, rank: me.rank, is_current_user: true } : null;

  return (
    <div
      data-tour-id="leaderboard"
      style={{
        background: "linear-gradient(135deg, rgba(20,58,107,0.88) 0%, rgba(10,37,64,0.92) 100%)",
        border: "1px solid rgba(255,214,10,0.2)",
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,214,10,0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>🏆</span>
          <span style={{
            fontFamily: "var(--font-arcade)", fontSize: "9px",
            fontWeight: 700, color: "#FFD60A",
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            Tabla de líderes
          </span>
          {total > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#3A5070" }}>
              {total} participante{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00D67A", display: "inline-block" }} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "9px", color: "#5A6B85", fontStyle: "italic" }}>puede tardar unos segundos</span>
        </div>
      </div>

      {/* Rows */}
      <div>
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 16px" }}>
            <div className="skeleton" style={{ width: "28px", height: "10px", borderRadius: "4px" }} />
            <div className="skeleton" style={{ flex: 1, height: "10px", borderRadius: "4px" }} />
            <div className="skeleton" style={{ width: "40px", height: "10px", borderRadius: "4px" }} />
          </div>
        ))}

        {!loading && top.length === 0 && (
          <p style={{ textAlign: "center", padding: "24px 16px", fontSize: "13px", color: "#5A6B85" }}>
            Aún no hay participantes. ¡Sé el primero!
          </p>
        )}

        {!loading && top.map((entry) => {
          const color = TOP_COLORS[entry.rank] ?? "#5A6B85";
          const isTop3 = entry.rank <= 3;
          return (
            <div
              key={entry.rank}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "6px 16px",
                background: entry.is_current_user ? "rgba(255,214,10,0.07)" : undefined,
                borderLeft: entry.is_current_user ? "3px solid #FFD60A" : "3px solid transparent",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                height: "36px",
              }}
            >
              <span style={{
                width: "28px", textAlign: "center", flexShrink: 0,
                fontFamily: "var(--font-arcade)",
                fontSize: isTop3 ? "11px" : "9px",
                color,
                textShadow: isTop3 ? `0 0 8px ${color}80` : "none",
              }}>
                #{entry.rank}
              </span>
              <span style={{
                flex: 1, fontSize: "12px",
                color: entry.is_current_user ? "#FFD60A" : "#C8D6E8",
                fontWeight: entry.is_current_user ? 700 : 400,
                fontFamily: "var(--font-sans)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {entry.display_name}
                {entry.is_current_user && <span style={{ marginLeft: "6px", fontSize: "9px", opacity: 0.6 }}>(vos)</span>}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <HomePrizeBadge rank={entry.rank} />
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "11px",
                  fontWeight: 700, color: isTop3 ? color : "#A8B5CC",
                }}>
                  {entry.total_points} pts
                </span>
              </div>
            </div>
          );
        })}

        {/* Divider + user row if outside top 12 */}
        {!loading && !inTop && meEntry && (
          <>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "6px", background: "rgba(0,0,0,0.2)",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#3A5070", letterSpacing: "0.3em" }}>
                • • •
              </span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "6px 16px",
              background: "rgba(255,214,10,0.07)",
              borderLeft: "3px solid #FFD60A",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              height: "36px",
            }}>
              <span style={{
                width: "28px", textAlign: "center", flexShrink: 0,
                fontFamily: "var(--font-arcade)", fontSize: "9px", color: "#5A6B85",
              }}>
                #{meEntry.rank}
              </span>
              <span style={{
                flex: 1, fontSize: "12px", fontWeight: 700,
                color: "#FFD60A", fontFamily: "var(--font-sans)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {meEntry.display_name}
                <span style={{ marginLeft: "6px", fontSize: "9px", opacity: 0.6 }}>(vos)</span>
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#A8B5CC" }}>
                {meEntry.total_points} pts
              </span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
        {!loading && !inTop && myRank && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#5A6B85", marginBottom: "2px" }}>
            Tu posición actual: #{myRank} de {total}
          </p>
        )}
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#3A5070" }}>
          Los mejores ranqueados al final del challenge ganan premios reales · Se actualiza cada 60s
        </p>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function HomeClient({ initialPoints, devMode, avatarUrl }: HomeClientProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
      {/* 1. Points card */}
      {!devMode && <PointsCard initial={initialPoints} avatarUrl={avatarUrl} />}

      {/* 2. Loom tutorial video */}
      <VideoTutorial />

      {/* 3. Comments */}
      {!devMode && <CommentsSection />}

      {/* 4. Contract models */}
      <ContractModels />

      {/* 5. Leaderboard */}
      {!devMode && (
        <div>
          <div style={{ marginBottom: "12px" }}>
            <p style={{
              fontFamily: "var(--font-arcade)",
              fontSize: "8px", fontWeight: 700,
              color: "#5A6B85", textTransform: "uppercase",
              letterSpacing: "0.14em", marginBottom: "4px",
            }}>
              🏆 Ranking
            </p>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "20px", fontWeight: 900,
              color: "#FFFFFF",
            }}>
              Ranking de premios
            </h2>
          </div>
          <LeaderboardHome />
        </div>
      )}
    </div>
  );
}
