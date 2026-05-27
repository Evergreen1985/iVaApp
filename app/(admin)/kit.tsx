import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAdminKit, createKitItem } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const CATEGORIES = ["stationery","uniform","books","sports","art","other"];

export default function AdminKit() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName]         = useState("");
  const [cat, setCat]           = useState("stationery");
  const [price, setPrice]       = useState("");
  const [desc, setDesc]         = useState("");
  const [busy, setBusy]         = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAdminKit(token);
      const data = res?.items ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name) return;
    setBusy(true);
    await createKitItem(token, { name, category: cat, price: parseFloat(price) || 0, description: desc });
    setBusy(false);
    setShowForm(false); setName(""); setPrice(""); setDesc("");
    load(true);
  };

  const groupedTotal = list.reduce((sum, item) => sum + (item.price || 0), 0);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.orange} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Kit Manager</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>

      {list.length > 0 && (
        <View style={s.totalBar}>
          <Text style={s.totalLabel}>Total Kit Value</Text>
          <Text style={s.totalAmt}>₹{groupedTotal.toLocaleString("en-IN")}</Text>
          <Text style={s.totalCount}>{list.length} items</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.orange} />}>
        {list.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="bag-outline" size={40} color={COLORS.mid} />
            <Text style={s.emptyTxt}>No kit items configured</Text>
          </View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.iconBox}><Ionicons name="cube-outline" size={20} color={COLORS.orange} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.itemName}>{item.name}</Text>
              {item.description && <Text style={s.itemDesc}>{item.description}</Text>}
              <View style={s.metaRow}>
                {item.category && <View style={s.catTag}><Text style={s.catTagTxt}>{item.category}</Text></View>}
              </View>
            </View>
            <Text style={s.price}>₹{(item.price || 0).toLocaleString("en-IN")}</Text>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>Add Kit Item</Text>
            <TextInput style={s.input} placeholder="Item Name *" placeholderTextColor={COLORS.mid} value={name} onChangeText={setName} />
            <TextInput style={s.input} placeholder="Description" placeholderTextColor={COLORS.mid} value={desc} onChangeText={setDesc} />
            <TextInput style={s.input} placeholder="Price (₹)" placeholderTextColor={COLORS.mid} value={price} onChangeText={setPrice} keyboardType="numeric" />
            <Text style={s.subLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[s.catBtn, cat === c && s.catBtnActive]} onPress={() => setCat(c)}>
                  <Text style={[s.catBtnTxt, cat === c && { color: "#fff" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Add Item</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.bg },
  center:     { flex: 1, alignItems: "center", justifyContent: "center" },
  header:     { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:       { marginRight: 12 },
  title:      { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  addBtn:     { backgroundColor: COLORS.orange, borderRadius: 10, padding: 6 },
  totalBar:   { backgroundColor: COLORS.orange + "18", padding: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  totalLabel: { fontSize: 13, color: COLORS.mid, flex: 1 },
  totalAmt:   { fontSize: 16, fontWeight: "800", color: COLORS.orange },
  totalCount: { fontSize: 12, color: COLORS.mid },
  content:    { padding: 16, gap: 10 },
  empty:      { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:   { fontSize: 14, color: COLORS.mid },
  card:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  iconBox:    { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.orange + "18", alignItems: "center", justifyContent: "center" },
  itemName:   { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  itemDesc:   { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  metaRow:    { flexDirection: "row", marginTop: 4 },
  catTag:     { backgroundColor: COLORS.orange + "18", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  catTagTxt:  { fontSize: 10, fontWeight: "700", color: COLORS.orange, textTransform: "capitalize" },
  price:      { fontSize: 15, fontWeight: "800", color: COLORS.dark },
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:      { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:      { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  subLabel:   { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", marginBottom: 8 },
  catRow:     { gap: 8, marginBottom: 16 },
  catBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  catBtnActive:{ backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  catBtnTxt:  { fontSize: 12, fontWeight: "600", color: COLORS.dark, textTransform: "capitalize" },
  saveBtn:    { backgroundColor: COLORS.orange, borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:    { color: "#fff", fontSize: 16, fontWeight: "700" },
});
