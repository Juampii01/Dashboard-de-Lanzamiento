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

// Per-type accent colors (muted, PDF-safe)
const TYPE_COLOR: Record<string, string> = {
  NAICS:   "#1a2a6c",
  PSC:     "#6b21a8",
  SIC:     "#166534",
  UNSPSC:  "#c2410c",
  NIGP:    "#be123c",
};

const TYPE_BG: Record<string, string> = {
  NAICS:   "#eff6ff",
  PSC:     "#faf5ff",
  SIC:     "#f0fdf4",
  UNSPSC:  "#fff7ed",
  NIGP:    "#fff1f2",
};

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#FFFFFF", fontSize: 8, color: INK },

  // ── Header ──
  header: { backgroundColor: NAVY, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 34 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  companyName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#FFFFFF", maxWidth: "66%", lineHeight: 1.12 },
  docTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 1.5, textAlign: "right", lineHeight: 1.4 },
  tagline: { fontSize: 8, color: GOLD, marginTop: 3, fontStyle: "italic" },
  naicsLine: { fontSize: 7.5, color: "rgba(255,255,255,0.7)", marginTop: 5, letterSpacing: 0.4 },
  goldBar: { backgroundColor: GOLD, height: 3 },

  // ── Stats band ──
  statsBand: { flexDirection: "row", backgroundColor: LIGHT, marginHorizontal: 34, marginTop: 14, borderRadius: 6, paddingVertical: 10, border: `0.5 solid ${LINE}` },
  statItem: { flex: 1, alignItems: "center", borderRight: `0.5 solid ${LINE}` },
  statItemLast: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY },
  statLabel: { fontSize: 6.5, color: MUTED, letterSpacing: 0.5, marginTop: 2, textTransform: "uppercase" },

  // ── Body ──
  body: { flexDirection: "row", paddingHorizontal: 34, paddingTop: 14, paddingBottom: 8, gap: 18, flex: 1 },
  leftCol: { width: "55%" },
  rightCol: { width: "45%" },

  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase",
    letterSpacing: 1, marginBottom: 4,
  },
  sectionRule: { borderBottom: `1.5 solid ${GOLD}`, marginBottom: 6, width: 28 },

  // ── Code card ──
  codeCard: {
    flexDirection: "row", alignItems: "flex-start",
    marginBottom: 4, padding: 6, borderRadius: 4,
    border: `0.5 solid ${LINE}`,
  },
  codeChip: {
    fontSize: 8, fontFamily: "Helvetica-Bold",
    paddingHorizontal: 5, paddingVertical: 2.5,
    borderRadius: 3, marginRight: 7,
    minWidth: 44, textAlign: "center", flexShrink: 0,
  },
  codeDesc: { fontSize: 7, color: MUTED, flex: 1, lineHeight: 1.3, paddingTop: 1.5 },

  // ── Type group header ──
  typeHeader: { flexDirection: "row", alignItems: "center", marginBottom: 5, gap: 6 },
  typePill: {
    fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, textTransform: "uppercase",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
  },
  typeDesc: { fontSize: 6.5, color: MUTED, flex: 1, lineHeight: 1.3 },

  // ── Keywords section ──
  kwWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  kwPill: {
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2.5,
    fontSize: 7, color: NAVY, marginBottom: 3,
    border: `1 solid ${LINE}`, backgroundColor: LIGHT,
  },

  // ── Footer ──
  footer: {
    backgroundColor: NAVY_DARK, paddingVertical: 8, paddingHorizontal: 34,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  footerLeft: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  footerRight: { fontSize: 7.5, color: GOLD, textAlign: "right" },
});

interface RelatedCode {
  code: string;
  description: string;
  type: string;
}

interface Day2PDFProps {
  companyName: string;
  primaryNaics: string;
  relatedCodes: RelatedCode[];
  keywordsExpanded: string[];
  generatedAt: string;
  logoDataUri?: string | null;
  brandLogoDataUri?: string | null;
}

const TYPE_ORDER = ["NAICS", "PSC", "SIC", "UNSPSC", "NIGP"];

const TYPE_DESC: Record<string, string> = {
  NAICS:   "Federal — SAM.gov primary code",
  PSC:     "Federal — DoD & agency purchases",
  SIC:     "Legacy — state & county systems",
  UNSPSC:  "International — UN standard",
  NIGP:    "State / county / school districts",
};

function SectionTitle({ children }: { children: string }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

export function Day2CodeMapPDF({
  companyName,
  primaryNaics,
  relatedCodes,
  keywordsExpanded,
  generatedAt,
  logoDataUri,
  brandLogoDataUri,
}: Day2PDFProps) {
  const byType = TYPE_ORDER.map((t) => ({
    type: t,
    codes: relatedCodes.filter((c) => c.type === t),
  })).filter(({ codes }) => codes.length > 0);

  const totalCodes = relatedCodes.length;
  const typesCount = byType.length;

  // Split code groups across two columns
  const leftGroups  = byType.filter((_, i) => i < Math.ceil(byType.length / 2));
  const rightGroups = byType.filter((_, i) => i >= Math.ceil(byType.length / 2));

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
                <Text style={styles.tagline}>Govbidder Challenge — Mapa de Códigos Día 2</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <Text style={styles.docTitle}>CODE MAP{"\n"}DAY 2</Text>
              {brandLogoDataUri ? (
                <Image
                  src={brandLogoDataUri}
                  style={{ width: 34, height: 34, objectFit: "contain", backgroundColor: "#fff", borderRadius: 5, padding: 3 }}
                />
              ) : null}
            </View>
          </View>
          <Text style={styles.naicsLine}>Primary NAICS: {primaryNaics}</Text>
        </View>
        <View style={styles.goldBar} />

        {/* ── Stats band ── */}
        <View style={styles.statsBand}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{totalCodes}</Text>
            <Text style={styles.statLabel}>Total Codes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{typesCount}</Text>
            <Text style={styles.statLabel}>Code Systems</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{keywordsExpanded.length}</Text>
            <Text style={styles.statLabel}>Keywords</Text>
          </View>
          <View style={styles.statItemLast}>
            <Text style={styles.statNum}>SAM</Text>
            <Text style={styles.statLabel}>Register Codes</Text>
          </View>
        </View>

        {/* ── Body — two columns of code groups ── */}
        <View style={styles.body}>
          {/* LEFT */}
          <View style={styles.leftCol}>
            {leftGroups.map(({ type, codes }) => (
              <View key={type} style={styles.section}>
                <SectionTitle>{type === "NAICS" ? "NAICS Codes" : type === "PSC" ? "PSC — Product Service Codes" : type === "SIC" ? "SIC — Legacy Codes" : type === "UNSPSC" ? "UNSPSC — UN Standard" : "NIGP Codes"}</SectionTitle>
                {/* Type descriptor */}
                <View style={styles.typeHeader}>
                  <Text
                    style={[
                      styles.typePill,
                      { backgroundColor: TYPE_BG[type] ?? LIGHT, color: TYPE_COLOR[type] ?? NAVY },
                    ]}
                  >
                    {type}
                  </Text>
                  <Text style={styles.typeDesc}>{TYPE_DESC[type] ?? ""}</Text>
                </View>
                {codes.map((c) => (
                  <View
                    key={`${c.type}-${c.code}`}
                    style={[styles.codeCard, { backgroundColor: TYPE_BG[type] ?? LIGHT }]}
                  >
                    <Text
                      style={[
                        styles.codeChip,
                        { backgroundColor: TYPE_COLOR[type] ?? NAVY, color: "#FFFFFF" },
                      ]}
                    >
                      {c.code}
                    </Text>
                    <Text style={styles.codeDesc}>{c.description}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* RIGHT */}
          <View style={styles.rightCol}>
            {rightGroups.map(({ type, codes }) => (
              <View key={type} style={styles.section}>
                <SectionTitle>{type === "NAICS" ? "NAICS Codes" : type === "PSC" ? "PSC — Product Service Codes" : type === "SIC" ? "SIC — Legacy Codes" : type === "UNSPSC" ? "UNSPSC — UN Standard" : "NIGP Codes"}</SectionTitle>
                <View style={styles.typeHeader}>
                  <Text
                    style={[
                      styles.typePill,
                      { backgroundColor: TYPE_BG[type] ?? LIGHT, color: TYPE_COLOR[type] ?? NAVY },
                    ]}
                  >
                    {type}
                  </Text>
                  <Text style={styles.typeDesc}>{TYPE_DESC[type] ?? ""}</Text>
                </View>
                {codes.map((c) => (
                  <View
                    key={`${c.type}-${c.code}`}
                    style={[styles.codeCard, { backgroundColor: TYPE_BG[type] ?? LIGHT }]}
                  >
                    <Text
                      style={[
                        styles.codeChip,
                        { backgroundColor: TYPE_COLOR[type] ?? NAVY, color: "#FFFFFF" },
                      ]}
                    >
                      {c.code}
                    </Text>
                    <Text style={styles.codeDesc}>{c.description}</Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Keywords — put in right column if there's space, else it wraps */}
            {keywordsExpanded.length > 0 && rightGroups.length < 2 && (
              <View style={styles.section}>
                <SectionTitle>Government Keywords</SectionTitle>
                <View style={styles.kwWrap}>
                  {keywordsExpanded.slice(0, 20).map((kw) => (
                    <Text key={kw} style={styles.kwPill}>{kw}</Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Keywords — full width if not already shown ── */}
        {keywordsExpanded.length > 0 && rightGroups.length >= 2 && (
          <View style={{ paddingHorizontal: 34, paddingBottom: 10 }}>
            <SectionTitle>Government Keywords</SectionTitle>
            <View style={styles.kwWrap}>
              {keywordsExpanded.slice(0, 24).map((kw) => (
                <Text key={kw} style={styles.kwPill}>{kw}</Text>
              ))}
            </View>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerLeft}>GOVBIDDER CHALLENGE</Text>
          <Text style={styles.footerRight}>Generado el {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
