import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    padding: 48,
    backgroundColor: "#FFFFFF",
    fontSize: 10,
    color: "#1a2a6c",
  },
  header: {
    borderBottom: "3 solid #c9a227",
    paddingBottom: 16,
    marginBottom: 24,
  },
  logo: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#1a2a6c" },
  subtitle: { fontSize: 11, color: "#666", marginTop: 4 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1a2a6c", marginBottom: 6 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#c9a227",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    borderBottom: "1 solid #e5e7eb",
    paddingBottom: 4,
  },
  codeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  codeCard: {
    width: "48%",
    border: "1 solid #e5e7eb",
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  codeType: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b7280",
    marginBottom: 2,
  },
  codeValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#1a2a6c" },
  codeDesc: { fontSize: 8, color: "#374151", marginTop: 2 },
  keywordWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  keyword: {
    border: "1 solid #1a2a6c",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    color: "#1a2a6c",
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    borderTop: "1 solid #e5e7eb",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#9ca3af",
  },
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
}

export function Day2CodeMapPDF({
  companyName,
  primaryNaics,
  relatedCodes,
  keywordsExpanded,
  generatedAt,
}: Day2PDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>GOVBIDDER</Text>
          <Text style={styles.subtitle}>Code Challenge — Mapa de Código Gubernamental Día 2</Text>
        </View>

        <Text style={styles.title}>Mapa de Códigos: {companyName}</Text>
        <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 20 }}>
          NAICS Primario: {primaryNaics}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Códigos Relacionados</Text>
          <View style={styles.codeGrid}>
            {relatedCodes.map((code) => (
              <View key={`${code.type}-${code.code}`} style={styles.codeCard}>
                <Text style={styles.codeType}>{code.type}</Text>
                <Text style={styles.codeValue}>{code.code}</Text>
                <Text style={styles.codeDesc}>{code.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Keywords Gubernamentales</Text>
          <View style={styles.keywordWrap}>
            {keywordsExpanded.map((kw) => (
              <Text key={kw} style={styles.keyword}>{kw}</Text>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Govbidder Code Challenge</Text>
          <Text>Generado el {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
