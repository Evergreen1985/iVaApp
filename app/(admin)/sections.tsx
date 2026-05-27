import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAdminSections, createSection } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const AGE_GROUPS = ["Infant","Playgroup","Nursery","LKG","UKG","Daycare"];

export default function AdminSections() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sName, setSName]     = useState("");
  const [ageGroup, setAgeGroup] = useState("Nursery");
  const [teacher, setTeacher] = useState("");
  const [capacity, setCapacity] = useState("");
  const [busy, setBusy]       = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAdminSections(token);
      const data = res?.sections ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!sName) { Alert.alert("Enter section name"); return; }
    setBusy(true);
    await createSection(token, { name: sName, ageGroup, teacherName: teacher, capacity: parseInt(capacity) || 20 });
    setBusy(false);
    setShowForm(false); setSName(""); setTeacher(""); setCapacity("");
    load(true);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Sections</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="layers-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No sections created</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.iconBox}><Text style={s.iconTxt}>{(item.name || "S")[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.meta}>{item.age_group || item.ageGroup || "—"} · {item.teacher_name || item.teacherName || "No teacher"}</Text>
              {item.student_count != null && <Text style={s.meta}>{item.student_count} students · Capacity {item.capacity || "—"}</Text>}
            </View>
          </View>
        ))}
      </ScrollView>
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>New Section</Text>
            <TextInput style={s.input} placeholder="Section Name *" placeholderTextColor={COLORS.mid} value={sName} onChangeText={setSName} />
            <TextInput style={s.input} placeholder="Class Teacher Name" placeholderTextColor={COLORS.mid} value={teacher} onChangeText={setTeacher} />
            <TextInput style={s.input} placeholder="Capacity" placeholderTextColor={COLORS.mid} keyboardType="numeric" value={capacity} onChangeText={setCapacity} />
            <Text style={s.label}>Age Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {AGE_GROUPS.map((g) => (
                <TouchableOpacity key={g} style={[s.chip, ageGroup === g && s.chipActive]} onPress={() => setAgeGroup(g)}>
                  <Text style={[s.chipTxt, ageGroup === g && { color: "#fff" }]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Create Section</Text>}
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
  addBtn:     { backgroundColor: COLORS.edu, borderRadius: 10, padding: 6 },
  content:    { padding: 16, gap: 10 },
  empty:      { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:   { fontSize: 14, color: COLORS.mid },
  card:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  iconBox:    { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.eduLight, alignItems: "center", justifyContent: "center" },
  iconTxt:    { fontSize: 18, fontWeight: "800", color: COLORS.edu },
  name:       { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  meta:       { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:      { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:      { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  label:      { fontSize: 12, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", marginBottom: 8 },
  chip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.edu, borderColor: COLORS.edu },
  chipTxt:    { fontSize: 13, fontWeight: "600", color: COLORS.dark },
  saveBtn:    { backgroundColor: COLORS.edu, borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:    { color: "#fff", fontSize: 16, fontWeight: "700" },
});
