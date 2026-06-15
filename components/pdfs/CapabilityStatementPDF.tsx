import {
  Document,
  Page,
  Text,
  View,
  Image,
  Font,
  StyleSheet,
} from "@react-pdf/renderer";
import type { CapabilityStatementData } from "@/app/api/ai/generate-capability-statement/route";

// Never break words mid-character (no "Solu-tions"); wrap only at spaces.
Font.registerHyphenationCallback((word) => [word]);

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
  companyName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#FFFFFF", maxWidth: "66%", lineHeight: 1.12 },
  csTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 1.5, textAlign: "right", lineHeight: 1.2 },
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

  // ── COVER PAGE ──
  cover: { backgroundColor: NAVY_DARK, flex: 1, position: "relative" },
  coverTop: { paddingTop: 38, paddingHorizontal: 46, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  coverEyebrow: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 3 },
  coverEyebrowRight: { fontSize: 7.5, color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, textAlign: "right" },
  coverHeroWrap: { marginTop: 26, marginHorizontal: 46, borderRadius: 10, overflow: "hidden", border: `1 solid rgba(201,162,39,0.4)` },
  coverHero: { width: "100%", height: 250, objectFit: "cover" },
  coverHeadingWrap: { paddingHorizontal: 46, marginTop: 30 },
  coverCompany: { fontSize: 34, fontFamily: "Helvetica-Bold", color: "#FFFFFF", lineHeight: 1.05, letterSpacing: -0.5 },
  coverTagline: { fontSize: 11, color: GOLD, marginTop: 8, fontStyle: "italic" },
  coverValueProp: { fontSize: 11.5, color: "rgba(255,255,255,0.82)", marginTop: 14, lineHeight: 1.5, maxWidth: "88%" },
  coverPromises: { paddingHorizontal: 46, marginTop: 26, flexDirection: "column", gap: 9 },
  promiseRow: { flexDirection: "row", alignItems: "center" },
  promiseDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: GOLD, marginRight: 11, alignItems: "center", justifyContent: "center" },
  promiseDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: NAVY_DARK },
  promiseText: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 1 },
  coverFooter: { position: "absolute", bottom: 0, left: 0, right: 0, borderTop: `1 solid rgba(255,255,255,0.12)`, paddingVertical: 16, paddingHorizontal: 46 },
  coverFooterGold: { height: 3, backgroundColor: GOLD, marginBottom: 14, width: 54 },
  coverContactRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  coverContactItem: { fontSize: 8, color: "rgba(255,255,255,0.75)" },
  coverContactSep: { fontSize: 8, color: GOLD, marginHorizontal: 4 },

  // ── Stats band (page 2) ──
  statsBand: { flexDirection: "row", backgroundColor: LIGHT, borderRadius: 6, marginHorizontal: 34, marginTop: 12, paddingVertical: 9, border: `0.5 solid ${LINE}` },
  statItem: { flex: 1, alignItems: "center", borderRight: `0.5 solid ${LINE}` },
  statItemLast: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY },
  statLabel: { fontSize: 6.5, color: MUTED, letterSpacing: 0.5, marginTop: 2, textTransform: "uppercase" },
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
  dunsNumber?: string | null;
  address?: string | null;
  zipCode?: string | null;
  usState?: string | null;
  certifications?: string[] | null;
  yearFounded?: number | null;
  employeeCount?: number | null;
}

interface CapabilityStatementPDFProps {
  companyData: CapabilityCompanyData;
  data: CapabilityStatementData;
  generatedAt: string;
  images?: string[];
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
  logoDataUri,
}: CapabilityStatementPDFProps) {
  const cd = companyData;
  const heroImg = images[0] ?? null;                 // cover hero
  const accentImg = images[1] ?? images[0] ?? null;  // page 2 right-column accent

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

  const promises = (data.key_promises?.length ? data.key_promises : data.differentiators ?? []).slice(0, 3);
  const contactItems = [
    cd.cageCode ? `CAGE ${cd.cageCode}` : null,
    cd.uei ? `UEI ${cd.uei}` : null,
    cd.email, cd.phone, cd.website,
    cd.usState,
  ].filter(Boolean) as string[];

  return (
    <Document>
      {/* ════════════ PAGE 1 — COVER ════════════ */}
      <Page size="LETTER" style={styles.cover}>
        <View style={styles.coverTop}>
          <Text style={styles.coverEyebrow}>CAPABILITY STATEMENT</Text>
          <Text style={styles.coverEyebrowRight}>
            {setAsides.length ? setAsides.join("  ·  ") : "GOVERNMENT CONTRACTOR"}
          </Text>
        </View>

        {heroImg ? (
          <View style={styles.coverHeroWrap}>
            <Image src={heroImg} style={styles.coverHero} />
          </View>
        ) : null}

        <View style={styles.coverHeadingWrap}>
          {logoDataUri ? (
            <View style={{ marginBottom: 14 }}>
              <Image
                src={logoDataUri}
                style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.92)", padding: 4 }}
              />
            </View>
          ) : null}
          <Text style={styles.coverCompany}>{cd.companyName}</Text>
          {data.tagline ? <Text style={styles.coverTagline}>{data.tagline}</Text> : null}
          {data.value_proposition ? <Text style={styles.coverValueProp}>{data.value_proposition}</Text> : null}
        </View>

        {promises.length ? (
          <View style={styles.coverPromises}>
            {promises.map((pr, i) => (
              <View key={i} style={styles.promiseRow}>
                <View style={styles.promiseDot}><View style={styles.promiseDotInner} /></View>
                <Text style={styles.promiseText}>{pr}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.coverFooter}>
          <View style={styles.coverFooterGold} />
          <View style={styles.coverContactRow}>
            {contactItems.map((c, i) => (
              <View key={i} style={{ flexDirection: "row" }}>
                {i > 0 ? <Text style={styles.coverContactSep}>|</Text> : null}
                <Text style={styles.coverContactItem}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {/* ════════════ PAGE 2 — DETAIL ════════════ */}
      <Page size="LETTER" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, maxWidth: "66%" }}>
              {logoDataUri ? (
                <Image
                  src={logoDataUri}
                  style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 4, backgroundColor: "rgba(255,255,255,0.9)", padding: 2, flexShrink: 0 }}
                />
              ) : null}
              <View>
                <Text style={styles.companyName}>{cd.companyName}</Text>
                {data.tagline ? <Text style={styles.tagline}>{data.tagline}</Text> : null}
              </View>
            </View>
            <Text style={styles.csTitle}>CAPABILITY{"\n"}STATEMENT</Text>
          </View>
          {serviceCats.length ? (
            <Text style={styles.serviceCats}>{serviceCats.join("   |   ")}</Text>
          ) : null}
          <Text style={styles.idLine}>{idParts.join("      ")}</Text>
        </View>
        <View style={styles.goldBar} />

        {/* ── Stats band ── */}
        <View style={styles.statsBand}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{cd.yearFounded ? `'${String(cd.yearFounded).slice(2)}` : "—"}</Text>
            <Text style={styles.statLabel}>Established</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{cd.employeeCount ?? "—"}</Text>
            <Text style={styles.statLabel}>Team Members</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{markets.length}</Text>
            <Text style={styles.statLabel}>Markets Served</Text>
          </View>
          <View style={styles.statItemLast}>
            <Text style={styles.statNum}>{naicsList.length + pscList.length}</Text>
            <Text style={styles.statLabel}>Codes Registered</Text>
          </View>
        </View>

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
              {cd.dunsNumber ? <DataRow label="DUNS" value={cd.dunsNumber} /> : null}
              {setAsides.length ? <DataRow label="SET-ASIDES" value={setAsides.join(", ")} /> : null}
              <DataRow label="SAM.GOV" value={samActive ? "Active Registration" : "Registration in progress"} />
              {cd.contactName ? <DataRow label="CONTACT" value={cd.contactName} /> : null}
              {cd.email ? <DataRow label="EMAIL" value={cd.email} /> : null}
              <DataRow label="PHONE" value={cd.phone || "[Add phone]"} />
              {cd.website ? <DataRow label="WEBSITE" value={cd.website} /> : null}
              {cd.address ? <DataRow label="ADDRESS" value={cd.address + (cd.zipCode ? `, ${cd.zipCode}` : "")} /> : null}
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
