import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { CapabilityStatementData } from "@/app/api/ai/generate-capability-statement/route";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    padding: 0,
    backgroundColor: "#FFFFFF",
    fontSize: 9,
  },
  topBar: {
    backgroundColor: "#1a2a6c",
    padding: "20 48 16",
  },
  companyName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  tagline: {
    fontSize: 11,
    color: "#c9a227",
    marginTop: 4,
    fontStyle: "italic",
  },
  goldBar: {
    backgroundColor: "#c9a227",
    height: 4,
  },
  body: {
    padding: "20 48",
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    gap: 24,
  },
  col: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1a2a6c",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    borderBottom: "2 solid #c9a227",
    paddingBottom: 3,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.5,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 5,
  },
  bullet: {
    color: "#c9a227",
    fontFamily: "Helvetica-Bold",
    marginRight: 5,
    fontSize: 10,
  },
  bulletText: {
    fontSize: 9,
    color: "#374151",
    flex: 1,
    lineHeight: 1.4,
  },
  codeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  codeChip: {
    border: "1 solid #1a2a6c",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 8,
    color: "#1a2a6c",
  },
  footer: {
    backgroundColor: "#1a2a6c",
    padding: "10 48",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#c9a227",
  },
  footerContact: {
    fontSize: 8,
    color: "#FFFFFF",
    textAlign: "right",
  },
});

interface CapabilityStatementPDFProps {
  companyName: string;
  data: CapabilityStatementData;
  generatedAt: string;
}

export function CapabilityStatementPDF({
  companyName,
  data,
  generatedAt,
}: CapabilityStatementPDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={{ fontFamily: "Helvetica", backgroundColor: "#FFFFFF", fontSize: 9 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.tagline}>{data.tagline}</Text>
        </View>
        <View style={styles.goldBar} />

        <View style={styles.body}>
          {/* Company overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Overview</Text>
            <Text style={styles.bodyText}>{data.company_overview}</Text>
          </View>

          <View style={styles.grid}>
            {/* Left col */}
            <View style={styles.col}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Core Competencies</Text>
                {data.core_competencies.map((c, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{c}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past Performance</Text>
                <Text style={styles.bodyText}>{data.past_performance}</Text>
              </View>
            </View>

            {/* Right col */}
            <View style={styles.col}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Differentiators</Text>
                {data.differentiators.map((d, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={styles.bullet}>★</Text>
                    <Text style={styles.bulletText}>{d}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>NAICS Codes</Text>
                <View style={styles.codeRow}>
                  {data.naics_codes.map((c) => (
                    <Text key={c} style={styles.codeChip}>{c}</Text>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PSC Codes</Text>
                <View style={styles.codeRow}>
                  {data.psc_codes.map((c) => (
                    <Text key={c} style={styles.codeChip}>{c}</Text>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Govbidder Challenge · {generatedAt}</Text>
          <Text style={styles.footerContact}>{data.contact_placeholder}</Text>
        </View>
      </Page>
    </Document>
  );
}
