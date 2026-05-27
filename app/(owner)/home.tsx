import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../src/lib/constants";
import { getOwnerDashboard } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

type NavItem = { label: string; icon: string; route: string; color: string };

const NAV: NavItem[] = [
  { label: "Admissions",  icon: "person-add-outline",  route: "/(owner)/admissions",  color: COLORS.edu },
  { label: "Fees",        icon: "card-outline",         route: "/(owner)/fees",         color: COLORS.orange },
  { label: "Expenses",    icon: "receipt-outline",      route: "/(owner)/expenses",     color: "#7C3AED" },
  { label: "Attendance",  icon: "checkmark-circle-outline", route: "/(owner)/attendance", color: COLORS.primary },
  { label: "Staff",       icon: "people-outline",       route: "/(owner)/staff",        color: COLORS.dark },
  { label: "Messages",    icon: "chatbubbles-outline",  route: "/(owner)/messages",     color: "#0891B2" },
  { label: "AI Insights", icon: "sparkles-outline",     route: "/(owner)/insights",     color: "#059669" },
  { label: "Roles",       icon: "shield-outline",       route: "/(owner)/roles",        color: COLORS.primary },
  { label: "Cleanup",     icon: "trash-outline",        route: "/(owner)/cleanup",      color: COLORS.error },
  { label: "Tests",       icon: "flask-outline",        route: "/(owner)/tests",        color: COLORS.mid },
];

export default function OwnerHome() {
  const router = useRouter();
  const { session, clearSession } = useSession();
  const token = session?.token || "";
  const [kpi, setKpi]         = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try { setKpi(await getOwnerDashboard(token)); } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleLogout = () => Alert.alert("Logout", "Sign out of owner portal?", [
    { text: "Cancel", style: "cancel" },
    { text: "Logout", style: "destructive", onPress: async () => { await clearSession(); router.replace("/(auth)/login"); } },
  ]);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor="#7C3AED" />}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Owner Portal</Text>
          <Text style={s.headerSub}>{session?.name || session?.username || "Owner"}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color="#7C3AED" style={{ marginVertical: 24 }} /> : kpi && (
        <View style={s.kpiGrid}>
          <View style={s.kpiCard}>
            <Text style={s.kpiVal}>{kpi.enrolled ?? kpi.students ?? "—"}</Text>
            <Text style={s.kpiLabel}>Students</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={[s.kpiVal, { color: COLORS.orange }]}>₹{((kpi.pendingFees ?? 0) / 1000).toFixed(0)}k</Text>
            <Text style={s.kpiLabel}>Fees Pending</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={[s.kpiVal, { color: COLORS.primary }]}>{kpi.attendanceRate ?? "—"}%</Text>
            <Text style={s.kpiLabel}>Attendance</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={[s.kpiVal, { color: "#7C3AED" }]}>₹{((kpi.monthlyExpenses ?? 0) / 1000).toFixed(0)}k</Text>
            <Text style={s.kpiLabel}>Expenses</Text>
          </View>
          {kpi.unreadMessages > 0 && (
            <View style={[s.kpiCard, { borderColor: "#0891B2" }]}>
              <Text style={[s.kpiVal, { color: "#0891B2" }]}>{kpi.unreadMessages}</Text>
              <Text style={s.kpiLabel}>Unread Msgs</Text>
            </View>
          )}
          {kpi.newAdmissions > 0 && (
            <View style={[s.kpiCard, { borderColor: COLORS.edu }]}>
              <Text style={[s.kpiVal, { color: COLORS.edu }]}>{kpi.newAdmissions}</Text>
              <Text style={s.kpiLabel}>New Admissions</Text>
            </View>
          )}
        </View>
      )}

      <Text style={s.sectionLabel}>Quick Access</Text>
      <View style={s.grid}>
        {NAV.map(item => (
          <TouchableOpacity key={item.label} style={s.card} activeOpacity={0.75}
            onPress={() => router.push(item.route as any)}>
            <View style={[s.iconBox, { backgroundColor: item.color + "18" }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={s.cardLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 16, paddingBottom: 40 },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#7C3AED", borderRadius: 20, padding: 20, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  logoutBtn:   { padding: 8 },
  kpiGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  kpiCard:     { flex: 1, minWidth: "30%", backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  kpiVal:      { fontSize: 20, fontWeight: "900", color: COLORS.dark },
  kpiLabel:    { fontSize: 11, color: COLORS.mid, marginTop: 2, textAlign: "center" },
  sectionLabel:{ fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  grid:        { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card:        { width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  iconBox:     { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  cardLabel:   { fontSize: 12, fontWeight: "700", color: COLORS.dark, textAlign: "center" },
});
