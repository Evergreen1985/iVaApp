import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getFollowUps, createFollowUp } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function AdminFollowUps() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [enquiryId, setEnquiryId] = useState("");
  const [notes, setNotes]     = useState("");
  const [nextDate, setNextDate] = useState("");
  const [busy, setBusy]       = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getFollowUps(token);
      const data = res?.followups ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!notes) { Alert.alert("Enter notes"); return; }
    setBusy(true);
    await createFollowUp(token, { enquiryId, notes, nextFollowUpDate: nextDate });
    setBusy(false);
    setShowForm(false); setNotes(""); setNextDate(""); setEnquiryId("");
    load(true);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Follow-ups</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="call-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No follow-ups</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.dot} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.enquiry_name || item.child_name || "Enquiry"}</Text>
              <Text style={s.notes} numberOfLines={2}>{item.notes}</Text>
              {item.next_follow_up_date && <Text style={s.next}>Next: {new Date(item.next_follow_up_date).toLocaleDateString("en-IN")}</Text>}
              <Text style={s.date}>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : ""}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>New Follow-up</Text>
            <TextInput style={s.input} placeholder="Enquiry ID (optional)" placeholderTextColor={COLORS.mid} value={enquiryId} onChangeText={setEnquiryId} />
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: "top" }]} placeholder="Notes *" placeholderTextColor={COLORS.mid} value={notes} onChangeText={setNotes} multiline />
            <TextInput style={s.input} placeholder="Next follow-up date (YYYY-MM-DD)" placeholderTextColor={COLORS.mid} value={nextDate} onChangeText={setNextDate} />
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Save Follow-up</Text>}
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
  addBtn:    { backgroundColor: COLORS.edu, borderRadius: 10, padding: 6 },
  content:   { padding: 16, gap: 10 },
  empty:     { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:  { fontSize: 14, color: COLORS.mid },
  card:      { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.edu, marginTop: 6 },
  name:      { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  notes:     { fontSize: 13, color: COLORS.mid, marginTop: 2, lineHeight: 18 },
  next:      { fontSize: 12, color: COLORS.orange, marginTop: 4, fontWeight: "600" },
  date:      { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle:{ fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:     { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  saveBtn:   { backgroundColor: COLORS.edu, borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:   { color: "#fff", fontSize: 16, fontWeight: "700" },
});
