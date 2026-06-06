import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput, ActivityIndicator,
  RefreshControl, SectionList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { supabase } from "../../../src/lib/supabase";
import { useSession } from "../../../src/store/session";

export default function TeacherStudents() {
  const { session } = useSession();
  const [sections, setSections] = useState<{ title: string; data: any[] }[]>([]);
  const [total, setTotal]       = useState(0);
  const [query, setQuery]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      // Get all sections this teacher manages (by name, same as web)
      let sectionIds: string[] = [];
      let sectionMap: Record<string, string> = {};

      if (session?.name) {
        const { data: secs } = await supabase
          .from("sections")
          .select("id, name")
          .eq("class_teacher", session.name);
        if (secs && secs.length > 0) {
          sectionIds = secs.map((s: any) => s.id);
          secs.forEach((s: any) => { sectionMap[s.id] = s.name; });
        }
      }
      // Fallback to primary sectionId from login
      if (sectionIds.length === 0 && session?.sectionId) {
        sectionIds = [session.sectionId];
        sectionMap[session.sectionId] = session.sectionId;
      }

      if (sectionIds.length === 0) { setLoading(false); setRefresh(false); return; }

      const { data: enquiries } = await supabase
        .from("enquiries")
        .select("id, child_name, phone, section_id, section_name, photo_url, child_dob, status")
        .in("section_id", sectionIds)
        .order("child_name");

      const all = enquiries || [];
      setTotal(all.length);

      // Group by section
      const grouped: Record<string, any[]> = {};
      all.forEach((e: any) => {
        const secName = e.section_name || sectionMap[e.section_id] || "Unknown";
        if (!grouped[secName]) grouped[secName] = [];
        grouped[secName].push(e);
      });

      setSections(Object.entries(grouped).map(([title, data]) => ({ title, data })));
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [session?.sectionId]);

  const filterSections = (secs: { title: string; data: any[] }[]) => {
    if (!query) return secs;
    const q = query.toLowerCase();
    return secs
      .map(sec => ({ ...sec, data: sec.data.filter((s: any) => (s.child_name || "").toLowerCase().includes(q)) }))
      .filter(sec => sec.data.length > 0);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const displayed = filterSections(sections);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.pageTitle}>Students</Text>
        <Text style={s.sub}>{total} enrolled</Text>
      </View>

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

      {displayed.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="people-outline" size={40} color={COLORS.mid} />
          <Text style={s.emptyTxt}>{query ? "No students found" : "No students enrolled"}</Text>
        </View>
      ) : (
        <SectionList
          sections={displayed}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionHeaderTxt}>{section.title}</Text>
              <Text style={s.sectionCount}>{section.data.length} students</Text>
            </View>
          )}
          renderItem={({ item: st, index: i }) => {
            const name = st.child_name || "Unknown";
            const initials = name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
            return (
              <View style={s.studentCard}>
                <View style={[s.avatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                  <Text style={s.avatarTxt}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.studentName}>{name}</Text>
                  {st.phone && <Text style={s.meta}>{st.phone}</Text>}
                </View>
                <View style={[s.statusBadge, st.status === "enrolled" ? s.badgeGreen : s.badgeGray]}>
                  <Text style={s.statusTxt}>{st.status || "—"}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const AVATAR_COLORS = ["#EDE9FE", "#DCFCE7", "#FEF3C7", "#FEE2E2", "#DBEAFE"];

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: COLORS.bg },
  center:           { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  topBar:           { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  pageTitle:        { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  sub:              { fontSize: 13, color: COLORS.mid },
  searchRow:        { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 16, marginBottom: 8, gap: 8 },
  searchInput:      { flex: 1, fontSize: 14, color: COLORS.dark },
  sectionHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, marginTop: 8 },
  sectionHeaderTxt: { fontSize: 12, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8 },
  sectionCount:     { fontSize: 12, color: COLORS.mid },
  studentCard:      { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  avatar:           { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarTxt:        { fontSize: 14, fontWeight: "800", color: COLORS.dark },
  studentName:      { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  meta:             { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  statusBadge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeGreen:       { backgroundColor: "#DCFCE7" },
  badgeGray:        { backgroundColor: "#F3F4F6" },
  statusTxt:        { fontSize: 11, fontWeight: "700", color: COLORS.dark },
  emptyCard:        { alignItems: "center", padding: 40, margin: 20, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  emptyTxt:         { fontSize: 14, color: COLORS.mid, marginTop: 10 },
});
