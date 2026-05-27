import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getFeeAssignments, recordPayment, sendFeeReminder } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const STATUS_COLORS: Record<string,string> = {
  paid: COLORS.success, pending: COLORS.orange, overdue: COLORS.error,
};

export default function AdminFees() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [filter, setFilter]     = useState("pending");
  const [selected, setSelected] = useState<any>(null);
  const [amount, setAmount]     = useState("");
  const [method, setMethod]     = useState("cash");
  const [busy, setBusy]         = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getFeeAssignments(token, filter === "all" ? undefined : filter);
      const data = res?.assignments ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleRecord = async () => {
    if (!amount) { Alert.alert("Enter amount"); return; }
    setBusy(true);
    await recordPayment(token, { assignmentId: selected.id, amount: parseFloat(amount), method });
    setBusy(false);
    setSelected(null); setAmount(""); setMethod("cash");
    load(true);
  };

  const handleReminder = async (item: any) => {
    await sendFeeReminder(token, { assignmentId: item.id });
    Alert.alert("Reminder sent");
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.orange} /></View>;

  const totalPending = list.reduce((sum, f) => sum + (f.amount || 0), 0);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={s.title}>Fees</Text>
      </View>

      {/* Summary */}
      <View style={s.summary}>
        <Text style={s.summaryLabel}>{filter === "paid" ? "Collected" : "Pending"}</Text>
        <Text style={s.summaryAmount}>₹{totalPending.toLocaleString("en-IN")}</Text>
        <Text style={s.summaryCount}>{list.length} records</Text>
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {["all","pending","overdue","paid"].map((f) => (
          <TouchableOpacity key={f} style={[s.chip, filter === f && s.chipActive]} onPress={() => setFilter(f)}>
            <Text style={[s.chipTxt, filter === f && s.chipTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.orange} />}
      >
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="card-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No fee records</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.student_name || item.studentName || "—"}</Text>
                <Text style={s.fee}>{item.fee_name || item.feeName || item.description || "Fee"}</Text>
                <Text style={s.amount}>₹{(item.amount || 0).toLocaleString("en-IN")}</Text>
                {item.due_date && <Text style={s.due}>Due: {new Date(item.due_date).toLocaleDateString("en-IN")}</Text>}
              </View>
              <View style={{ alignItems: "flex-end", gap: 8 }}>
                <View style={[s.badge, { backgroundColor: (STATUS_COLORS[item.status] || COLORS.mid) + "22" }]}>
                  <Text style={[s.badgeTxt, { color: STATUS_COLORS[item.status] || COLORS.mid }]}>{item.status}</Text>
                </View>
                {item.status !== "paid" && (
                  <TouchableOpacity style={s.payBtn} onPress={() => { setSelected(item); setAmount(String(item.amount || "")); }}>
                    <Text style={s.payTxt}>Record</Text>
                  </TouchableOpacity>
                )}
                {item.status === "overdue" && (
                  <TouchableOpacity style={s.remBtn} onPress={() => handleReminder(item)}>
                    <Ionicons name="notifications-outline" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={s.overlay} onPress={() => setSelected(null)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>Record Payment</Text>
            <Text style={s.sheetSub}>{selected?.student_name} · {selected?.fee_name || "Fee"}</Text>
            <TextInput style={s.input} placeholder="Amount (₹)" placeholderTextColor={COLORS.mid}
              keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <View style={s.methodRow}>
              {["cash","upi","bank"].map((m) => (
                <TouchableOpacity key={m} style={[s.methodBtn, method === m && s.methodActive]} onPress={() => setMethod(m)}>
                  <Text style={[s.methodTxt, method === m && { color: "#fff" }]}>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleRecord} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Confirm Payment</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  header:      { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:        { marginRight: 12 },
  title:       { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  summary:     { backgroundColor: COLORS.orange, padding: 20, alignItems: "center" },
  summaryLabel:{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "600", textTransform: "uppercase" },
  summaryAmount:{ fontSize: 28, fontWeight: "900", color: "#fff", marginTop: 4 },
  summaryCount:{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  filterBar:   { maxHeight: 48, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  chipActive:  { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  chipTxt:     { fontSize: 12, fontWeight: "600", color: COLORS.mid, textTransform: "capitalize" },
  chipTxtActive:{ color: "#fff" },
  content:     { padding: 16, gap: 10 },
  empty:       { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:    { fontSize: 14, color: COLORS.mid },
  card:        { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  cardRow:     { flexDirection: "row", gap: 10 },
  name:        { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  fee:         { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  amount:      { fontSize: 16, fontWeight: "800", color: COLORS.dark, marginTop: 4 },
  due:         { fontSize: 11, color: COLORS.error, marginTop: 2 },
  badge:       { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt:    { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  payBtn:      { backgroundColor: COLORS.success + "18", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  payTxt:      { fontSize: 12, fontWeight: "700", color: COLORS.success },
  remBtn:      { padding: 4 },
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:       { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle:  { fontSize: 17, fontWeight: "800", color: COLORS.dark },
  sheetSub:    { fontSize: 13, color: COLORS.mid, marginBottom: 16, marginTop: 2 },
  input:       { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  methodRow:   { flexDirection: "row", gap: 8, marginBottom: 16 },
  methodBtn:   { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  methodActive:{ backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  methodTxt:   { fontSize: 13, fontWeight: "700", color: COLORS.dark },
  saveBtn:     { backgroundColor: COLORS.orange, borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:     { color: "#fff", fontSize: 16, fontWeight: "700" },
});
