import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAdminPTM, createPTMSlot } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function AdminPTM() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate]         = useState("");
  const [time, setTime]         = useState("");
  const [sectionId, setSectionId] = useState("");
  const [note, setNote]         = useState("");
  const [busy, setBusy]         = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAdminPTM(token);
      const data = res?.ptm ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!date) return;
    setBusy(true);
    await createPTMSlot(token, { date, time, sectionId, note });
    setBusy(false);
    setShowForm(false); setDate(""); setTime(""); setSectionId(""); setNote("");
    load(true);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Parent-Teacher Meetings</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor="#7C3AED" />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="people-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No PTM scheduled</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.iconBox}><Ionicons name="people" size={20} color="#7C3AED" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.parent_name || item.student_name || "PTM Slot"}</Text>
              <Text style={s.meta}>{item.date ? new Date(item.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : ""} {item.time ? `· ${item.time}` : ""}</Text>
              {item.section_name && <Text style={s.meta}>{item.section_name}</Text>}
              {item.note && <Text style={s.meta}>{item.note}</Text>}
            </View>
            <View style={[s.badge, { backgroundColor: item.status === "completed" ? COLORS.success + "22" : "#7C3AED22" }]}>
              <Text style={[s.badgeTxt, { color: item.status === "completed" ? COLORS.success : "#7C3AED" }]}>{item.status || "scheduled"}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>Schedule PTM</Text>
            <TextInput style={s.input} placeholder="Date (YYYY-MM-DD) *" placeholderTextColor={COLORS.mid} value={date} onChangeText={setDate} />
            <TextInput style={s.input} placeholder="Time (e.g. 10:00 AM)" placeholderTextColor={COLORS.mid} value={time} onChangeText={setTime} />
            <TextInput style={s.input} placeholder="Section ID" placeholderTextColor={COLORS.mid} value={sectionId} onChangeText={setSectionId} />
            <TextInput style={s.input} placeholder="Notes" placeholderTextColor={COLORS.mid} value={note} onChangeText={setNote} />
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Schedule</Text>}
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
  title:     { flex: 1, fontSize: 16, fontWeight: "800", color: COLORS.dark },
  addBtn:    { backgroundColor: "#7C3AED", borderRadius: 10, padding: 6 },
  content:   { padding: 16, gap: 10 },
  empty:     { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:  { fontSize: 14, color: COLORS.mid },
  card:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  iconBox:   { width: 44, height: 44, borderRadius: 14, backgroundColor: "#7C3AED22", alignItems: "center", justifyContent: "center" },
  name:      { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  meta:      { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  badge:     { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt:  { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle:{ fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:     { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  saveBtn:   { backgroundColor: "#7C3AED", borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:   { color: "#fff", fontSize: 16, fontWeight: "700" },
});
