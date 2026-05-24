import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { getMedical, saveMedical } from "../../../src/lib/api";

export default function ParentMedical() {
  const { t } = useTranslation();
  const { session } = useSession();
  const enquiryId = session?.children?.[0]?.enquiryId || session?.children?.[0]?.id || "";

  const [bloodGroup,  setBloodGroup]  = useState("");
  const [allergies,   setAllergies]   = useState("");
  const [conditions,  setConditions]  = useState("");
  const [emergency,   setEmergency]   = useState("");
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    (async () => {
      if (!enquiryId) { setLoading(false); return; }
      try {
        const res = await getMedical(enquiryId);
        if (res && !res.error) {
          setBloodGroup(res.bloodGroup  || "");
          setAllergies(res.allergies    || "");
          setConditions(res.conditions  || "");
          setEmergency(res.emergency    || "");
        }
      } catch {}
      setLoading(false);
    })();
  }, [enquiryId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveMedical({ enquiryId, bloodGroup, allergies, conditions, emergency });
      if (!res?.error) {
        Alert.alert(t("success"), t("saveMedical"));
      } else {
        Alert.alert("Error", res.error);
      }
    } catch { Alert.alert("Error", "Failed"); }
    setSaving(false);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.pageTitle}>{t("medicalRecords")}</Text>

      <View style={s.card}>
        <View style={s.fieldBlock}>
          <View style={s.fieldIcon}>
            <Ionicons name="water-outline" size={18} color={COLORS.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>{t("bloodGroup")}</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. A+, O-, B+"
              placeholderTextColor={COLORS.mid}
              value={bloodGroup}
              onChangeText={setBloodGroup}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.fieldBlock}>
          <View style={s.fieldIcon}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.orange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>{t("allergies")}</Text>
            <TextInput
              style={[s.input, s.multiInput]}
              placeholder="List any allergies…"
              placeholderTextColor={COLORS.mid}
              value={allergies}
              onChangeText={setAllergies}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.fieldBlock}>
          <View style={s.fieldIcon}>
            <Ionicons name="heart-outline" size={18} color={COLORS.edu} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>{t("conditions")}</Text>
            <TextInput
              style={[s.input, s.multiInput]}
              placeholder="Any medical conditions…"
              placeholderTextColor={COLORS.mid}
              value={conditions}
              onChangeText={setConditions}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.fieldBlock}>
          <View style={s.fieldIcon}>
            <Ionicons name="call-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>{t("emergency")}</Text>
            <TextInput
              style={[s.input, s.multiInput]}
              placeholder="Name & phone number…"
              placeholderTextColor={COLORS.mid}
              value={emergency}
              onChangeText={setEmergency}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={s.saveTxt}>{t("saveMedical")}</Text>
            </>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 20, paddingBottom: 50 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:   { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 20 },
  card:        { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 20 },
  fieldBlock:  { flexDirection: "row", gap: 14, paddingVertical: 8 },
  fieldIcon:   { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", marginTop: 4 },
  fieldLabel:  { fontSize: 11, fontWeight: "700", color: COLORS.mid, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input:       { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  multiInput:  { minHeight: 70 },
  divider:     { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  saveBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: COLORS.edu, borderRadius: 16, padding: 16 },
  saveTxt:     { fontSize: 16, fontWeight: "800", color: "#fff" },
});
