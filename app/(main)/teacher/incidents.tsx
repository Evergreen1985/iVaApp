import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { getIncidents, logIncident } from "../../../src/lib/api";

const INCIDENT_TYPES = ["Behavioral", "Medical", "Accident", "Property", "Other"];

export default function TeacherIncidents() {
  const { t } = useTranslation();
  const { session } = useSession();

  const [type, setType]       = useState(INCIDENT_TYPES[0]);
  const [childName, setChild] = useState("");
  const [desc, setDesc]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [incidents, setIncidents]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refresh, setRefresh]         = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const params = session?.sectionId ? `sectionId=${encodeURIComponent(session.sectionId)}` : "";
      const res = await getIncidents(params);
      setIncidents(Array.isArray(res) ? res : []);
    } catch { setIncidents([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [session?.sectionId]);

  const handleSubmit = async () => {
    if (!childName.trim() || !desc.trim()) {
      Alert.alert(t("fillAllFields")); return;
    }
    setSubmitting(true);
    try {
      const res = await logIncident({
        type,
        childName: childName.trim(),
        description: desc.trim(),
        reportedBy: session?.name || "Staff",
        sectionId: session?.sectionId,
      });
      if (!res?.error) {
        setChild(""); setDesc(""); setType(INCIDENT_TYPES[0]);
        Alert.alert(t("success"), "Incident logged.");
        load();
      } else {
        Alert.alert("Error", res.error);
      }
    } catch { Alert.alert("Error", "Failed"); }
    setSubmitting(false);
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
    >
      <Text style={s.pageTitle}>{t("logIncident")}</Text>

      {/* Form */}
      <View style={s.formCard}>
        <Text style={s.fieldLabel}>{t("incidentType")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={s.typeRow}>
            {INCIDENT_TYPES.map((tp) => (
              <TouchableOpacity
                key={tp}
                style={[s.typePill, type === tp && s.typePillActive]}
                onPress={() => setType(tp)}
                activeOpacity={0.7}
              >
                <Text style={[s.typeTxt, type === tp && s.typeTxtActive]}>{tp}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TextInput
          style={s.input}
          placeholder={t("incidentChild")}
          placeholderTextColor={COLORS.mid}
          value={childName}
          onChangeText={setChild}
        />
        <TextInput
          style={[s.input, s.textArea]}
          placeholder={t("incidentDesc")}
          placeholderTextColor={COLORS.mid}
          value={desc}
          onChangeText={setDesc}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="warning-outline" size={16} color="#fff" />
                <Text style={s.submitTxt}>{t("submitIncident")}</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* History */}
      <Text style={s.sectionLabel}>{t("incidents")}</Text>
      {loading
        ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        : incidents.length === 0
          ? <Text style={s.empty}>{t("noIncidents")}</Text>
          : incidents.map((inc, i) => (
              <View key={i} style={s.incCard}>
                <View style={s.incHeader}>
                  <View style={s.typeBadge}>
                    <Text style={s.typeBadgeTxt}>{inc.type}</Text>
                  </View>
                  <Text style={s.incDate}>
                    {inc.createdAt ? new Date(inc.createdAt).toLocaleDateString("en-IN") : ""}
                  </Text>
                </View>
                <Text style={s.incChild}>{inc.childName}</Text>
                <Text style={s.incDesc}>{inc.description}</Text>
                {inc.reportedBy && <Text style={s.incBy}>Reported by {inc.reportedBy}</Text>}
              </View>
            ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: COLORS.bg },
  content:        { padding: 20, paddingBottom: 50 },
  pageTitle:      { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 20 },
  formCard:       { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24, gap: 12 },
  fieldLabel:     { fontSize: 12, fontWeight: "600", color: COLORS.mid },
  typeRow:        { flexDirection: "row", gap: 8, paddingRight: 8 },
  typePill:       { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#F0F0F0", borderWidth: 1.5, borderColor: "transparent" },
  typePillActive: { backgroundColor: "#EEF3FF", borderColor: COLORS.primary },
  typeTxt:        { fontSize: 13, fontWeight: "600", color: COLORS.mid },
  typeTxtActive:  { color: COLORS.primary },
  input:          { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  textArea:       { minHeight: 100 },
  submitBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.orange, borderRadius: 12, padding: 14 },
  submitTxt:      { color: "#fff", fontWeight: "700", fontSize: 15 },
  sectionLabel:   { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  empty:          { textAlign: "center", color: COLORS.mid, marginTop: 20, fontSize: 14 },
  incCard:        { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  incHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  typeBadge:      { backgroundColor: "#FFF0EC", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeTxt:   { fontSize: 11, fontWeight: "700", color: COLORS.orange },
  incDate:        { fontSize: 11, color: COLORS.mid },
  incChild:       { fontSize: 14, fontWeight: "700", color: COLORS.dark, marginBottom: 4 },
  incDesc:        { fontSize: 13, color: COLORS.mid, lineHeight: 19 },
  incBy:          { fontSize: 11, color: COLORS.mid, marginTop: 8, textAlign: "right" },
});
