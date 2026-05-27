import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getOwnerAttendance } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const STATUS_COLOR: Record<string,string> = {
  present: COLORS.success, absent: COLORS.error, late: COLORS.orange, unmarked: COLORS.mid,
};

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function OwnerAttendance() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [date, setDate]         = useState(toISODate(new Date()));
  const [sections, setSections] = useState<any[]>([]);
  const [summary, setSummary]   = useState<any>({});
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getOwnerAttendance(token, date);
      setSummary(res?.summary ?? {});
      const raw = res?.sections ?? res?.students ?? res ?? [];
      setSections(Array.isArray(raw) ? raw : []);
    } catch { setSections([]); setSummary({}); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [date]);

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate()-1); setDate(toISODate(d)); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate()+1); setDate(toISODate(d)); };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Student Attendance</Text>
      </View>

      <View style={s.dateNav}>
        <TouchableOpacity onPress={prevDay} style={s.navBtn}><Ionicons name="chevron-back" size={20} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.dateTxt}>{new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" })}</Text>
        <TouchableOpacity onPress={nextDay} style={s.navBtn}><Ionicons name="chevron-forward" size={20} color={COLORS.dark} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} /> : <>
          <View style={s.summaryRow}>
            {["present","absent","late","unmarked"].map(st => (
              <View key={st} style={[s.sumCard, { borderColor: STATUS_COLOR[st] }]}>
                <Text style={[s.sumVal, { color: STATUS_COLOR[st] }]}>{summary[st] ?? 0}</Text>
                <Text style={s.sumLabel}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
              </View>
            ))}
          </View>

          {sections.length === 0 ? (
            <View style={s.empty}><Ionicons name="checkmark-circle-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No attendance data</Text></View>
          ) : sections.map((sec: any, si: number) => {
            const students = Array.isArray(sec.students) ? sec.students : [sec];
            const sectionName = sec.section || sec.section_name || "";
            return (
              <View key={si} style={s.sectionBlock}>
                {sectionName ? <Text style={s.sectionName}>{sectionName}</Text> : null}
                {students.map((st: any, i: number) => {
                  const status = st.status || "unmarked";
                  const color  = STATUS_COLOR[status] || COLORS.mid;
                  return (
                    <View key={st.id || i} style={s.row}>
                      <View style={[s.dot, { backgroundColor: color }]} />
                      <Text style={s.studentName}>{st.child_name || st.name || "Student"}</Text>
                      <Text style={[s.statusTxt, { color }]}>{status}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  header:      { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:        { marginRight: 12 },
  title:       { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  dateNav:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  navBtn:      { padding: 8 },
  dateTxt:     { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  content:     { padding: 16, gap: 12, paddingBottom: 40 },
  summaryRow:  { flexDirection: "row", gap: 8 },
  sumCard:     { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 2 },
  sumVal:      { fontSize: 18, fontWeight: "900" },
  sumLabel:    { fontSize: 10, color: COLORS.mid, marginTop: 2 },
  empty:       { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:    { fontSize: 14, color: COLORS.mid },
  sectionBlock:{ backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  sectionName: { fontSize: 13, fontWeight: "700", color: COLORS.primary, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  row:         { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dot:         { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  studentName: { flex: 1, fontSize: 13, color: COLORS.dark, fontWeight: "600" },
  statusTxt:   { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
});
