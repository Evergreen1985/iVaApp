import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAllPickup } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function AdminPickup() {
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
      const res = await getAllPickup(token);
      const data = res?.pickup ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = list.filter(item =>
    !query || [(item.child_name || ""), (item.authorized_name || ""), (item.phone || "")].join(" ").toLowerCase().includes(query.toLowerCase())
  );

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.dark} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Pickup Authorizations</Text>
        <Text style={s.count}>{list.length}</Text>
      </View>
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.mid} />
        <TextInput style={s.searchInput} placeholder="Search…" placeholderTextColor={COLORS.mid} value={query} onChangeText={setQuery} />
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.dark} />}>
        {filtered.length === 0 ? (
          <View style={s.empty}><Ionicons name="car-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No records found</Text></View>
        ) : filtered.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.iconBox}><Ionicons name="car" size={20} color={COLORS.dark} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.childName}>{item.child_name || item.childName || "Student"}</Text>
              <Text style={s.authName}>{item.authorized_name || item.name} · {item.relation || item.relationship}</Text>
              {item.phone && <Text style={s.meta}>{item.phone}</Text>}
            </View>
            <View style={[s.badge, { backgroundColor: COLORS.success + "22" }]}>
              <Text style={[s.badgeTxt, { color: COLORS.success }]}>Authorized</Text>
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
  title:       { flex: 1, fontSize: 16, fontWeight: "800", color: COLORS.dark },
  count:       { fontSize: 13, color: COLORS.mid, fontWeight: "600" },
  searchRow:   { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.dark },
  content:     { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  empty:       { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:    { fontSize: 14, color: COLORS.mid },
  card:        { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  iconBox:     { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  childName:   { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  authName:    { fontSize: 13, color: COLORS.mid, marginTop: 2, textTransform: "capitalize" },
  meta:        { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  badge:       { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt:    { fontSize: 11, fontWeight: "700" },
});
