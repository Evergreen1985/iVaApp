import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAdminIncidents, logIncident } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const TYPES = ["behavioral","safety","health","property","other"];
const TYPE_COLORS: Record<string,string> = {
  behavioral: COLORS.orange, safety: COLORS.error, health: "#3B82F6",
  property: COLORS.primary, other: COLORS.mid,
};

export default function AdminIncidents() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [childName, setChildName] = useState("");
  const [type, setType]         = useState("behavioral");
  const [desc, setDesc]         = useState("");
  const [busy, setBusy]         = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAdminIncidents(token);
      const data = res?.incidents ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!desc) return;
    setBusy(true);
    await logIncident({ childName, type, description: desc, reportedBy: session?.name || "admin" });
    setBusy(false);
    setShowForm(false); setChildName(""); setDesc("");
    load(true);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.error} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Incidents</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.error} />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="warning-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No incidents logged</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={[s.dot, { backgroundColor: TYPE_COLORS[item.type] || COLORS.mid }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.child_name || item.childName || "Student"}</Text>
              <Text style={s.desc} numberOfLines={2}>{item.description}</Text>
              <Text style={s.date}>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : ""} · by {item.reported_by || item.reportedBy || "staff"}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: (TYPE_COLORS[item.type] || COLORS.mid) + "22" }]}>
              <Text style={[s.badgeTxt, { color: TYPE_COLORS[item.type] || COLORS.mid }]}>{item.type || "other"}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>Log Incident</Text>
            <TextInput style={s.input} placeholder="Child Name" placeholderTextColor={COLORS.mid} value={childName} onChangeText={setChildName} />
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: "top" }]} placeholder="Description *" placeholderTextColor={COLORS.mid} value={desc} onChangeText={setDesc} multiline />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {TYPES.map((t) => (
                <TouchableOpacity key={t} style={[s.typeBtn, type === t && { backgroundColor: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] }]} onPress={() => setType(t)}>
                  <Text style={[s.typeTxt, type === t && { color: "#fff" }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Log Incident</Text>}
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
  addBtn:    { backgroundColor: COLORS.error, borderRadius: 10, padding: 6 },
  content:   { padding: 16, gap: 10 },
  empty:     { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:  { fontSize: 14, color: COLORS.mid },
  card:      { flexDirection: "row", gap: 10, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  dot:       { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  name:      { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  desc:      { fontSize: 13, color: COLORS.mid, marginTop: 2, lineHeight: 18 },
  date:      { fontSize: 11, color: COLORS.mid, marginTop: 4 },
  badge:     { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  badgeTxt:  { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle:{ fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:     { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  typeBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  typeTxt:   { fontSize: 12, fontWeight: "600", color: COLORS.dark, textTransform: "capitalize" },
  saveBtn:   { backgroundColor: COLORS.error, borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:   { color: "#fff", fontSize: 16, fontWeight: "700" },
});
