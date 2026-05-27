import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getPayroll, createPayroll } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function AdminPayroll() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [salary, setSalary]     = useState("");
  const [deductions, setDeductions] = useState("");
  const [month, setMonth]       = useState("");
  const [busy, setBusy]         = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getPayroll(token);
      const data = res?.payroll ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!staffName || !salary) { Alert.alert("Fill required fields"); return; }
    const net = parseFloat(salary) - parseFloat(deductions || "0");
    setBusy(true);
    await createPayroll(token, { staffName, salary: parseFloat(salary), deductions: parseFloat(deductions || "0"), netPay: net, month: month || new Date().toISOString().slice(0, 7) });
    setBusy(false);
    setShowForm(false); setStaffName(""); setSalary(""); setDeductions(""); setMonth("");
    load(true);
  };

  const totalNet = list.reduce((sum, p) => sum + (p.net_pay || p.netPay || 0), 0);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.orange} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Payroll</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>
      <View style={s.totalBar}>
        <Text style={s.totalLabel}>Total Payroll</Text>
        <Text style={s.totalAmt}>₹{totalNet.toLocaleString("en-IN")}</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.orange} />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="cash-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No payroll records</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.avatar}><Text style={s.avatarTxt}>{(item.staff_name || item.staffName || "S")[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.staff_name || item.staffName}</Text>
              <Text style={s.meta}>{item.month} · Deductions ₹{(item.deductions || 0).toLocaleString("en-IN")}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.net}>₹{(item.net_pay || item.netPay || 0).toLocaleString("en-IN")}</Text>
              <Text style={s.netLabel}>Net Pay</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>Add Payroll Entry</Text>
            <TextInput style={s.input} placeholder="Staff Name *" placeholderTextColor={COLORS.mid} value={staffName} onChangeText={setStaffName} />
            <TextInput style={s.input} placeholder="Gross Salary (₹) *" placeholderTextColor={COLORS.mid} keyboardType="numeric" value={salary} onChangeText={setSalary} />
            <TextInput style={s.input} placeholder="Deductions (₹)" placeholderTextColor={COLORS.mid} keyboardType="numeric" value={deductions} onChangeText={setDeductions} />
            <TextInput style={s.input} placeholder="Month (YYYY-MM)" placeholderTextColor={COLORS.mid} value={month} onChangeText={setMonth} />
            {salary ? <Text style={s.preview}>Net Pay: ₹{(parseFloat(salary || "0") - parseFloat(deductions || "0")).toLocaleString("en-IN")}</Text> : null}
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Save</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: COLORS.bg },
  center:    { flex: 1, alignItems: "center", justifyContent: "center" },
  header:    { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:      { marginRight: 12 },
  title:     { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  addBtn:    { backgroundColor: COLORS.orange, borderRadius: 10, padding: 6 },
  totalBar:  { backgroundColor: COLORS.orange, padding: 16, alignItems: "center" },
  totalLabel:{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600", textTransform: "uppercase" },
  totalAmt:  { fontSize: 26, fontWeight: "900", color: "#fff", marginTop: 2 },
  content:   { padding: 16, gap: 10 },
  empty:     { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:  { fontSize: 14, color: COLORS.mid },
  card:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  avatar:    { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.orange + "22", alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 16, fontWeight: "800", color: COLORS.orange },
  name:      { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  meta:      { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  net:       { fontSize: 16, fontWeight: "800", color: COLORS.dark },
  netLabel:  { fontSize: 10, color: COLORS.mid },
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle:{ fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:     { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  preview:   { fontSize: 14, fontWeight: "700", color: COLORS.success, marginBottom: 12, textAlign: "center" },
  saveBtn:   { backgroundColor: COLORS.orange, borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:   { color: "#fff", fontSize: 16, fontWeight: "700" },
});
