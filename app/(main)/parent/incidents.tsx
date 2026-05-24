import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { getIncidents } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";

const TYPE_COLORS: Record<string, string> = {
  injury:    COLORS.error,
  behavior:  COLORS.orange,
  illness:   COLORS.yellow,
  accident:  COLORS.error,
  default:   COLORS.mid,
};

export default function ParentIncidents() {
  const { session } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const child = session?.children?.[0];

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      if (child?.id) {
        const res = await getIncidents(`enquiryId=${encodeURIComponent(child.id)}`);
        setItems(res?.incidents || (Array.isArray(res) ? res : []));
      }
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}
    >
      <Text style={s.pageTitle}>🚨 Incident Reports</Text>
      {child && <Text style={s.sub}>Incidents involving {child.child_name || child.name}</Text>}

      {items.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.success} />
          <Text style={s.emptyTxt}>All Clear!</Text>
          <Text style={s.emptySubTxt}>No incidents have been reported for your child.</Text>
        </View>
      ) : (
        items.map((item: any, i: number) => {
          const typeKey = (item.incident_type || item.type || "").toLowerCase();
          const color = TYPE_COLORS[typeKey] || TYPE_COLORS.default;
          return (
            <View key={item.id || i} style={[s.card, { borderLeftColor: color }]}>
              <View style={s.cardHeader}>
                <Ionicons name="warning-outline" size={18} color={color} />
                <Text style={[s.incidentType, { color }]}>
                  {(item.incident_type || item.type || "Incident").toUpperCase()}
                </Text>
                {item.created_at && (
                  <Text style={s.date}>
                    {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                )}
              </View>
              <Text style={s.description}>{item.description || item.details || "—"}</Text>
              {item.action_taken && (
                <View style={s.actionBox}>
                  <Text style={s.actionLabel}>Action Taken</Text>
                  <Text style={s.actionText}>{item.action_taken}</Text>
                </View>
              )}
              {item.reported_by && (
                <Text style={s.reporter}>Reported by: {item.reported_by}</Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 20, paddingBottom: 40 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:   { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  sub:         { fontSize: 13, color: COLORS.mid, marginBottom: 20, marginTop: 2 },
  emptyCard:   { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 20 },
  emptyTxt:    { fontSize: 18, fontWeight: "800", color: COLORS.success, marginTop: 12 },
  emptySubTxt: { fontSize: 13, color: COLORS.mid, marginTop: 6, textAlign: "center", lineHeight: 20 },
  card:        { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4 },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  incidentType:{ flex: 1, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  date:        { fontSize: 11, color: COLORS.mid },
  description: { fontSize: 14, color: COLORS.dark, lineHeight: 21 },
  actionBox:   { marginTop: 12, backgroundColor: COLORS.bg, borderRadius: 10, padding: 12 },
  actionLabel: { fontSize: 10, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  actionText:  { fontSize: 13, color: COLORS.dark },
  reporter:    { marginTop: 8, fontSize: 11, color: COLORS.mid, fontStyle: "italic" },
});
