import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { CapabilityStatementData } from "@/app/api/ai/generate-capability-statement/route";

const NAVY = "#1a2a6c";
const NAVY_DARK = "#0f1e3d";
const GOLD = "#c9a227";
const INK = "#2b3444";
const MUTED = "#6b7280";
const LIGHT = "#f4f6fa";
const LINE = "#e2e6ee";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#FFFFFF", fontSize: 8, color: INK },

  // ── Header ──
  header: { backgroundColor: NAVY, paddingTop: 16, paddingBottom: 11, paddingHorizontal: 34 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  companyName: { fontSize: 17, fontFamily: "Helvetica-Bold", color: "#FFFFFF", maxWidth: "60%", lineHeight: 1.1 },
  csTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 1.5, textAlign: "right", lineHeight: 1.15 },
  tagline: { fontSize: 8.5, color: GOLD, marginTop: 3, fontStyle: "italic" },
  serviceCats: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF", marginTop: 7, letterSpacing: 1 },
  idLine: { fontSize: 6.5, color: GOLD, marginTop: 4, letterSpacing: 0.5 },
  goldBar: { backgroundColor: GOLD, height: 3 },

  // ── Images ──
  bannerImg: { width: "100%", height: 74, objectFit: "cover" },
  accentImg: { width: "100%", height: 86, objectFit: "cover", borderRadius: 6, marginBottom: 4 },

  // ── Body grid ──
  body: { flexDirection: "row", paddingHorizontal: 34, paddingTop: 13, paddingBottom: 8, gap: 18, flex: 1 },
  leftCol: { width: "58%" },
  rightCol: { width: "42%" },

  section: { marginBottom: 9 },
  sectionTitle: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase",
    letterSpacing: 1, marginBottom: 4,
  },
  sectionRule: { borderBottom: `1.5 solid ${GOLD}`, marginBottom: 5, width: 28 },
  bodyText: { fontSize: 8, color: INK, lineHeight: 1.45 },

  // bullets in two columns
  bulletGrid: { flexDirection: "row", flexWrap: "wrap" },
  bulletCol: { width: "50%" },
  bulletItem: { flexDirection: "row", marginBottom: 3, paddingRight: 6 },
  bullet: { color: GOLD, fontFamily: "Helvetica-Bold", marginRight: 4, fontSize: 8 },
  bulletText: { fontSize: 7.6, color: INK, flex: 1, lineHeight: 1.32 },

  diffItem: { flexDirection: "row", marginBottom: 3.5 },
  diffMark: { color: GOLD, fontFamily: "Helvetica-Bold", marginRight: 4, fontSize: 8 },

  // boxed (quality / past performance)
  box: { backgroundColor: LIGHT, borderRadius: 4, borderLeft: `2 solid ${GOLD}`, padding: 7, marginTop: 1 },
  boxText: { fontSize: 7.6, color: INK, lineHeight: 1.4 },

  // ── Company data card ──
  dataCard: { backgroundColor: NAVY, borderRadius: 6, paddingTop: 9, paddingBottom: 6, paddingHorizontal: 11, marginBottom: 11 },
  dataTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#FFFFFF", textAlign: "center", letterSpacing: 1, marginBottom: 8 },
  dataRow: { flexDirection: "row", marginBottom: 3.5, borderBottom: "0.5 solid rgba(255,255,255,0.1)", paddingBottom: 3 },
  dataLabel: { width: "36%", fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 0.4 },
  dataValue: { width: "64%", fontSize: 7, color: "#FFFFFF" },

  // codes
  codeItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 3.5 },
  codeChip: {
    backgroundColor: LIGHT, border: `1 solid ${NAVY}`, borderRadius: 3,
    paddingHorizontal: 4, paddingVertical: 1.5, fontSize: 7, fontFamily: "Helvetica-Bold",
    color: NAVY, marginRight: 5, minWidth: 38, textAlign: "center",
  },
  codeDesc: { fontSize: 7, color: MUTED, flex: 1, lineHeight: 1.25, paddingTop: 1.5 },

  // primary markets
  marketsBox: { backgroundColor: LIGHT, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 8, alignItems: "center", border: `0.5 solid ${LINE}` },
  marketsText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 0.5 },

  // ── Footer ──
  footer: {
    backgroundColor: NAVY_DARK, paddingVertical: 8, paddingHorizontal: 34,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  footerName: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  footerContact: { fontSize: 7.5, color: GOLD, textAlign: "right" },
});

export interface CapabilityCompanyData {
  companyName: string;
  legalStructure?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  uei?: string | null;
  cageCode?: string | null;
  usState?: string | null;
  certifications?: string[] | null;
}

interface CapabilityStatementPDFProps {
  companyData: CapabilityCompanyData;
  data: CapabilityStatementData;
  generatedAt: string;
  images?: string[];
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

export function CapabilityStatementPDF({
  companyData,
  data,
  generatedAt,
  images = [],
}: CapabilityStatementPDFProps) {
  const cd = companyData;
  const bannerImg = images[0] ?? null;
  const accentImg = images[1] ?? null;

  // Back-compat fallbacks + hard caps so it always fits one page
  const serviceCats = (data.service_categories?.length
    ? data.service_categories
    : (data.tagline ? [data.tagline.toUpperCase()] : [])).slice(0, 4);
  const naicsList = (data.naics_with_desc?.length
    ? data.naics_with_desc
    : (data.naics_codes ?? []).map((c) => ({ code: c, description: "" }))).slice(0, 5);
  const pscList = (data.psc_with_desc?.length
    ? data.psc_with_desc
    : (data.psc_codes ?? []).map((c) => ({ code: c, description: "" }))).slice(0, 4);
  const markets = (data.primary_markets?.length ? data.primary_markets : ["Federal", "State", "Local", "Commercial"]).slice(0, 4);
  const setAsides = (cd.certifications ?? []).filter((c) => c !== "SAM.gov");
  const samActive = (cd.certifications ?? []).includes("SAM.gov");

  const comps = (data.core_competencies ?? []).slice(0, 6);
  const diffs = (data.differentiators ?? []).slice(0, 4);
  const mid = Math.ceil(comps.length / 2);
  const compsLeft = comps.slice(0, mid);
  const compsRight = comps.slice(mid);

  const idParts = [
    `CAGE: ${cd.cageCode || "[Pending]"}`,
    `UEI: ${cd.uei || "[Register on SAM.gov]"}`,
    setAsides.length ? setAsides.join(" / ") : null,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ maxWidth: "60%" }}>
              <Text style={styles.companyName}>{cd.companyName}</Text>
              {data.tagline ? <Text style={styles.tagline}>{data.tagline}</Text> : null}
            </View>
            <Text style={styles.csTitle}>CAPABILITY{"\n"}STATEMENT</Text>
          </View>
          {serviceCats.length ? (
            <Text style={styles.serviceCats}>{serviceCats.join("   |   ")}</Text>
          ) : null}
          <Text style={styles.idLine}>{idParts.join("      ")}</Text>
        </View>
        <View style={styles.goldBar} />

        {/* ── Banner image (sector photo) ── */}
        {bannerImg ? <Image src={bannerImg} style={styles.bannerImg} /> : null}

        {/* ── Body ── */}
        <View style={styles.body}>
          {/* LEFT */}
          <View style={styles.leftCol}>
            <View style={styles.section}>
              <SectionTitle>Company Overview</SectionTitle>
              <Text style={styles.bodyText}>{data.company_overview}</Text>
            </View>

            <View style={styles.section}>
              <SectionTitle>Core Competencies</SectionTitle>
              <View style={styles.bulletGrid}>
                <View style={styles.bulletCol}>
                  {compsLeft.map((c, i) => (
                    <View key={i} style={styles.bulletItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>{c}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.bulletCol}>
                  {compsRight.map((c, i) => (
                    <View key={i} style={styles.bulletItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <SectionTitle>Differentiators</SectionTitle>
              {diffs.map((d, i) => (
                <View key={i} style={styles.diffItem}>
                  <Text style={styles.diffMark}>{"▪"}</Text>
                  <Text style={styles.bulletText}>{d}</Text>
                </View>
              ))}
            </View>

            {data.quality_commitment ? (
              <View style={styles.section}>
                <SectionTitle>Quality Commitment</SectionTitle>
                <View style={styles.box}>
                  <Text style={styles.boxText}>{data.quality_commitment}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionTitle>Past Performance</SectionTitle>
              <View style={styles.box}>
                <Text style={styles.boxText}>{data.past_performance}</Text>
              </View>
            </View>
          </View>

          {/* RIGHT */}
          <View style={styles.rightCol}>
            {/* Accent sector photo */}
            {accentImg ? <Image src={accentImg} style={styles.accentImg} /> : null}

            {/* Company data card */}
            <View style={styles.dataCard}>
              <Text style={styles.dataTitle}>COMPANY DATA</Text>
              <DataRow label="LEGAL NAME" value={cd.companyName} />
              {cd.legalStructure ? <DataRow label="ENTITY TYPE" value={cd.legalStructure} /> : null}
              <DataRow label="CAGE CODE" value={cd.cageCode || "[Pending]"} />
              <DataRow label="UEI" value={cd.uei || "[Register on SAM.gov]"} />
              {setAsides.length ? <DataRow label="SET-ASIDES" value={setAsides.join(", ")} /> : null}
              <DataRow label="SAM.GOV" value={samActive ? "Active Registration" : "Registration in progress"} />
              {cd.contactName ? <DataRow label="CONTACT" value={cd.contactName} /> : null}
              {cd.email ? <DataRow label="EMAIL" value={cd.email} /> : null}
              <DataRow label="PHONE" value={cd.phone || "[Add phone]"} />
              {cd.website ? <DataRow label="WEBSITE" value={cd.website} /> : null}
              {cd.usState ? <DataRow label="LOCATION" value={cd.usState} /> : null}
            </View>

            {/* NAICS */}
            <View style={styles.section}>
              <SectionTitle>NAICS Codes</SectionTitle>
              {naicsList.map((c, i) => (
                <View key={i} style={styles.codeItem}>
                  <Text style={styles.codeChip}>{c.code}</Text>
                  {c.description ? <Text style={styles.codeDesc}>{c.description}</Text> : null}
                </View>
              ))}
            </View>

            {/* PSC */}
            {pscList.length ? (
              <View style={styles.section}>
                <SectionTitle>PSC Codes</SectionTitle>
                {pscList.map((c, i) => (
                  <View key={i} style={styles.codeItem}>
                    <Text style={styles.codeChip}>{c.code}</Text>
                    {c.description ? <Text style={styles.codeDesc}>{c.description}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}

            {/* Primary markets */}
            <View style={styles.section}>
              <SectionTitle>Primary Markets</SectionTitle>
              <View style={styles.marketsBox}>
                <Text style={styles.marketsText}>{markets.join("   |   ")}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerName}>{cd.companyName}</Text>
          <Text style={styles.footerContact}>
            {[cd.contactName, cd.email, cd.phone].filter(Boolean).join("   |   ") || `Govbidder Challenge · ${generatedAt}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
