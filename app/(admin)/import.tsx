import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { useSession } from "../../src/store/session";

const IMPORT_TYPES = [
  {
    key: "students",
    label: "Import Students",
    desc: "Upload Excel/CSV with student name, parent phone, DOB, section",
    icon: "people-outline",
    color: COLORS.primary,
    fields: ["Name", "Parent Phone", "Date of Birth", "Section", "Guardian Name"],
  },
  {
    key: "staff",
    label: "Import Staff",
    desc: "Upload Excel/CSV with staff name, role, phone, join date",
    icon: "person-add-outline",
    color: COLORS.edu,
    fields: ["Name", "Role", "Phone", "Join Date", "Salary"],
  },
  {
    key: "fees",
    label: "Import Fee Structure",
    desc: "Upload fee schedule for different sections and categories",
    icon: "card-outline",
    color: COLORS.orange,
    fields: ["Section", "Fee Type", "Amount", "Due Date", "Frequency"],
  },
];

export default function AdminImport() {
  const router = useRouter();
  const { session } = useSession();
  const [activeType, setActiveType] = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);

  const handleImport = (type: string) => {
    Alert.alert(
      "Import Data",
      "File picker is not available in this build. To import data:\n\n1. Go to the web admin panel\n2. Navigate to Import Data\n3. Upload your Excel/CSV file there\n\nThe data will sync to the app automatically.",
      [{ text: "OK" }]
    );
  };

  const downloadTemplate = (type: string) => {
    Alert.alert(
      "Download Template",
      "Template download requires the web admin panel. Visit evergreenprepschools.com/admin to download Excel templates for bulk import.",
      [{ text: "OK" }]
    );
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Import Data</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.infoBox}>
          <Ionicons name="information-circle" size={22} color={COLORS.primary} />
          <Text style={s.infoTxt}>Bulk import students, staff, and fee data from Excel or CSV files. Download a template first to ensure correct formatting.</Text>
        </View>

        {IMPORT_TYPES.map((type) => (
          <View key={type.key} style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.iconBox, { backgroundColor: type.color + "18" }]}>
                <Ionicons name={type.icon as any} size={22} color={type.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{type.label}</Text>
                <Text style={s.cardDesc}>{type.desc}</Text>
              </View>
            </View>

            <View style={s.fieldsBox}>
              <Text style={s.fieldsLabel}>Required columns:</Text>
              <View style={s.fieldsList}>
                {type.fields.map(f => (
                  <View key={f} style={s.fieldTag}>
                    <Text style={s.fieldTagTxt}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={s.btnRow}>
              <TouchableOpacity style={s.templateBtn} onPress={() => downloadTemplate(type.key)}>
                <Ionicons name="download-outline" size={16} color={type.color} />
                <Text style={[s.templateTxt, { color: type.color }]}>Template</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.importBtn, { backgroundColor: type.color }]} onPress={() => handleImport(type.key)}>
                <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                <Text style={s.importTxt}>Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={s.tipsBox}>
          <Text style={s.tipsTitle}>Import Tips</Text>
          {[
            "First row must be the header row with column names",
            "Phone numbers must be 10 digits (without country code)",
            "Dates should be in DD/MM/YYYY format",
            "Section names must match existing sections exactly",
            "Duplicate entries will be skipped automatically",
          ].map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <View style={s.tipDot} />
              <Text style={s.tipTxt}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.bg },
  header:       { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:         { marginRight: 12 },
  title:        { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  content:      { padding: 16, gap: 12, paddingBottom: 40 },
  infoBox:      { flexDirection: "row", gap: 10, backgroundColor: COLORS.primary + "10", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.primary + "25" },
  infoTxt:      { flex: 1, fontSize: 13, color: COLORS.dark, lineHeight: 20 },
  card:         { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  cardHeader:   { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconBox:      { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTitle:    { fontSize: 15, fontWeight: "800", color: COLORS.dark },
  cardDesc:     { fontSize: 12, color: COLORS.mid, marginTop: 3, lineHeight: 18 },
  fieldsBox:    { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10 },
  fieldsLabel:  { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  fieldsList:   { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fieldTag:     { backgroundColor: "#fff", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.border },
  fieldTagTxt:  { fontSize: 11, color: COLORS.dark, fontWeight: "600" },
  btnRow:       { flexDirection: "row", gap: 10 },
  templateBtn:  { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border },
  templateTxt:  { fontSize: 13, fontWeight: "700" },
  importBtn:    { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 12 },
  importTxt:    { color: "#fff", fontSize: 13, fontWeight: "700" },
  tipsBox:      { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  tipsTitle:    { fontSize: 14, fontWeight: "800", color: COLORS.dark, marginBottom: 12 },
  tipRow:       { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  tipDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 6 },
  tipTxt:       { fontSize: 13, color: COLORS.mid, flex: 1, lineHeight: 20 },
});
