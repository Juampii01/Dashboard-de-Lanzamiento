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
  logo: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1a2a6c",
  },
  subtitle: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1a2a6c",
    marginBottom: 6,
  },
  section: {
    marginBottom: 20,
  },
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
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: "35%",
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  value: {
    width: "65%",
    color: "#1a2a6c",
  },
  naicsBox: {
    backgroundColor: "#f0f4ff",
    border: "1 solid #1a2a6c",
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  naicsCode: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#1a2a6c",
  },
  naicsDesc: {
    fontSize: 11,
    color: "#374151",
    marginTop: 4,
  },
  naicsReason: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 6,
    fontStyle: "italic",
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
}: Day1PDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>GOVBIDDER</Text>
          <Text style={styles.subtitle}>Govbidder Challenge — Análisis Inicial Día 1</Text>
        </View>

        <Text style={styles.title}>Perfil Estratégico: {companyName}</Text>

        {/* Company info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de la Empresa</Text>
          {yearFounded && (
            <View style={styles.row}>
              <Text style={styles.label}>Año de fundación:</Text>
              <Text style={styles.value}>{yearFounded}</Text>
            </View>
          )}
          {employeeCount && (
            <View style={styles.row}>
              <Text style={styles.label}>Empleados:</Text>
              <Text style={styles.value}>{employeeCount}</Text>
            </View>
          )}
          {niche && (
            <View style={styles.row}>
              <Text style={styles.label}>Qué vende/hace:</Text>
              <Text style={styles.value}>{niche}</Text>
            </View>
          )}
          {problemSolved && (
            <View style={styles.row}>
              <Text style={styles.label}>Problema que resuelve:</Text>
              <Text style={styles.value}>{problemSolved}</Text>
            </View>
          )}
          {targetAvatar && (
            <View style={styles.row}>
              <Text style={styles.label}>Cliente objetivo:</Text>
              <Text style={styles.value}>{targetAvatar}</Text>
            </View>
          )}
        </View>

        {/* NAICS */}
        {primaryNaics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Código NAICS Primario</Text>
            <View style={styles.naicsBox}>
              <Text style={styles.naicsCode}>{primaryNaics}</Text>
              {naicsDescription && <Text style={styles.naicsDesc}>{naicsDescription}</Text>}
              {naicsReasoning && <Text style={styles.naicsReason}>{naicsReasoning}</Text>}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Govbidder Challenge</Text>
          <Text>Generado el {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
