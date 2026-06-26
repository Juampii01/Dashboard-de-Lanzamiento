import { Text, View, StyleSheet } from "@react-pdf/renderer";

// Tira "Tu ruta en el Challenge" reutilizable por todos los PDFs de día.
// Los días completados (1..currentDay) se muestran HECHOS: punto dorado + texto
// tachado. Los pendientes: punto suave + texto normal.

const NAVY      = "#1a2a6c";
const NAVY_DARK = "#0f1e3d";
const GOLD      = "#c9a227";
const GOLD_SOFT = "#f3ead0";
const MUTED     = "#6b7280";
const LIGHT     = "#f4f6fa";
const LINE      = "#e2e6ee";

const r = StyleSheet.create({
  wrap: { marginHorizontal: 34, marginTop: 4, marginBottom: 14, backgroundColor: LIGHT, borderRadius: 7, border: `0.5 solid ${LINE}`, paddingVertical: 11, paddingHorizontal: 14 },
  title: { fontSize: 7, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 9, textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  node: { flex: 1, alignItems: "center", paddingHorizontal: 3 },
  dot: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  dotText: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  day: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 0.5, textTransform: "uppercase" },
  dayDone: { color: MUTED, textDecoration: "line-through" },
  label: { fontSize: 6.5, color: MUTED, textAlign: "center", marginTop: 2, lineHeight: 1.3 },
  labelDone: { textDecoration: "line-through" },
});

const DAYS = [
  { day: "Día 1", label: "Perfil\nEstratégico" },
  { day: "Día 2", label: "Mapa de\nCódigos" },
  { day: "Día 3", label: "Web +\nPortales" },
  { day: "Día 4", label: "Capability\nStatement" },
];

export function ChallengeRoadmap({
  currentDay,
  title = "Tu ruta en el Challenge",
}: {
  currentDay: number;
  title?: string;
}) {
  return (
    <View style={r.wrap}>
      <Text style={r.title}>{title}</Text>
      <View style={r.row}>
        {DAYS.map((n, i) => {
          const done = i + 1 <= currentDay;
          return (
            <View key={i} style={r.node}>
              <View style={[r.dot, { backgroundColor: done ? GOLD : GOLD_SOFT }]}>
                <Text style={[r.dotText, { color: done ? NAVY_DARK : MUTED }]}>{i + 1}</Text>
              </View>
              <Text style={done ? [r.day, r.dayDone] : r.day}>{n.day}</Text>
              <Text style={done ? [r.label, r.labelDone] : r.label}>{n.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
