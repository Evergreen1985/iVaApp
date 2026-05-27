import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Alert, Modal, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getEnquiries, updateEnquiryStatus } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const STATUSES = ["new","called","visited","enrolled","not-interested"];
const STATUS_COLORS: Record<string,string> = {
  new: "#3B82F6", called: "#F59E0B", visited: "#8B5CF6",
  enrolled: COLORS.success, "not-interested": COLORS.error,
};

export default function AdminEnquiries() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refresh, setRefresh]     = useState(false);
  const [filter, setFilter]       = useState("all");
  const [selected, setSelected]   = useState<any>(null);
  const [notes, setNotes]         = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [busy, setBusy]           = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getEnquiries(token, filter === "all" ? undefined : filter);
      const data = res?.enquiries ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleUpdate = async () => {
    if (!newStatus || !selected) return;
    setBusy(true);
    await updateEnquiryStatus(token, selected.id, newStatus, notes);
    setBusy(false);
    setSelected(null);
    load(true);
  };


  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.orange} /></View>;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={s.title}>Enquiries</Text>
        <Text style={s.count}>{list.length}</Text>
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {["all", ...STATUSES].map((s2) => (
          <TouchableOpacity key={s2} style={[s.chip, filter === s2 && s.chipActive]}
            onPress={() => setFilter(s2)}>
            <Text style={[s.chipTxt, filter === s2 && s.chipTxtActive]}>{s2}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.orange} />}>
        {list.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="person-add-outline" size={40} color={COLORS.mid} />
            <Text style={s.emptyTxt}>No enquiries</Text>
          </View>
        ) : list.map((item, i) => (
          <TouchableOpacity key={item.id || i} style={s.card}
            onPress={() => { setSelected(item); setNewStatus(item.status || "new"); setNotes(""); }}>
            <View style={s.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.child_name || item.childName || "—"}</Text>
                <Text style={s.meta}>{item.parent_name || item.parentName} · {item.phone}</Text>
                {item.program && <Text style={s.meta}>{item.program}</Text>}
              </View>
              <View style={[s.badge, { backgroundColor: (STATUS_COLORS[item.status] || COLORS.mid) + "22" }]}>
                <Text style={[s.badgeTxt, { color: STATUS_COLORS[item.status] || COLORS.mid }]}>
                  {item.status || "new"}
                </Text>
              </View>
            </View>
            {item.notes && <Text style={s.notesTxt} numberOfLines={1}>{item.notes}</Text>}
            <Text style={s.date}>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : ""}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Update modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={s.overlay} onPress={() => setSelected(null)}>
          <Pressable style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>{selected?.child_name || "Update Enquiry"}</Text>
            <Text style={s.sheetSub}>{selected?.parent_name} · {selected?.phone}</Text>


            <Text style={s.label}>Status</Text>
            <View style={s.statusRow}>
              {STATUSES.map((st) => (
                <TouchableOpacity key={st}
                  style={[s.statusBtn, newStatus === st && { backgroundColor: STATUS_COLORS[st] }]}
                  onPress={() => setNewStatus(st)}>
                  <Text style={[s.statusBtnTxt, newStatus === st && { color: "#fff" }]}>{st}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Notes</Text>
            <TextInput style={s.input} placeholder="Add notes…" placeholderTextColor={COLORS.mid}
              value={notes} onChangeText={setNotes} multiline />

            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleUpdate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Update Status</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.bg },
  center:       { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  header:       { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56,
                  backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:         { marginRight: 12 },
  title:        { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  count:        { fontSize: 13, color: COLORS.mid, fontWeight: "600" },
  filterBar:    { maxHeight: 48, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  chipActive:   { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  chipTxt:      { fontSize: 12, fontWeight: "600", color: COLORS.mid, textTransform: "capitalize" },
  chipTxtActive:{ color: "#fff" },
  content:      { padding: 16, gap: 10 },
  empty:        { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:     { fontSize: 14, color: COLORS.mid },
  card:         { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  cardTop:      { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  name:         { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  meta:         { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  badge:        { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt:     { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  notesTxt:     { fontSize: 12, color: COLORS.mid, marginTop: 6 },
  date:         { fontSize: 11, color: COLORS.mid, marginTop: 4 },
  overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:        { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  sheetHandle:  { width: 36, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle:   { fontSize: 17, fontWeight: "800", color: COLORS.dark },
  sheetSub:     { fontSize: 13, color: COLORS.mid, marginBottom: 16, marginTop: 2 },
  registerBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  backgroundColor: COLORS.edu, borderRadius: 12, padding: 13, marginBottom: 20 },
  registerTxt:  { color: "#fff", fontSize: 14, fontWeight: "700" },
  label:        { fontSize: 12, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", marginBottom: 8 },
  statusRow:    { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  statusBtn:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  statusBtnTxt: { fontSize: 12, fontWeight: "600", color: COLORS.dark, textTransform: "capitalize" },
  input:        { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark,
                  borderWidth: 1, borderColor: COLORS.border, minHeight: 72, textAlignVertical: "top", marginBottom: 16 },
  saveBtn:      { backgroundColor: COLORS.orange, borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:      { color: "#fff", fontSize: 16, fontWeight: "700" },
});
