import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { ChallengeRoadmap } from "./ChallengeRoadmap";

Font.registerHyphenationCallback((word) => [word]);

const NAVY      = "#1a2a6c";
const NAVY_DARK = "#0f1e3d";
const GOLD      = "#c9a227";
const INK       = "#2b3444";
const MUTED     = "#6b7280";
const LIGHT     = "#f4f6fa";
const LINE      = "#e2e6ee";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#FFFFFF", fontSize: 8, color: INK, paddingBottom: 0 },

  // ── Header ──
  header: { backgroundColor: NAVY, paddingTop: 18, paddingBottom: 14, paddingHorizontal: 34 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logoBox: { width: 40, height: 40, objectFit: "contain", borderRadius: 5, backgroundColor: "#fff", padding: 3 },
  companyName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#FFFFFF", lineHeight: 1.12 },
  tagline: { fontSize: 7.5, color: GOLD, marginTop: 3, letterSpacing: 0.4 },
  docBadge: {
    borderLeft: `2 solid ${GOLD}`, paddingLeft: 9,
  },
  docKicker: { fontSize: 6.5, color: "rgba(255,255,255,0.55)", letterSpacing: 1.6, textTransform: "uppercase" },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 1, textAlign: "right", marginTop: 2 },
  goldBar: { backgroundColor: GOLD, height: 3 },

  // ── Stats band ──
  statsBand: { flexDirection: "row", backgroundColor: LIGHT, marginHorizontal: 34, marginTop: 14, borderRadius: 7, paddingVertical: 11, border: `0.5 solid ${LINE}` },
  statItem: { flex: 1, alignItems: "center", borderRight: `0.5 solid ${LINE}`, paddingHorizontal: 4 },
  statItemLast: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  statNum: { fontSize: 17, fontFamily: "Helvetica-Bold", color: NAVY },
  statNumGold: { fontSize: 15, fontFamily: "Helvetica-Bold", color: GOLD },
  statLabel: { fontSize: 6, color: MUTED, letterSpacing: 0.6, marginTop: 3, textTransform: "uppercase" },

  // ── Body ──
  body: { flexDirection: "row", paddingHorizontal: 34, paddingTop: 16, gap: 18 },
  leftCol: { width: "57%" },
  rightCol: { width: "43%" },

  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase",
    letterSpacing: 1.1, marginBottom: 4,
  },
  sectionRule: { borderBottom: `1.5 solid ${GOLD}`, marginBottom: 8, width: 26 },
  bodyText: { fontSize: 8, color: INK, lineHeight: 1.5 },

  // ── Profile block ──
  fieldLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  insightBox: { backgroundColor: LIGHT, borderRadius: 5, borderLeft: `2.5 solid ${GOLD}`, paddingVertical: 8, paddingHorizontal: 9, marginBottom: 10 },
  insightText: { fontSize: 8, color: INK, lineHeight: 1.5 },

  // ── NAICS hero (right col) ──
  naicsCard: { backgroundColor: NAVY, borderRadius: 8, paddingTop: 11, paddingBottom: 11, paddingHorizontal: 12, marginBottom: 13 },
  naicsCardTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.7)", textAlign: "center", letterSpacing: 1.4, marginBottom: 7 },
  naicsCode: { fontSize: 30, fontFamily: "Helvetica-Bold", color: GOLD, textAlign: "center", letterSpacing: 1 },
  naicsUnderline: { height: 2, width: 34, backgroundColor: GOLD, alignSelf: "center", marginTop: 5, marginBottom: 6, borderRadius: 2 },
  naicsDesc: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF", textAlign: "center", lineHeight: 1.4 },
  naicsReason: { fontSize: 6.8, color: "rgba(255,255,255,0.62)", textAlign: "center", marginTop: 6, lineHeight: 1.45 },

  // ── Next steps ──
  stepRow: { flexDirection: "row", marginBottom: 7, alignItems: "flex-start" },
  stepNum: { width: 15, height: 15, borderRadius: 7.5, backgroundColor: GOLD, alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 0.5, flexShrink: 0 },
  stepNumText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY_DARK },
  stepText: { fontSize: 8, color: INK, lineHeight: 1.4, flex: 1 },

  // ── Roadmap strip ──
  roadmap: { marginHorizontal: 34, marginTop: 4, marginBottom: 14, backgroundColor: LIGHT, borderRadius: 7, border: `0.5 solid ${LINE}`, paddingVertical: 11, paddingHorizontal: 14 },
  roadmapTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 9, textAlign: "center" },
  roadRow: { flexDirection: "row", justifyContent: "space-between" },
  roadNode: { flex: 1, alignItems: "center", paddingHorizontal: 3 },
  roadDot: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  roadDotText: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  roadDay: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 0.5, textTransform: "uppercase" },
  roadLabel: { fontSize: 6.5, color: MUTED, textAlign: "center", marginTop: 2, lineHeight: 1.3 },

  // ── Footer ──
  footer: {
    backgroundColor: NAVY_DARK, paddingVertical: 9, paddingHorizontal: 34,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  footerLeft: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 0.6 },
  footerRight: { fontSize: 7.5, color: GOLD, textAlign: "right" },
});

interface Day1PDFProps {
  companyName: string;
  yearFounded?: number | null;
  employeeCount?: number | null;
  niche?: string | null;
  problemSolved?: string | null;
  targetAvatar?: string | null;
  primaryNaics?: string | null;
  naicsDescription?: string;
  naicsReasoning?: string;
  generatedAt: string;
  logoDataUri?: string | null;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.insightBox}>
        <Text style={styles.insightText}>{value}</Text>
      </View>
    </View>
  );
}

export function Day1AnalysisPDF({
  companyName,
  yearFounded,
  employeeCount,
  niche,
  problemSolved,
  targetAvatar,
  primaryNaics,
  naicsDescription,
  naicsReasoning,
  generatedAt,
  logoDataUri,
}: Day1PDFProps) {
  const hasProfile = niche || problemSolved || targetAvatar;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 11, maxWidth: "66%" }}>
              {logoDataUri ? <Image src={logoDataUri} style={styles.logoBox} /> : null}
              <View>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.tagline}>GovBidder Challenge · Perfil Estratégico</Text>
              </View>
            </View>
            <View style={styles.docBadge}>
              <Text style={styles.docKicker}>Strategic Profile</Text>
              <Text style={styles.docTitle}>DÍA 1</Text>
            </View>
          </View>
        </View>
        <View style={styles.goldBar} />

        {/* ── Stats band ── */}
        <View style={styles.statsBand}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{yearFounded ? `'${String(yearFounded).slice(2)}` : "—"}</Text>
            <Text style={styles.statLabel}>Fundada</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{employeeCount ?? "—"}</Text>
            <Text style={styles.statLabel}>Equipo</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{primaryNaics ? "1" : "—"}</Text>
            <Text style={styles.statLabel}>Código NAICS</Text>
          </View>
          <View style={styles.statItemLast}>
            <Text style={styles.statNumGold}>SAM.gov</Text>
            <Text style={styles.statLabel}>Próximo registro</Text>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          {/* LEFT — Business profile */}
          <View style={styles.leftCol}>
            <View style={styles.section}>
              <SectionTitle>Perfil del Negocio</SectionTitle>
              {niche ? <Field label="Qué vendés / hacés" value={niche} /> : null}
              {problemSolved ? <Field label="Problema que resolvés" value={problemSolved} /> : null}
              {targetAvatar ? <Field label="Cliente objetivo" value={targetAvatar} /> : null}
              {!hasProfile ? (
                <View style={styles.insightBox}>
                  <Text style={[styles.insightText, { color: MUTED }]}>
                    Completá tu perfil en el Día 1 para ver acá tu resumen estratégico.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* RIGHT — NAICS hero + next steps */}
          <View style={styles.rightCol}>
            {primaryNaics ? (
              <View style={styles.naicsCard}>
                <Text style={styles.naicsCardTitle}>CÓDIGO NAICS PRINCIPAL</Text>
                <Text style={styles.naicsCode}>{primaryNaics}</Text>
                <View style={styles.naicsUnderline} />
                {naicsDescription ? <Text style={styles.naicsDesc}>{naicsDescription}</Text> : null}
                {naicsReasoning ? <Text style={styles.naicsReason}>{naicsReasoning}</Text> : null}
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionTitle>Próximos Pasos</SectionTitle>
              {[
                "Registrate en SAM.gov con tu código NAICS",
                "Completá tu Capability Statement (Día 4)",
                "Buscá contratos activos en USASpending.gov",
                "Mapeá códigos relacionados en el Día 2",
              ].map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Spacer pushes roadmap + footer to the bottom */}
        <View style={{ flexGrow: 1 }} />

        {/* ── Roadmap strip — Día 1 hecho ── */}
        <ChallengeRoadmap currentDay={1} />

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerLeft}>GOVBIDDER CHALLENGE</Text>
          <Text style={styles.footerRight}>Generado el {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
