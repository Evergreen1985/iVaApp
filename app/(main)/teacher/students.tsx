import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { getStudents } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";

export default function TeacherStudents() {
  const { session } = useSession();
  const [all, setAll]         = useState<any[]>([]);
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      if (session?.sectionId) {
        const res = await getStudents(session.sectionId);
        const students = res?.students ?? res;
        setAll(Array.isArray(students) ? students : []);
      }
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = all.filter((s: any) =>
    !query || (s.name || s.studentName || "").toLowerCase().includes(query.toLowerCase())
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
    >
      <Text style={s.pageTitle}>Students</Text>
      <Text style={s.sub}>{all.length} enrolled</Text>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.mid} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name…"
          placeholderTextColor={COLORS.mid}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <Ionicons name="close-circle" size={18} color={COLORS.mid} onPress={() => setQuery("")} />
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="people-outline" size={40} color={COLORS.mid} />
          <Text style={s.emptyTxt}>{query ? "No students found" : "No students enrolled"}</Text>
        </View>
      ) : (
        filtered.map((st: any, i: number) => {
          const name = st.name || st.studentName || "Unknown";
          const initials = name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
          return (
            <View key={st.id || st.studentId || i} style={s.studentCard}>
              <View style={[s.avatar, { backgroundColor: avatarColor(i) }]}>
                <Text style={s.avatarTxt}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.studentName}>{name}</Text>
                <View style={s.metaRow}>
                  {st.rollNo && <Text style={s.meta}>Roll: {st.rollNo}</Text>}
                  {st.parentPhone && <Text style={s.meta}>· {st.parentPhone}</Text>}
                </View>
              </View>
              {st.gender && (
                <View style={s.genderBadge}>
                  <Text style={s.genderTxt}>{st.gender === "M" || st.gender === "male" ? "♂" : "♀"}</Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const AVATAR_COLORS = ["#EDE9FE", "#DCFCE7", "#FEF3C7", "#FEE2E2", "#DBEAFE"];
function avatarColor(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length]; }

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 20, paddingBottom: 40 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:   { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  sub:         { fontSize: 13, color: COLORS.mid, marginBottom: 16, marginTop: 2 },
  searchRow:   { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.dark },
  studentCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarTxt:   { fontSize: 15, fontWeight: "800", color: COLORS.dark },
  studentName: { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  metaRow:     { flexDirection: "row", marginTop: 3, gap: 4 },
  meta:        { fontSize: 12, color: COLORS.mid },
  genderBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  genderTxt:   { fontSize: 16 },
  emptyCard:   { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 20 },
  emptyTxt:    { fontSize: 14, color: COLORS.mid, marginTop: 10 },
});
