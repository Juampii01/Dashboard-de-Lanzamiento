import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { CapabilityStatementData } from "@/app/api/ai/generate-capability-statement/route";

const NAVY = "#1a2a6c";
const NAVY_DARK = "#0f1e3d";
const GOLD = "#c9a227";
const INK = "#374151";
const MUTED = "#6b7280";
const LIGHT = "#f6f8fb";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#FFFFFF", fontSize: 9, color: INK },

  // ── Header ──
  header: { backgroundColor: NAVY, paddingTop: 20, paddingBottom: 14, paddingHorizontal: 40 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  companyName: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#FFFFFF", maxWidth: "55%" },
  csTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 1, textAlign: "right" },
  tagline: { fontSize: 10, color: GOLD, marginTop: 3, fontStyle: "italic" },
  serviceCats: { fontSize: 8, color: "#FFFFFF", marginTop: 8, letterSpacing: 1, opacity: 0.95 },
  idLine: { fontSize: 7.5, color: GOLD, marginTop: 5, letterSpacing: 0.5 },
  goldBar: { backgroundColor: GOLD, height: 4 },

  // ── Body grid ──
  body: { flexDirection: "row", paddingHorizontal: 40, paddingTop: 18, paddingBottom: 12, gap: 20, flex: 1 },
  leftCol: { width: "57%" },
  rightCol: { width: "43%" },

  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 8.5, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase",
    letterSpacing: 1.2, borderBottom: `2 solid ${GOLD}`, paddingBottom: 3, marginBottom: 7,
  },
  bodyText: { fontSize: 9, color: INK, lineHeight: 1.5 },

  // bullets in two columns
  bulletGrid: { flexDirection: "row", flexWrap: "wrap" },
  bulletCol: { width: "50%" },
  bulletItem: { flexDirection: "row", marginBottom: 4, paddingRight: 6 },
  bullet: { color: GOLD, fontFamily: "Helvetica-Bold", marginRight: 4, fontSize: 9 },
  bulletText: { fontSize: 8.5, color: INK, flex: 1, lineHeight: 1.35 },

  diffItem: { flexDirection: "row", marginBottom: 5 },
  diffMark: { color: NAVY, fontFamily: "Helvetica-Bold", marginRight: 5, fontSize: 9 },

  // boxed sections (quality / past performance)
  box: { backgroundColor: LIGHT, borderRadius: 6, padding: 10, marginTop: 2 },
  boxText: { fontSize: 8.5, color: INK, lineHeight: 1.45 },

  // ── Company data card ──
  dataCard: { backgroundColor: NAVY, borderRadius: 8, padding: 14, marginBottom: 14 },
  dataTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFFFFF", textAlign: "center", letterSpacing: 1, marginBottom: 10 },
  dataRow: { flexDirection: "row", marginBottom: 5, borderBottom: "0.5 solid rgba(255,255,255,0.12)", paddingBottom: 4 },
  dataLabel: { width: "38%", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 0.5 },
  dataValue: { width: "62%", fontSize: 8, color: "#FFFFFF" },

  // codes
  codeItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  codeChip: {
    backgroundColor: LIGHT, border: `1 solid ${NAVY}`, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2, fontSize: 8, fontFamily: "Helvetica-Bold",
    color: NAVY, marginRight: 6, minWidth: 42, textAlign: "center",
  },
  codeDesc: { fontSize: 8, color: MUTED, flex: 1, lineHeight: 1.3, paddingTop: 1 },

  // primary markets
  marketsBox: { backgroundColor: LIGHT, borderRadius: 6, padding: 10, alignItems: "center" },
  marketsText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 0.5 },

  // ── Footer ──
  footer: {
    backgroundColor: NAVY_DARK, paddingVertical: 10, paddingHorizontal: 40,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  footerName: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  footerContact: { fontSize: 8, color: GOLD, textAlign: "right" },
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
}: CapabilityStatementPDFProps) {
  const cd = companyData;

  // Back-compat fallbacks for statements saved before the enrichment
  const serviceCats = data.service_categories?.length
    ? data.service_categories
    : (data.tagline ? [data.tagline.toUpperCase()] : []);
  const naicsList = data.naics_with_desc?.length
    ? data.naics_with_desc
    : (data.naics_codes ?? []).map((c) => ({ code: c, description: "" }));
  const pscList = data.psc_with_desc?.length
    ? data.psc_with_desc
    : (data.psc_codes ?? []).map((c) => ({ code: c, description: "" }));
  const markets = data.primary_markets?.length ? data.primary_markets : ["Federal", "State", "Local", "Commercial"];
  const setAsides = (cd.certifications ?? []).filter((c) => c !== "SAM.gov");
  const samActive = (cd.certifications ?? []).includes("SAM.gov");

  // Split core competencies into two columns
  const comps = data.core_competencies ?? [];
  const mid = Math.ceil(comps.length / 2);
  const compsLeft = comps.slice(0, mid);
  const compsRight = comps.slice(mid);

  const idParts = [
    cd.cageCode ? `CAGE: ${cd.cageCode}` : "CAGE: [Pending]",
    cd.uei ? `UEI: ${cd.uei}` : "UEI: [Register on SAM.gov]",
    setAsides.length ? setAsides.join(" / ") : null,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ maxWidth: "55%" }}>
              <Text style={styles.companyName}>{cd.companyName}</Text>
              {data.tagline ? <Text style={styles.tagline}>{data.tagline}</Text> : null}
            </View>
            <Text style={styles.csTitle}>CAPABILITY{"\n"}STATEMENT</Text>
          </View>
          {serviceCats.length ? (
            <Text style={styles.serviceCats}>{serviceCats.join("  |  ")}</Text>
          ) : null}
          <Text style={styles.idLine}>{idParts.join("    ")}</Text>
        </View>
        <View style={styles.goldBar} />

        {/* ── Body ── */}
        <View style={styles.body}>
          {/* LEFT */}
          <View style={styles.leftCol}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company Overview</Text>
              <Text style={styles.bodyText}>{data.company_overview}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Core Competencies</Text>
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
              <Text style={styles.sectionTitle}>Differentiators</Text>
              {data.differentiators.map((d, i) => (
                <View key={i} style={styles.diffItem}>
                  <Text style={styles.diffMark}>{">"}</Text>
                  <Text style={styles.bulletText}>{d}</Text>
                </View>
              ))}
            </View>

            {data.quality_commitment ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quality Commitment</Text>
                <View style={styles.box}>
                  <Text style={styles.boxText}>{data.quality_commitment}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Past Performance</Text>
              <View style={styles.box}>
                <Text style={styles.boxText}>{data.past_performance}</Text>
              </View>
            </View>
          </View>

          {/* RIGHT */}
          <View style={styles.rightCol}>
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
              <Text style={styles.sectionTitle}>NAICS Codes</Text>
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
                <Text style={styles.sectionTitle}>PSC Codes</Text>
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
              <Text style={styles.sectionTitle}>Primary Markets</Text>
              <View style={styles.marketsBox}>
                <Text style={styles.marketsText}>{markets.join("  |  ")}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerName}>{cd.companyName}</Text>
          <Text style={styles.footerContact}>
            {[cd.contactName, cd.email, cd.phone].filter(Boolean).join("  |  ") || `Govbidder Challenge · ${generatedAt}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
