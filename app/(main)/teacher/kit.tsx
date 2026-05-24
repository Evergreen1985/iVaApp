import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { getStudents, getKitItems, updateKitItem } from "../../../src/lib/api";

export default function TeacherKit() {
  const { t } = useTranslation();
  const { session } = useSession();
  const sectionId = session?.sectionId || "";

  const [students, setStudents]         = useState<any[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [kitItems, setKitItems]         = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingKit, setLoadingKit]     = useState(false);
  const [saving, setSaving]             = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!sectionId) { setLoadingStudents(false); return; }
      try {
        const res = await getStudents(sectionId);
        const list = res?.children || res?.students || (Array.isArray(res) ? res : []);
        setStudents(list);
        if (list.length === 1) selectStudent(list[0].id, list[0].enquiry_id || list[0].id);
      } catch { setStudents([]); }
      setLoadingStudents(false);
    })();
  }, [sectionId]);

  const selectStudent = async (childId: string, enquiryId: string) => {
    setSelectedId(childId);
    setKitItems([]);
    setLoadingKit(true);
    try {
      const items = await getKitItems(enquiryId);
      setKitItems(Array.isArray(items) ? items : []);
    } catch { setKitItems([]); }
    setLoadingKit(false);
  };

  const handleToggle = async (item: any) => {
    const newVal = !item.is_issued;
    setSaving(item.id);
    try {
      await updateKitItem({
        action: "toggle",
        id: item.id,
        is_issued: newVal,
        issued_by: session?.name,
      });
      setKitItems((prev) => prev.map((k) => k.id === item.id ? { ...k, is_issued: newVal } : k));
    } catch {
      Alert.alert("Error", "Could not update item.");
    }
    setSaving(null);
  };

  if (loadingStudents) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const selectedChild = students.find((c) => c.id === selectedId);
  const categories = [...new Set(kitItems.map((k) => k.item_category || "General"))];

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.pageTitle}>{t("kitBooks")}</Text>

      {/* Student selector */}
      {students.length === 0
        ? <Text style={s.emptyTxt}>No students in your section yet.</Text>
        : (
          <>
            <Text style={s.sectionLabel}>SELECT STUDENT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 10, paddingRight: 8 }}>
                {students.map((child: any) => (
                  <TouchableOpacity
                    key={child.id}
                    style={[s.studentPill, selectedId === child.id && s.studentPillActive]}
                    onPress={() => selectStudent(child.id, child.enquiry_id || child.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.studentName, selectedId === child.id && s.studentNameActive]}>
                      {child.child_name || child.name}
                    </Text>
                    {child.program_label && (
                      <Text style={s.studentProg}>{child.program_label}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )
      }

      {/* Kit items */}
      {selectedId && (
        loadingKit
          ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          : kitItems.length === 0
            ? (
              <View style={s.emptyBox}>
                <Ionicons name="bag-outline" size={40} color={COLORS.mid} />
                <Text style={s.emptyTxt}>No kit items for this student</Text>
              </View>
            )
            : (
              <>
                <View style={s.kitStats}>
                  <View style={s.statChip}>
                    <Text style={s.statVal}>{kitItems.filter((k) => k.is_issued).length}/{kitItems.length}</Text>
                    <Text style={s.statLabel}>Issued</Text>
                  </View>
                </View>

                {categories.map((cat) => (
                  <View key={cat} style={{ marginBottom: 16 }}>
                    <Text style={s.catLabel}>{cat}</Text>
                    {kitItems.filter((k) => (k.item_category || "General") === cat).map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[s.kitItem, item.is_issued && s.kitItemIssued]}
                        onPress={() => handleToggle(item)}
                        activeOpacity={0.7}
                        disabled={saving === item.id}
                      >
                        <View style={[s.checkbox, item.is_issued && s.checkboxChecked]}>
                          {saving === item.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : item.is_issued && <Ionicons name="checkmark" size={14} color="#fff" />
                          }
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.itemName, item.is_issued && s.itemNameIssued]}>{item.item_name}</Text>
                          {item.quantity && (
                            <Text style={s.itemQty}>Qty: {item.quantity}</Text>
                          )}
                        </View>
                        {item.is_issued && (
                          <Text style={s.issuedBadge}>✓ Issued</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </>
            )
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: COLORS.bg },
  content:           { padding: 16, paddingBottom: 50 },
  center:            { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:         { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  sectionLabel:      { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  studentPill:       { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff", borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center" },
  studentPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  studentName:       { fontSize: 13, fontWeight: "700", color: COLORS.dark },
  studentNameActive: { color: "#fff" },
  studentProg:       { fontSize: 10, color: COLORS.mid, marginTop: 2 },
  emptyBox:          { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyTxt:          { fontSize: 14, color: COLORS.mid, textAlign: "center" },
  kitStats:          { marginBottom: 14 },
  statChip:          { backgroundColor: "#fff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 20 },
  statVal:           { fontSize: 20, fontWeight: "900", color: COLORS.primary },
  statLabel:         { fontSize: 11, color: COLORS.mid, fontWeight: "600" },
  catLabel:          { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  kitItem:           { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  kitItemIssued:     { backgroundColor: "#EEF8F6", borderColor: "rgba(23,143,120,0.3)" },
  checkbox:          { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  checkboxChecked:   { backgroundColor: COLORS.edu, borderColor: COLORS.edu },
  itemName:          { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  itemNameIssued:    { color: COLORS.edu },
  itemQty:           { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  issuedBadge:       { fontSize: 11, fontWeight: "700", color: COLORS.edu },
});
