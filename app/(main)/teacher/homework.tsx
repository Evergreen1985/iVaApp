import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { getHomework } from "../../../src/lib/api";
import { EDU_API } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";

const SUBJECTS = ["English", "Hindi", "Maths", "Science", "EVS", "Drawing", "GK", "Other"];

export default function TeacherHomework() {
  const { session } = useSession();
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  // Form state
  const [subject, setSubject]   = useState(SUBJECTS[0]);
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [dueDate, setDueDate]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      if (session?.sectionId) {
        const res = await getHomework(session.sectionId);
        setList(res?.homework || res || []);
      }
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert("Enter a title"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${EDU_API}/api/teacher/homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({
          sectionId: session?.sectionId,
          subject, title, description: desc,
          dueDate: dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) { Alert.alert("Error", data.error); return; }
      setTitle(""); setDesc(""); setDueDate(""); setShowForm(false);
      load();
      Alert.alert("Done", "Homework assigned!");
    } catch {
      Alert.alert("Error", "Could not save. Check connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Homework</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowForm((v) => !v)}>
            <Ionicons name={showForm ? "close" : "add"} size={20} color="#fff" />
            <Text style={s.addBtnTxt}>{showForm ? "Cancel" : "Assign"}</Text>
          </TouchableOpacity>
        </View>

        {/* Assign form */}
        {showForm && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>New Assignment</Text>

            {/* Subject picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={s.subjectRow}>
                {SUBJECTS.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[s.subjectPill, subject === sub && s.subjectPillActive]}
                    onPress={() => setSubject(sub)}
                  >
                    <Text style={[s.subjectTxt, subject === sub && s.subjectTxtActive]}>{sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TextInput
              style={s.formInput}
              placeholder="Title *"
              placeholderTextColor={COLORS.mid}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[s.formInput, s.formTextarea]}
              placeholder="Description (optional)"
              placeholderTextColor={COLORS.mid}
              value={desc}
              onChangeText={setDesc}
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={s.formInput}
              placeholder="Due date (YYYY-MM-DD, optional)"
              placeholderTextColor={COLORS.mid}
              value={dueDate}
              onChangeText={setDueDate}
              keyboardType="numbers-and-punctuation"
            />

            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnTxt}>Assign Homework →</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* List */}
        <Text style={s.sectionTitle}>Recent Assignments ({list.length})</Text>
        {list.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="book-outline" size={40} color={COLORS.mid} />
            <Text style={s.emptyTxt}>No homework assigned yet</Text>
          </View>
        ) : (
          list.map((hw: any, i: number) => (
            <View key={hw.id || i} style={s.hwCard}>
              <View style={s.hwTop}>
                <View style={s.subjectBadge}>
                  <Text style={s.subjectBadgeTxt}>{hw.subject || "General"}</Text>
                </View>
                {hw.dueDate && (
                  <Text style={s.dueDate}>
                    Due {new Date(hw.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </Text>
                )}
              </View>
              <Text style={s.hwTitle}>{hw.title}</Text>
              {hw.description && <Text style={s.hwDesc}>{hw.description}</Text>}
              <Text style={s.hwMeta}>
                Assigned {new Date(hw.createdAt || hw.assignedDate || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: COLORS.bg },
  content:           { padding: 20, paddingBottom: 40 },
  center:            { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  pageTitle:         { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  addBtn:            { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnTxt:         { color: "#fff", fontWeight: "700", fontSize: 14 },
  formCard:          { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  formTitle:         { fontSize: 16, fontWeight: "800", color: COLORS.dark, marginBottom: 14 },
  subjectRow:        { flexDirection: "row", gap: 8 },
  subjectPill:       { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  subjectPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  subjectTxt:        { fontSize: 12, fontWeight: "600", color: COLORS.mid },
  subjectTxtActive:  { color: "#fff" },
  formInput:         { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  formTextarea:      { height: 80, textAlignVertical: "top" },
  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center" },
  submitBtnTxt:      { color: "#fff", fontSize: 15, fontWeight: "700" },
  sectionTitle:      { fontSize: 13, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  hwCard:            { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  hwTop:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  subjectBadge:      { backgroundColor: "#EDE9FE", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  subjectBadgeTxt:   { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  dueDate:           { fontSize: 12, color: COLORS.orange, fontWeight: "600" },
  hwTitle:           { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  hwDesc:            { fontSize: 13, color: COLORS.mid, marginTop: 6, lineHeight: 19 },
  hwMeta:            { fontSize: 11, color: COLORS.mid, marginTop: 8 },
  emptyCard:         { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 10 },
  emptyTxt:          { fontSize: 14, color: COLORS.mid, marginTop: 10 },
});
