import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

const NAVY      = "#1a2a6c";
const NAVY_DARK = "#0f1e3d";
const GOLD      = "#c9a227";
const INK       = "#2b3444";
const MUTED     = "#6b7280";
const LIGHT     = "#f4f6fa";
const LINE      = "#e2e6ee";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#FFFFFF", fontSize: 8, color: INK },

  // ── Header ──
  header: { backgroundColor: NAVY, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 34 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  companyName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#FFFFFF", maxWidth: "66%", lineHeight: 1.12 },
  docTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 1.5, textAlign: "right", lineHeight: 1.4 },
  tagline: { fontSize: 8, color: GOLD, marginTop: 3, fontStyle: "italic" },
  goldBar: { backgroundColor: GOLD, height: 3 },

  // ── Stats band ──
  statsBand: { flexDirection: "row", backgroundColor: LIGHT, marginHorizontal: 34, marginTop: 14, borderRadius: 6, paddingVertical: 10, border: `0.5 solid ${LINE}` },
  statItem: { flex: 1, alignItems: "center", borderRight: `0.5 solid ${LINE}` },
  statItemLast: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY },
  statLabel: { fontSize: 6.5, color: MUTED, letterSpacing: 0.5, marginTop: 2, textTransform: "uppercase" },

  // ── Body ──
  body: { flexDirection: "row", paddingHorizontal: 34, paddingTop: 14, paddingBottom: 8, gap: 18, flex: 1 },
  leftCol: { width: "60%" },
  rightCol: { width: "40%" },

  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase",
    letterSpacing: 1, marginBottom: 4,
  },
  sectionRule: { borderBottom: `1.5 solid ${GOLD}`, marginBottom: 6, width: 28 },
  bodyText: { fontSize: 8, color: INK, lineHeight: 1.5 },

  // ── Data rows ──
  dataRow: { flexDirection: "row", marginBottom: 4, borderBottom: `0.5 solid ${LINE}`, paddingBottom: 3.5 },
  dataLabel: { width: "38%", fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 0.3 },
  dataValue: { width: "62%", fontSize: 7.5, color: INK },

  // ── NAICS card (right col) ──
  dataCard: { backgroundColor: NAVY, borderRadius: 6, paddingTop: 10, paddingBottom: 8, paddingHorizontal: 12, marginBottom: 12 },
  dataCardTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF", textAlign: "center", letterSpacing: 1, marginBottom: 9 },
  naicsCode: { fontSize: 28, fontFamily: "Helvetica-Bold", color: GOLD, textAlign: "center", letterSpacing: 1 },
  naicsDesc: { fontSize: 7.5, color: "#FFFFFF", textAlign: "center", marginTop: 4, lineHeight: 1.4 },
  naicsReason: { fontSize: 6.5, color: "rgba(255,255,255,0.6)", textAlign: "center", marginTop: 6, fontStyle: "italic", lineHeight: 1.4 },

  // ── Insight box ──
  insightBox: { backgroundColor: LIGHT, borderRadius: 4, borderLeft: `2.5 solid ${GOLD}`, padding: 8, marginTop: 2 },
  insightText: { fontSize: 7.6, color: INK, lineHeight: 1.45 },

  // ── Avatar/niche band ──
  nicheRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  nicheCard: { flex: 1, backgroundColor: LIGHT, borderRadius: 5, padding: 8, border: `0.5 solid ${LINE}` },
  nicheCardTitle: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  nicheCardText: { fontSize: 7.5, color: INK, lineHeight: 1.4 },

  // ── Footer ──
  footer: {
    backgroundColor: NAVY_DARK, paddingVertical: 8, paddingHorizontal: 34,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  footerLeft: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
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
  brandLogoDataUri?: string | null;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
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
  brandLogoDataUri,
}: Day1PDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, maxWidth: "66%" }}>
              {logoDataUri ? (
                <Image
                  src={logoDataUri}
                  style={{ width: 38, height: 38, objectFit: "contain", borderRadius: 4, backgroundColor: "#fff", padding: 2 }}
                />
              ) : null}
              <View>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.tagline}>Govbidder Challenge — Perfil Estratégico Día 1</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <Text style={styles.docTitle}>STRATEGIC{"\n"}PROFILE{"\n"}DAY 1</Text>
              {brandLogoDataUri ? (
                <Image
                  src={brandLogoDataUri}
                  style={{ width: 34, height: 34, objectFit: "contain", backgroundColor: "#fff", borderRadius: 5, padding: 3 }}
                />
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.goldBar} />

        {/* ── Stats band ── */}
        <View style={styles.statsBand}>
          {yearFounded ? (
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{`'${String(yearFounded).slice(2)}`}</Text>
              <Text style={styles.statLabel}>Founded</Text>
            </View>
          ) : (
            <View style={styles.statItem}>
              <Text style={styles.statNum}>—</Text>
              <Text style={styles.statLabel}>Founded</Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{employeeCount ?? "—"}</Text>
            <Text style={styles.statLabel}>Team Members</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{primaryNaics ? "1" : "—"}</Text>
            <Text style={styles.statLabel}>NAICS Code</Text>
          </View>
          <View style={styles.statItemLast}>
            <Text style={styles.statNum}>SAM</Text>
            <Text style={styles.statLabel}>Register Next</Text>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          {/* LEFT */}
          <View style={styles.leftCol}>
            {/* Company data */}
            <View style={styles.section}>
              <SectionTitle>Company Information</SectionTitle>
              {yearFounded ? <DataRow label="Year Founded" value={String(yearFounded)} /> : null}
              {employeeCount ? <DataRow label="Team Size" value={String(employeeCount)} /> : null}
            </View>

            {/* Niche & Problem */}
            {(niche || problemSolved) && (
              <View style={styles.section}>
                <SectionTitle>Business Profile</SectionTitle>
                {niche && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={[styles.dataLabel, { marginBottom: 3 }]}>What you sell / do</Text>
                    <View style={styles.insightBox}>
                      <Text style={styles.insightText}>{niche}</Text>
                    </View>
                  </View>
                )}
                {problemSolved && (
                  <View>
                    <Text style={[styles.dataLabel, { marginBottom: 3 }]}>Problem you solve for clients</Text>
                    <View style={styles.insightBox}>
                      <Text style={styles.insightText}>{problemSolved}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Target avatar */}
            {targetAvatar && (
              <View style={styles.section}>
                <SectionTitle>Target Customer</SectionTitle>
                <View style={styles.insightBox}>
                  <Text style={styles.insightText}>{targetAvatar}</Text>
                </View>
              </View>
            )}
          </View>

          {/* RIGHT */}
          <View style={styles.rightCol}>
            {/* NAICS card */}
            {primaryNaics && (
              <View style={styles.dataCard}>
                <Text style={styles.dataCardTitle}>PRIMARY NAICS CODE</Text>
                <Text style={styles.naicsCode}>{primaryNaics}</Text>
                {naicsDescription && <Text style={styles.naicsDesc}>{naicsDescription}</Text>}
                {naicsReasoning && <Text style={styles.naicsReason}>{naicsReasoning}</Text>}
              </View>
            )}

            {/* Next steps box */}
            <View style={styles.section}>
              <SectionTitle>Next Steps</SectionTitle>
              {[
                "Register on SAM.gov with your NAICS code",
                "Complete your Capability Statement (Day 4)",
                "Search active contracts on USASpending.gov",
                "Map related codes in Day 2",
              ].map((step, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 5 }}>
                  <View
                    style={{
                      width: 14, height: 14, borderRadius: 7,
                      backgroundColor: GOLD, alignItems: "center", justifyContent: "center",
                      marginRight: 7, marginTop: 1, flexShrink: 0,
                    }}
                  >
                    <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: NAVY_DARK }}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.bodyText, { flex: 1 }]}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerLeft}>GOVBIDDER CHALLENGE</Text>
          <Text style={styles.footerRight}>Generado el {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
