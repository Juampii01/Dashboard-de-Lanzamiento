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
  page: { fontFamily: "Helvetica", backgroundColor: "#FFFFFF", fontSize: 8, color: INK },

  header: { backgroundColor: NAVY, paddingTop: 18, paddingBottom: 14, paddingHorizontal: 34 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logoBox: { width: 40, height: 40, objectFit: "contain", borderRadius: 5, backgroundColor: "#fff", padding: 3 },
  companyName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#FFFFFF", lineHeight: 1.12 },
  tagline: { fontSize: 7.5, color: GOLD, marginTop: 3, letterSpacing: 0.4 },
  docBadge: { borderLeft: `2 solid ${GOLD}`, paddingLeft: 9 },
  docKicker: { fontSize: 6.5, color: "rgba(255,255,255,0.55)", letterSpacing: 1.6, textTransform: "uppercase" },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 1, textAlign: "right", marginTop: 2 },
  goldBar: { backgroundColor: GOLD, height: 3 },

  statsBand: { flexDirection: "row", backgroundColor: LIGHT, marginHorizontal: 34, marginTop: 14, borderRadius: 7, paddingVertical: 11, border: `0.5 solid ${LINE}` },
  statItem: { flex: 1, alignItems: "center", borderRight: `0.5 solid ${LINE}`, paddingHorizontal: 4 },
  statItemLast: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  statNum: { fontSize: 17, fontFamily: "Helvetica-Bold", color: NAVY },
  statLabel: { fontSize: 6, color: MUTED, letterSpacing: 0.6, marginTop: 3, textTransform: "uppercase" },

  body: { flexDirection: "row", paddingHorizontal: 34, paddingTop: 16, gap: 18 },
  leftCol: { width: "58%" },
  rightCol: { width: "42%" },

  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 4 },
  sectionRule: { borderBottom: `1.5 solid ${GOLD}`, marginBottom: 8, width: 26 },

  // milestone row
  mRow: { flexDirection: "row", marginBottom: 9, alignItems: "flex-start" },
  mNum: { width: 16, height: 16, borderRadius: 8, backgroundColor: GOLD, alignItems: "center", justifyContent: "center", marginRight: 9, marginTop: 0.5, flexShrink: 0 },
  mNumText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY_DARK },
  mBody: { flex: 1 },
  mDay: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 0.6, textTransform: "uppercase" },
  mTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, textDecoration: "line-through", marginTop: 1 },
  mDesc: { fontSize: 8, color: INK, lineHeight: 1.45, marginTop: 2 },

  // NAICS recap card
  naicsCard: { backgroundColor: NAVY, borderRadius: 8, paddingTop: 11, paddingBottom: 11, paddingHorizontal: 12, marginBottom: 13 },
  naicsCardTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.7)", textAlign: "center", letterSpacing: 1.4, marginBottom: 7 },
  naicsCode: { fontSize: 28, fontFamily: "Helvetica-Bold", color: GOLD, textAlign: "center", letterSpacing: 1 },
  naicsUnderline: { height: 2, width: 34, backgroundColor: GOLD, alignSelf: "center", marginTop: 5, marginBottom: 6, borderRadius: 2 },
  naicsDesc: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF", textAlign: "center", lineHeight: 1.4 },

  // callout
  callout: { backgroundColor: LIGHT, borderRadius: 6, borderLeft: `2.5 solid ${GOLD}`, padding: 10 },
  calloutTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 3 },
  calloutText: { fontSize: 7.8, color: INK, lineHeight: 1.5 },

  footer: { backgroundColor: NAVY_DARK, paddingVertical: 9, paddingHorizontal: 34, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLeft: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 0.6 },
  footerRight: { fontSize: 7.5, color: GOLD, textAlign: "right" },
});

interface JourneySummaryProps {
  companyName: string;
  currentDay: number;
  yearFounded?: number | null;
  primaryNaics?: string | null;
  naicsDescription?: string | null;
  relatedCodesCount?: number;
  keywordsCount?: number;
  generatedAt: string;
  logoDataUri?: string | null;
}

export function JourneySummaryPDF({
  companyName,
  currentDay,
  yearFounded,
  primaryNaics,
  naicsDescription,
  relatedCodesCount = 0,
  keywordsCount = 0,
  generatedAt,
  logoDataUri,
}: JourneySummaryProps) {
  const isFinal = currentDay >= 4;

  const milestones = [
    {
      day: "Día 1",
      title: "Perfil Estratégico",
      desc: `Definiste tu perfil de empresa y tu código NAICS principal${primaryNaics ? ` ${primaryNaics}` : ""}.`,
    },
    {
      day: "Día 2",
      title: "Mapa de Códigos",
      desc: `Mapeaste ${relatedCodesCount} código${relatedCodesCount === 1 ? "" : "s"} relacionado${relatedCodesCount === 1 ? "" : "s"} y ${keywordsCount} keyword${keywordsCount === 1 ? "" : "s"} del gobierno.`,
    },
    {
      day: "Día 3",
      title: "Web + Portales",
      desc: "Generaste tu sitio web profesional y desbloqueaste los portales para encontrar oportunidades.",
    },
    {
      day: "Día 4",
      title: "Capability Statement",
      desc: "Creaste tu Capability Statement profesional, listo para presentar ante el gobierno.",
    },
  ].slice(0, currentDay);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 11, maxWidth: "66%" }}>
              {logoDataUri ? <Image src={logoDataUri} style={styles.logoBox} /> : null}
              <View>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.tagline}>
                  GovBidder Challenge · {isFinal ? "Challenge completado" : "Resumen Días 1 a 3"}
                </Text>
              </View>
            </View>
            <View style={styles.docBadge}>
              <Text style={styles.docKicker}>{isFinal ? "Resumen final" : "Resumen"}</Text>
              <Text style={styles.docTitle}>{isFinal ? "DÍA 4" : "DÍA 3"}</Text>
            </View>
          </View>
        </View>
        <View style={styles.goldBar} />

        {/* Stats band */}
        <View style={styles.statsBand}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{yearFounded ? `'${String(yearFounded).slice(2)}` : "—"}</Text>
            <Text style={styles.statLabel}>Fundada</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{relatedCodesCount}</Text>
            <Text style={styles.statLabel}>Códigos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{keywordsCount}</Text>
            <Text style={styles.statLabel}>Keywords</Text>
          </View>
          <View style={styles.statItemLast}>
            <Text style={styles.statNum}>{`${currentDay}/4`}</Text>
            <Text style={styles.statLabel}>Días</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* LEFT — milestones */}
          <View style={styles.leftCol}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lo que lograste</Text>
              <View style={styles.sectionRule} />
              {milestones.map((m, i) => (
                <View key={i} style={styles.mRow}>
                  <View style={styles.mNum}>
                    <Text style={styles.mNumText}>{i + 1}</Text>
                  </View>
                  <View style={styles.mBody}>
                    <Text style={styles.mDay}>{m.day}</Text>
                    <Text style={styles.mTitle}>{m.title}</Text>
                    <Text style={styles.mDesc}>{m.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* RIGHT — NAICS recap + callout */}
          <View style={styles.rightCol}>
            {primaryNaics ? (
              <View style={styles.naicsCard}>
                <Text style={styles.naicsCardTitle}>CÓDIGO NAICS PRINCIPAL</Text>
                <Text style={styles.naicsCode}>{primaryNaics}</Text>
                <View style={styles.naicsUnderline} />
                {naicsDescription ? <Text style={styles.naicsDesc}>{naicsDescription}</Text> : null}
              </View>
            ) : null}

            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>
                {isFinal ? "¡Completaste el Challenge!" : "Próximo paso · Día 4"}
              </Text>
              <Text style={styles.calloutText}>
                {isFinal
                  ? "Ya tenés tu perfil, tus códigos, tu web y tu Capability Statement. Es hora de presentarte y empezar a competir por contratos del gobierno."
                  : "Creá tu Capability Statement: el documento profesional de una página que te abre las puertas para presentarte ante las agencias del gobierno."}
              </Text>
            </View>
          </View>
        </View>

        {/* Spacer + roadmap */}
        <View style={{ flexGrow: 1 }} />
        <ChallengeRoadmap currentDay={currentDay} title={isFinal ? "Challenge completado" : "Tu ruta en el Challenge"} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLeft}>GOVBIDDER CHALLENGE</Text>
          <Text style={styles.footerRight}>Generado el {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
