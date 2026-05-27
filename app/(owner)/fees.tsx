import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getOwnerFees } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const STATUS_COLOR: Record<string,string> = {
  paid: COLORS.success, pending: COLORS.orange, overdue: COLORS.error, partial: "#0891B2",
};

export default function OwnerFees() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [pending, setPending]   = useState<any[]>([]);
  const [collected, setCollected] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [tab, setTab]           = useState<"pending"|"collected">("pending");

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getOwnerFees(token);
      setPending(Array.isArray(res?.pending) ? res.pending : []);
      setCollected(Array.isArray(res?.collected) ? res.collected : []);
    } catch { setPending([]); setCollected([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalPending  = pending.reduce((s, f) => s + (f.balance ?? f.amount ?? 0), 0);
  const totalCollected = collected.reduce((s, f) => s + (f.paid_amount ?? f.amount ?? 0), 0);

  const list = tab === "pending" ? pending : collected;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.orange} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Fee Overview</Text>
      </View>

      <View style={s.kpiRow}>
        <View style={[s.kpi, { borderColor: COLORS.error }]}>
          <Text style={[s.kpiAmt, { color: COLORS.error }]}>₹{totalPending.toLocaleString("en-IN")}</Text>
          <Text style={s.kpiLabel}>Pending</Text>
          <Text style={s.kpiCount}>{pending.length} dues</Text>
        </View>
        <View style={[s.kpi, { borderColor: COLORS.success }]}>
          <Text style={[s.kpiAmt, { color: COLORS.success }]}>₹{totalCollected.toLocaleString("en-IN")}</Text>
          <Text style={s.kpiLabel}>Collected</Text>
          <Text style={s.kpiCount}>{collected.length} paid</Text>
        </View>
      </View>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tabBtn, tab === "pending" && s.tabActive]} onPress={() => setTab("pending")}>
          <Text style={[s.tabTxt, tab === "pending" && s.tabTxtActive]}>Pending ({pending.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === "collected" && s.tabActive]} onPress={() => setTab("collected")}>
          <Text style={[s.tabTxt, tab === "collected" && s.tabTxtActive]}>Collected ({collected.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.orange} />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="card-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No records</Text></View>
        ) : list.map((item, i) => {
          const status = item.status || (tab === "collected" ? "paid" : "pending");
          const color  = STATUS_COLOR[status] || COLORS.mid;
          const amt    = tab === "pending" ? (item.balance ?? item.amount ?? 0) : (item.paid_amount ?? item.amount ?? 0);
          return (
            <View key={item.id || i} style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.child_name || item.childName || "Student"}</Text>
                <Text style={s.meta}>{item.fee_type || item.feeType || "Fee"}</Text>
                {item.due_date && <Text style={s.date}>Due: {new Date(item.due_date).toLocaleDateString("en-IN")}</Text>}
              </View>
              <View style={s.right}>
                <Text style={[s.amount, { color }]}>₹{amt.toLocaleString("en-IN")}</Text>
                <View style={[s.badge, { backgroundColor: color + "20" }]}>
                  <Text style={[s.badgeTxt, { color }]}>{status}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: COLORS.bg },
  center:    { flex: 1, alignItems: "center", justifyContent: "center" },
  header:    { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:      { marginRight: 12 },
  title:     { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  kpiRow:    { flexDirection: "row", gap: 12, padding: 16 },
  kpi:       { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 2, alignItems: "center" },
  kpiAmt:    { fontSize: 18, fontWeight: "900" },
  kpiLabel:  { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  kpiCount:  { fontSize: 11, color: COLORS.mid },
  tabs:      { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn:    { flex: 1, padding: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.orange },
  tabTxt:    { fontSize: 13, fontWeight: "600", color: COLORS.mid },
  tabTxtActive:{ color: COLORS.orange },
  content:   { padding: 16, gap: 10 },
  empty:     { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:  { fontSize: 14, color: COLORS.mid },
  card:      { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  name:      { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  meta:      { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  date:      { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  right:     { alignItems: "flex-end", gap: 6 },
  amount:    { fontSize: 15, fontWeight: "800" },
  badge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:  { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
});
