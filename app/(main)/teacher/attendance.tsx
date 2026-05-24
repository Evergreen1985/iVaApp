import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { getStudents, saveAttendance } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";

type Status = "present" | "absent" | "leave";

interface StudentRow {
  id: string;
  name: string;
  rollNo?: string | number;
  status: Status;
}

export default function TeacherAttendance() {
  const { session } = useSession();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [refresh, setRefresh]   = useState(false);
  const [saved, setSaved]       = useState(false);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      if (session?.sectionId) {
        const res = await getStudents(session.sectionId);
        const list: StudentRow[] = (res?.students || res || []).map((s: any) => ({
          id:     s.id || s.studentId,
          name:   s.name || s.studentName,
          rollNo: s.rollNo,
          status: "present" as Status,
        }));
        setStudents(list);
        setSaved(false);
      }
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: string, status: Status) => {
    setStudents((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    setSaved(false);
  };

  const markAll = (status: Status) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      sectionId: session?.sectionId,
      date:      new Date().toISOString().split("T")[0],
      attendance: students.map((s) => ({ studentId: s.id, status: s.status })),
    };
    const res = await saveAttendance(payload);
    setSaving(false);
    if (res.error) {
      Alert.alert("Error", res.error);
    } else {
      setSaved(true);
      Alert.alert("Saved", "Attendance saved successfully!");
    }
  };

  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount  = students.filter((s) => s.status === "absent").length;

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
      >
        <Text style={s.pageTitle}>Attendance</Text>
        <Text style={s.dateStr}>{today}</Text>

        {/* Summary */}
        <View style={s.summaryRow}>
          <View style={[s.summaryBox, { backgroundColor: "#DCFCE7" }]}>
            <Text style={[s.summaryNum, { color: COLORS.success }]}>{presentCount}</Text>
            <Text style={s.summaryLbl}>Present</Text>
          </View>
          <View style={[s.summaryBox, { backgroundColor: "#FEE2E2" }]}>
            <Text style={[s.summaryNum, { color: COLORS.error }]}>{absentCount}</Text>
            <Text style={s.summaryLbl}>Absent</Text>
          </View>
          <View style={[s.summaryBox, { backgroundColor: "#F3F4F6" }]}>
            <Text style={[s.summaryNum, { color: COLORS.mid }]}>{students.length}</Text>
            <Text style={s.summaryLbl}>Total</Text>
          </View>
        </View>

        {/* Bulk actions */}
        <View style={s.bulkRow}>
          <TouchableOpacity style={[s.bulkBtn, { backgroundColor: "#DCFCE7" }]} onPress={() => markAll("present")}>
            <Text style={[s.bulkTxt, { color: COLORS.success }]}>All Present</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bulkBtn, { backgroundColor: "#FEE2E2" }]} onPress={() => markAll("absent")}>
            <Text style={[s.bulkTxt, { color: COLORS.error }]}>All Absent</Text>
          </TouchableOpacity>
        </View>

        {/* Student list */}
        {students.map((st) => (
          <View key={st.id} style={s.studentRow}>
            <View style={s.studentLeft}>
              <View style={s.rollBadge}>
                <Text style={s.rollTxt}>{st.rollNo || "—"}</Text>
              </View>
              <Text style={s.studentName}>{st.name}</Text>
            </View>
            <View style={s.statusBtns}>
              {(["present", "absent", "leave"] as Status[]).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[s.statusBtn, st.status === status && statusColors[status].bg]}
                  onPress={() => toggle(st.id, status)}
                >
                  <Text style={[s.statusBtnTxt, st.status === status && statusColors[status].txt]}>
                    {status[0].toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save button */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.saveBtn, (saving || saved) && s.saveBtnDone]}
          onPress={handleSave}
          disabled={saving || saved}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={saved ? "checkmark-circle" : "save-outline"} size={20} color="#fff" />
              <Text style={s.saveBtnTxt}>{saved ? "Attendance Saved" : "Save Attendance"}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const statusColors: Record<Status, { bg: object; txt: object }> = {
  present: { bg: { backgroundColor: COLORS.success }, txt: { color: "#fff" } },
  absent:  { bg: { backgroundColor: COLORS.error   }, txt: { color: "#fff" } },
  leave:   { bg: { backgroundColor: COLORS.yellow  }, txt: { color: "#fff" } },
};

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 20 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:   { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  dateStr:     { fontSize: 13, color: COLORS.mid, marginBottom: 16, marginTop: 2 },
  summaryRow:  { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryBox:  { flex: 1, borderRadius: 14, padding: 12, alignItems: "center" },
  summaryNum:  { fontSize: 22, fontWeight: "900" },
  summaryLbl:  { fontSize: 11, fontWeight: "600", color: COLORS.mid, marginTop: 2 },
  bulkRow:     { flexDirection: "row", gap: 10, marginBottom: 16 },
  bulkBtn:     { flex: 1, borderRadius: 10, padding: 10, alignItems: "center" },
  bulkTxt:     { fontSize: 13, fontWeight: "700" },
  studentRow:  { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  studentLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  rollBadge:   { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  rollTxt:     { fontSize: 12, fontWeight: "700", color: COLORS.dark },
  studentName: { fontSize: 14, fontWeight: "600", color: COLORS.dark, flex: 1 },
  statusBtns:  { flexDirection: "row", gap: 6 },
  statusBtn:   { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  statusBtnTxt:{ fontSize: 12, fontWeight: "700", color: COLORS.mid },
  footer:      { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderColor: COLORS.border },
  saveBtn:     { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtnDone: { backgroundColor: COLORS.success },
  saveBtnTxt:  { color: "#fff", fontSize: 16, fontWeight: "700" },
});
