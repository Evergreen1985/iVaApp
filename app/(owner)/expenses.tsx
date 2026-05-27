import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getOwnerExpenses, createOwnerExpense, deleteOwnerExpense } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const CATEGORIES = ["salaries","utilities","maintenance","supplies","repairs","events","other"];
const CAT_COLOR: Record<string,string> = {
  salaries: COLORS.primary, utilities: "#0891B2", maintenance: COLORS.orange,
  supplies: COLORS.edu, repairs: COLORS.error, events: "#7C3AED", other: COLORS.mid,
};

export default function OwnerExpenses() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";

  const now = new Date();
  const [month, setMonth]       = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);
  const [list, setList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("salaries");
  const [title, setTitle]       = useState("");
  const [amount, setAmount]     = useState("");
  const [notes, setNotes]       = useState("");
  const [busy, setBusy]         = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getOwnerExpenses(token, month);
      const data = res?.expenses ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [month]);

  const handleCreate = async () => {
    if (!title || !amount) return;
    setBusy(true);
    await createOwnerExpense(token, { category, title, amount: parseFloat(amount), notes, month });
    setBusy(false);
    setShowForm(false); setTitle(""); setAmount(""); setNotes("");
    load(true);
  };

  const handleDelete = (item: any) => Alert.alert("Delete Expense", `Remove "${item.title}"?`, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => {
      await deleteOwnerExpense(token, item.id);
      setList(prev => prev.filter(e => e.id !== item.id));
    }},
  ]);

  const total = list.reduce((s, e) => s + (e.amount || 0), 0);

  const catTotals = CATEGORIES.map(c => ({
    cat: c, total: list.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter(c => c.total > 0);

  const prevMonth = () => {
    const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  };
  const nextMonth = () => {
    const d = new Date(month + "-01"); d.setMonth(d.getMonth() + 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Expenses</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>

      <View style={s.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={s.navBtn}><Ionicons name="chevron-back" size={20} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.monthTxt}>{new Date(month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.navBtn}><Ionicons name="chevron-forward" size={20} color={COLORS.dark} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor="#7C3AED" />}>
        {loading ? <ActivityIndicator color="#7C3AED" style={{ marginTop: 40 }} /> : <>
          <View style={s.totalCard}>
            <Text style={s.totalLabel}>Total Expenses</Text>
            <Text style={s.totalAmt}>₹{total.toLocaleString("en-IN")}</Text>
          </View>

          {catTotals.length > 0 && (
            <View style={s.catGrid}>
              {catTotals.map(({ cat, total: t }) => (
                <View key={cat} style={[s.catCard, { borderColor: CAT_COLOR[cat] + "50" }]}>
                  <View style={[s.catDot, { backgroundColor: CAT_COLOR[cat] }]} />
                  <Text style={s.catName}>{cat}</Text>
                  <Text style={[s.catAmt, { color: CAT_COLOR[cat] }]}>₹{t.toLocaleString("en-IN")}</Text>
                </View>
              ))}
            </View>
          )}

          {list.length === 0 ? (
            <View style={s.empty}><Ionicons name="receipt-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No expenses this month</Text></View>
          ) : list.map((item, i) => (
            <View key={item.id || i} style={s.card}>
              <View style={[s.catDotLg, { backgroundColor: CAT_COLOR[item.category] || COLORS.mid }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.title}</Text>
                <Text style={s.meta}>{item.category} · {item.date ? new Date(item.date).toLocaleDateString("en-IN") : ""}</Text>
                {item.notes && <Text style={s.notes}>{item.notes}</Text>}
              </View>
              <View style={s.right}>
                <Text style={s.amount}>₹{(item.amount || 0).toLocaleString("en-IN")}</Text>
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>Add Expense</Text>
            <TextInput style={s.input} placeholder="Title *" placeholderTextColor={COLORS.mid} value={title} onChangeText={setTitle} />
            <TextInput style={s.input} placeholder="Amount (₹) *" placeholderTextColor={COLORS.mid} value={amount} onChangeText={setAmount} keyboardType="numeric" />
            <TextInput style={s.input} placeholder="Notes (optional)" placeholderTextColor={COLORS.mid} value={notes} onChangeText={setNotes} />
            <Text style={s.subLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[s.catBtn, category === c && { backgroundColor: CAT_COLOR[c], borderColor: CAT_COLOR[c] }]}
                  onPress={() => setCategory(c)}>
                  <Text style={[s.catBtnTxt, category === c && { color: "#fff" }]}>{c}</Text>
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
  header:    { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:      { marginRight: 12 },
  title:     { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  addBtn:    { backgroundColor: "#7C3AED", borderRadius: 10, padding: 6 },
  monthNav:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  navBtn:    { padding: 8 },
  monthTxt:  { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  content:   { padding: 16, gap: 10, paddingBottom: 40 },
  totalCard: { backgroundColor: "#7C3AED", borderRadius: 16, padding: 20, alignItems: "center" },
  totalLabel:{ fontSize: 13, color: "rgba(255,255,255,0.8)" },
  totalAmt:  { fontSize: 28, fontWeight: "900", color: "#fff", marginTop: 4 },
  catGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catCard:   { flex: 1, minWidth: "30%", backgroundColor: "#fff", borderRadius: 12, padding: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  catDot:    { width: 8, height: 8, borderRadius: 4 },
  catName:   { flex: 1, fontSize: 11, color: COLORS.mid, fontWeight: "600", textTransform: "capitalize" },
  catAmt:    { fontSize: 11, fontWeight: "800" },
  catDotLg:  { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  empty:     { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTxt:  { fontSize: 14, color: COLORS.mid },
  card:      { flexDirection: "row", gap: 10, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  name:      { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  meta:      { fontSize: 12, color: COLORS.mid, marginTop: 2, textTransform: "capitalize" },
  notes:     { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  right:     { alignItems: "flex-end", gap: 6 },
  amount:    { fontSize: 14, fontWeight: "800", color: COLORS.dark },
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle:{ fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:     { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  subLabel:  { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", marginBottom: 8 },
  catRow:    { gap: 8, marginBottom: 16 },
  catBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  catBtnTxt: { fontSize: 12, fontWeight: "600", color: COLORS.dark, textTransform: "capitalize" },
  saveBtn:   { backgroundColor: "#7C3AED", borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:   { color: "#fff", fontSize: 16, fontWeight: "700" },
});
