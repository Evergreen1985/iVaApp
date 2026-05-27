import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAllMedical } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function AdminMedical() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [query, setQuery]     = useState("");

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAllMedical(token);
      const data = res?.medical ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = list.filter(item =>
    !query || (item.child_name || item.studentName || "").toLowerCase().includes(query.toLowerCase())
  );

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.dark} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Medical Records</Text>
        <Text style={s.count}>{list.length}</Text>
      </View>
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.mid} />
        <TextInput style={s.searchInput} placeholder="Search by name…" placeholderTextColor={COLORS.mid} value={query} onChangeText={setQuery} />
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.dark} />}>
        {filtered.length === 0 ? (
          <View style={s.empty}><Ionicons name="medkit-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No records found</Text></View>
        ) : filtered.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.avatar}><Text style={s.avatarTxt}>{(item.child_name || "S")[0].toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.child_name || item.studentName || "Student"}</Text>
              <Text style={s.meta}>{item.section_name || ""}</Text>
              {item.allergies && <Text style={s.tag}>Allergies: {item.allergies}</Text>}
              {item.conditions && <Text style={s.tag}>Conditions: {item.conditions}</Text>}
              {item.medications && <Text style={s.tag}>Medications: {item.medications}</Text>}
              {item.blood_group && <Text style={s.tag}>Blood Group: {item.blood_group}</Text>}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  header:      { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:        { marginRight: 12 },
  title:       { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  count:       { fontSize: 13, color: COLORS.mid, fontWeight: "600" },
  searchRow:   { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.dark },
  content:     { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  empty:       { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:    { fontSize: 14, color: COLORS.mid },
  card:        { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  avatarTxt:   { fontSize: 16, fontWeight: "800", color: COLORS.error },
  name:        { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  meta:        { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  tag:         { fontSize: 12, color: COLORS.dark, marginTop: 3, backgroundColor: COLORS.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
});
