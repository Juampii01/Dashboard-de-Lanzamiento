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
    backgroundColor: "#FFFFFF",
    padding: 0,
  },
  outerBorder: {
    margin: 24,
    border: "4 solid #1a2a6c",
    flex: 1,
    padding: 0,
  },
  innerBorder: {
    margin: 6,
    border: "1 solid #c9a227",
    flex: 1,
    padding: "48 64",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  govbidder: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#c9a227",
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  certTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#1a2a6c",
    textAlign: "center",
    marginBottom: 4,
  },
  certSub: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
  },
  presentedTo: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 8,
  },
  recipientName: {
    fontSize: 26,
    fontFamily: "Helvetica-BoldOblique",
    color: "#1a2a6c",
    textAlign: "center",
    marginBottom: 24,
  },
  description: {
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 400,
    marginBottom: 40,
  },
  goldLine: {
    height: 2,
    backgroundColor: "#c9a227",
    width: 200,
    marginBottom: 24,
  },
  date: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "center",
  },
  trophy: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 16,
  },
});

interface CertificatePDFProps {
  fullName: string;
  completedAt: string;
}

export function CertificatePDF({ fullName, completedAt }: CertificatePDFProps) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            <Text style={styles.govbidder}>Govbidder</Text>
            <Text style={styles.certTitle}>Certificado de Finalización</Text>
            <Text style={styles.certSub}>Code Challenge — Aprende a Venderle al Gobierno</Text>

            <View style={styles.goldLine} />

            <Text style={styles.presentedTo}>Este certificado se otorga a</Text>
            <Text style={styles.recipientName}>{fullName}</Text>

            <Text style={styles.description}>
              Por haber completado exitosamente los 4 días del Govbidder Code Challenge,
              demostrando dedicación y aprendiendo las bases del mercado de contratación
              federal de los Estados Unidos de América.
            </Text>

            <View style={styles.goldLine} />

            <Text style={styles.date}>{completedAt}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
