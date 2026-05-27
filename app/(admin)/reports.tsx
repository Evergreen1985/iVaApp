import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAdminReports } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const REPORT_TYPES = [
  { key: "fees",       label: "Fee Collection", icon: "card-outline",      color: COLORS.orange },
  { key: "attendance", label: "Attendance",      icon: "checkmark-circle-outline", color: COLORS.edu },
  { key: "expenses",   label: "Expenses",        icon: "receipt-outline",   color: "#7C3AED" },
  { key: "admissions", label: "Admissions",      icon: "person-add-outline", color: COLORS.primary },
];

export default function AdminReports() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [activeType, setActiveType] = useState("");

  const loadReport = async (type: string) => {
    setActiveType(type);
    setLoading(true);
    try {
      const res = await getAdminReports(token, type);
      setData(res);
    } catch { setData(null); }
    setLoading(false);
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Reports</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionLabel}>Select Report Type</Text>
        <View style={s.grid}>
          {REPORT_TYPES.map((rt) => (
            <TouchableOpacity key={rt.key} style={[s.card, activeType === rt.key && { borderColor: rt.color, borderWidth: 2 }]}
              onPress={() => loadReport(rt.key)}>
              <View style={[s.iconBox, { backgroundColor: rt.color + "18" }]}>
                <Ionicons name={rt.icon as any} size={26} color={rt.color} />
              </View>
              <Text style={s.cardLabel}>{rt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: 40 }} />}

        {data && !loading && (
          <View style={s.results}>
            <Text style={s.resultsTitle}>{REPORT_TYPES.find(r => r.key === activeType)?.label} Report</Text>
            {Object.entries(data).map(([key, val]) => {
              if (typeof val === "object") return null;
              return (
                <View key={key} style={s.statRow}>
                  <Text style={s.statKey}>{key.replace(/_/g, " ")}</Text>
                  <Text style={s.statVal}>{String(val)}</Text>
                </View>
              );
            })}
            {Array.isArray(data?.items) && data.items.slice(0, 20).map((item: any, i: number) => (
              <View key={i} style={s.item}>
                <Text style={s.itemTxt}>{item.name || item.label || item.date || JSON.stringify(item).slice(0, 60)}</Text>
                <Text style={s.itemVal}>{item.amount || item.count || item.value || ""}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.bg },
  header:       { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:         { marginRight: 12 },
  title:        { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  content:      { padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  grid:         { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  card:         { width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  iconBox:      { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  cardLabel:    { fontSize: 13, fontWeight: "700", color: COLORS.dark, textAlign: "center" },
  results:      { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  resultsTitle: { fontSize: 16, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  statRow:      { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statKey:      { fontSize: 13, color: COLORS.mid, textTransform: "capitalize" },
  statVal:      { fontSize: 13, fontWeight: "700", color: COLORS.dark },
  item:         { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemTxt:      { fontSize: 13, color: COLORS.dark, flex: 1 },
  itemVal:      { fontSize: 13, fontWeight: "700", color: COLORS.dark },
});
