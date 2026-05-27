import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getExpenses, createExpense } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const CATEGORIES = ["Salaries","Utilities","Supplies","Maintenance","Food","Transport","Marketing","Other"];

export default function AdminExpenses() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc]       = useState("");
  const [amount, setAmount]   = useState("");
  const [category, setCategory] = useState("Supplies");
  const [date, setDate]       = useState("");
  const [busy, setBusy]       = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getExpenses(token);
      const data = res?.expenses ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total = list.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const handleCreate = async () => {
    if (!desc || !amount) { Alert.alert("Fill all fields"); return; }
    setBusy(true);
    await createExpense(token, { description: desc, amount: parseFloat(amount), category, date: date || new Date().toISOString().split("T")[0] });
    setBusy(false);
    setShowForm(false); setDesc(""); setAmount(""); setDate("");
    load(true);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.orange} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Expenses</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>
      <View style={s.totalBar}>
        <Text style={s.totalLabel}>Total Expenses</Text>
        <Text style={s.totalAmt}>₹{total.toLocaleString("en-IN")}</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.orange} />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="receipt-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No expenses recorded</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.catBox}><Ionicons name="receipt-outline" size={20} color={COLORS.orange} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.desc}>{item.description}</Text>
              <Text style={s.cat}>{item.category} · {item.date ? new Date(item.date).toLocaleDateString("en-IN") : ""}</Text>
            </View>
            <Text style={s.amt}>₹{parseFloat(item.amount || 0).toLocaleString("en-IN")}</Text>
          </View>
        ))}
      </ScrollView>
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>Add Expense</Text>
            <TextInput style={s.input} placeholder="Description *" placeholderTextColor={COLORS.mid} value={desc} onChangeText={setDesc} />
            <TextInput style={s.input} placeholder="Amount (₹) *" placeholderTextColor={COLORS.mid} keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <TextInput style={s.input} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={COLORS.mid} value={date} onChangeText={setDate} />
            <Text style={s.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} style={[s.chip, category === c && s.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[s.chipTxt, category === c && { color: "#fff" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Add Expense</Text>}
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
  catBox:    { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.orange + "18", alignItems: "center", justifyContent: "center" },
  desc:      { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  cat:       { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  amt:       { fontSize: 15, fontWeight: "800", color: COLORS.dark },
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle:{ fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:     { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  label:     { fontSize: 12, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", marginBottom: 8 },
  chip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipActive:{ backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  chipTxt:   { fontSize: 12, fontWeight: "600", color: COLORS.dark },
  saveBtn:   { backgroundColor: COLORS.orange, borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:   { color: "#fff", fontSize: 16, fontWeight: "700" },
});
