import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAdminCalendar, createCalendarEvent, deleteCalendarEvent } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const EVENT_TYPES = ["holiday","event","ptm","exam","activity"];
const TYPE_COLORS: Record<string,string> = {
  holiday: COLORS.error, event: COLORS.primary, ptm: "#8B5CF6",
  exam: COLORS.orange, activity: COLORS.edu,
};

export default function AdminCalendar() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [eTitle, setETitle]   = useState("");
  const [eDate, setEDate]     = useState("");
  const [eType, setEType]     = useState("event");
  const [eDesc, setEDesc]     = useState("");
  const [busy, setBusy]       = useState(false);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAdminCalendar(token, monthKey);
      const data = res?.events ?? res;
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [year, month]);

  const handleCreate = async () => {
    if (!eTitle || !eDate) { Alert.alert("Enter title and date"); return; }
    setBusy(true);
    await createCalendarEvent(token, { title: eTitle, date: eDate, type: eType, description: eDesc });
    setBusy(false);
    setShowForm(false); setETitle(""); setEDate(""); setEDesc("");
    load(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete event?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteCalendarEvent(token, id); load(true); } },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Calendar</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={[s.addBtn, { backgroundColor: "#7C3AED" }]}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>

      {/* Month nav */}
      <View style={s.monthNav}>
        <TouchableOpacity onPress={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}>
          <Ionicons name="chevron-back" size={22} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor="#7C3AED" />}>
        {events.length === 0 ? (
          <View style={s.empty}><Ionicons name="calendar-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No events this month</Text></View>
        ) : events.map((ev, i) => (
          <View key={ev.id || i} style={s.card}>
            <View style={[s.typeDot, { backgroundColor: TYPE_COLORS[ev.type] || COLORS.mid }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.evTitle}>{ev.title}</Text>
              <Text style={s.evDate}>{ev.date ? new Date(ev.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : ""}</Text>
              {ev.description && <Text style={s.evDesc} numberOfLines={1}>{ev.description}</Text>}
            </View>
            <View style={[s.typeBadge, { backgroundColor: (TYPE_COLORS[ev.type] || COLORS.mid) + "18" }]}>
              <Text style={[s.typeTxt, { color: TYPE_COLORS[ev.type] || COLORS.mid }]}>{ev.type}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(ev.id)} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>New Event</Text>
            <TextInput style={s.input} placeholder="Title *" placeholderTextColor={COLORS.mid} value={eTitle} onChangeText={setETitle} />
            <TextInput style={s.input} placeholder="Date (YYYY-MM-DD) *" placeholderTextColor={COLORS.mid} value={eDate} onChangeText={setEDate} />
            <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top" }]} placeholder="Description" placeholderTextColor={COLORS.mid} value={eDesc} onChangeText={setEDesc} multiline />
            <Text style={s.label}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {EVENT_TYPES.map((t) => (
                <TouchableOpacity key={t} style={[s.typeBtn, eType === t && { backgroundColor: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] }]} onPress={() => setEType(t)}>
                  <Text style={[s.typeBtnTxt, eType === t && { color: "#fff" }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: "#7C3AED" }, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Create Event</Text>}
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
  addBtn:     { borderRadius: 10, padding: 6 },
  monthNav:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  monthLabel: { fontSize: 16, fontWeight: "700", color: COLORS.dark },
  content:    { padding: 16, gap: 10 },
  empty:      { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:   { fontSize: 14, color: COLORS.mid },
  card:       { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  typeDot:    { width: 10, height: 10, borderRadius: 5 },
  evTitle:    { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  evDate:     { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  evDesc:     { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  typeBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeTxt:    { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:      { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:      { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  label:      { fontSize: 12, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", marginBottom: 8 },
  typeBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  typeBtnTxt: { fontSize: 13, fontWeight: "600", color: COLORS.dark, textTransform: "capitalize" },
  saveBtn:    { borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:    { color: "#fff", fontSize: 16, fontWeight: "700" },
});
