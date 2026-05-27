import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { getPickupAuth, savePickupAuth } from "../../../src/lib/api";

export default function ParentPickup() {
  const { t } = useTranslation();
  const { activeChild } = useSession();
  const enquiryId = activeChild?.id || "";

  const [persons, setPersons] = useState<{ name: string; relation: string }[]>([]);
  const [name, setName]       = useState("");
  const [relation, setRelation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    (async () => {
      if (!enquiryId) { setLoading(false); return; }
      try {
        const res = await getPickupAuth(enquiryId);
        if (Array.isArray(res)) setPersons(res);
        else if (res?.persons) setPersons(res.persons);
      } catch {}
      setLoading(false);
    })();
  }, [enquiryId]);

  const handleAdd = () => {
    if (!name.trim() || !relation.trim()) {
      Alert.alert(t("fillAllFields")); return;
    }
    setPersons((prev) => [...prev, { name: name.trim(), relation: relation.trim() }]);
    setName(""); setRelation("");
  };

  const handleRemove = (i: number) => {
    setPersons((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await savePickupAuth({ enquiryId, persons });
      if (!res?.error) {
        Alert.alert(t("success"), "Pickup authorization saved.");
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
      <Text style={s.pageTitle}>{t("pickupAuth")}</Text>

      {/* Authorized list */}
      {persons.length === 0
        ? (
          <View style={s.emptyBox}>
            <Ionicons name="car-outline" size={40} color={COLORS.mid} />
            <Text style={s.emptyTxt}>{t("noPickup")}</Text>
          </View>
        )
        : persons.map((p, i) => (
            <View key={i} style={s.personCard}>
              <View style={s.personAvatar}>
                <Text style={s.personInitial}>{p.name[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.personName}>{p.name}</Text>
                <Text style={s.personRelation}>{p.relation}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemove(i)} style={s.removeBtn} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))
      }

      {/* Add form */}
      <Text style={s.sectionLabel}>{t("addPickup")}</Text>
      <View style={s.formCard}>
        <TextInput
          style={s.input}
          placeholder={t("authName")}
          placeholderTextColor={COLORS.mid}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={s.input}
          placeholder={t("relation")}
          placeholderTextColor={COLORS.mid}
          value={relation}
          onChangeText={setRelation}
        />
        <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.edu} />
          <Text style={s.addTxt}>{t("addPickup")}</Text>
        </TouchableOpacity>
      </View>

      {/* Save */}
      {persons.length > 0 && (
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.saveTxt}>{t("save")}</Text>
              </>
          }
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  content:       { padding: 20, paddingBottom: 50 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:     { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 20 },
  emptyBox:      { alignItems: "center", gap: 10, paddingVertical: 30 },
  emptyTxt:      { fontSize: 14, color: COLORS.mid },
  personCard:    { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  personAvatar:  { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.edu, alignItems: "center", justifyContent: "center" },
  personInitial: { fontSize: 18, fontWeight: "800", color: "#fff" },
  personName:    { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  personRelation:{ fontSize: 12, color: COLORS.mid, marginTop: 2 },
  removeBtn:     { padding: 6 },
  sectionLabel:  { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 1, marginTop: 20, marginBottom: 10 },
  formCard:      { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 16 },
  input:         { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  addBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: COLORS.edu },
  addTxt:        { fontSize: 14, fontWeight: "700", color: COLORS.edu },
  saveBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: COLORS.edu, borderRadius: 16, padding: 16 },
  saveTxt:       { fontSize: 16, fontWeight: "800", color: "#fff" },
});
