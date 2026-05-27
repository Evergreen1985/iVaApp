import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getCleanupData, executeCleanup } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function OwnerCleanup() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [tables, setTables]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm]   = useState("");
  const [running, setRunning]   = useState(false);
  const [results, setResults]   = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCleanupData(token);
        const data = res?.tables ?? res;
        setTables(Array.isArray(data) ? data : []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const toggle = (key: string) =>
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const handleCleanup = () => {
    if (selected.length === 0) { Alert.alert("Select tables", "Choose at least one table to clean up."); return; }
    if (confirm !== "DELETE") { Alert.alert("Confirmation required", 'Type "DELETE" to confirm this action.'); return; }
    Alert.alert(
      "⚠️ Permanent Deletion",
      `You are about to permanently delete data from ${selected.length} table(s). This CANNOT be undone. Are you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Permanently", style: "destructive", onPress: doCleanup },
      ]
    );
  };

  const doCleanup = async () => {
    setRunning(true);
    try {
      const res = await executeCleanup(token, selected);
      setResults(Array.isArray(res?.results) ? res.results : []);
      setSelected([]);
      setConfirm("");
      const res2 = await getCleanupData(token);
      setTables(Array.isArray(res2?.tables ?? res2) ? res2?.tables ?? res2 : []);
    } catch { Alert.alert("Error", "Cleanup failed."); }
    setRunning(false);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.error} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Data Cleanup</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.warningBox}>
          <Ionicons name="warning" size={22} color={COLORS.error} />
          <Text style={s.warningTxt}>Data deleted here is PERMANENTLY REMOVED and cannot be recovered. Use only to remove test/dummy data before going live.</Text>
        </View>

        {results.length > 0 && (
          <View style={s.resultsBox}>
            <Text style={s.resultsTitle}>Cleanup Results</Text>
            {results.map((r: any, i: number) => (
              <View key={i} style={s.resultRow}>
                <Ionicons name={r.success ? "checkmark-circle" : "close-circle"} size={16}
                  color={r.success ? COLORS.success : COLORS.error} />
                <Text style={s.resultTxt}>{r.table}: {r.count ?? 0} rows deleted</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.sectionLabel}>Select Tables to Clear</Text>
        {tables.map((tbl: any, i: number) => {
          const key = tbl.key || tbl.table;
          const isSelected = selected.includes(key);
          return (
            <TouchableOpacity key={i} style={[s.tableRow, isSelected && s.tableRowSelected]}
              onPress={() => toggle(key)} activeOpacity={0.7}>
              <View style={[s.checkbox, isSelected && s.checkboxChecked]}>
                {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tableName}>{tbl.label || tbl.table}</Text>
                {tbl.description && <Text style={s.tableDesc}>{tbl.description}</Text>}
              </View>
              <View style={s.countBadge}>
                <Text style={s.countTxt}>{tbl.count ?? 0} rows</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {selected.length > 0 && (
          <View style={s.confirmBox}>
            <Text style={s.confirmLabel}>Type "DELETE" to confirm ({selected.length} table{selected.length !== 1 ? "s" : ""} selected)</Text>
            <TextInput style={[s.confirmInput, confirm === "DELETE" && { borderColor: COLORS.error }]}
              value={confirm} onChangeText={setConfirm} placeholder="DELETE"
              placeholderTextColor={COLORS.mid} autoCapitalize="characters" />
            <TouchableOpacity style={[s.deleteBtn, (confirm !== "DELETE" || running) && { opacity: 0.5 }]}
              onPress={handleCleanup} disabled={confirm !== "DELETE" || running}>
              {running ? <ActivityIndicator color="#fff" /> :
                <><Ionicons name="trash" size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={s.deleteBtnTxt}>Delete Selected Data</Text></>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: COLORS.bg },
  center:           { flex: 1, alignItems: "center", justifyContent: "center" },
  header:           { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:             { marginRight: 12 },
  title:            { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  content:          { padding: 16, gap: 12, paddingBottom: 40 },
  warningBox:       { flexDirection: "row", gap: 10, backgroundColor: COLORS.error + "12", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.error + "40" },
  warningTxt:       { flex: 1, fontSize: 13, color: COLORS.error, lineHeight: 20, fontWeight: "600" },
  resultsBox:       { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  resultsTitle:     { fontSize: 14, fontWeight: "700", color: COLORS.dark, marginBottom: 8 },
  resultRow:        { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  resultTxt:        { fontSize: 13, color: COLORS.dark },
  sectionLabel:     { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 1 },
  tableRow:         { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  tableRowSelected: { borderColor: COLORS.error, backgroundColor: COLORS.error + "06" },
  checkbox:         { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  checkboxChecked:  { backgroundColor: COLORS.error, borderColor: COLORS.error },
  tableName:        { fontSize: 13, fontWeight: "700", color: COLORS.dark },
  tableDesc:        { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  countBadge:       { backgroundColor: COLORS.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.border },
  countTxt:         { fontSize: 11, color: COLORS.mid, fontWeight: "600" },
  confirmBox:       { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 2, borderColor: COLORS.error, gap: 10 },
  confirmLabel:     { fontSize: 13, fontWeight: "700", color: COLORS.error },
  confirmInput:     { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, fontSize: 16, color: COLORS.error, fontWeight: "800", borderWidth: 2, borderColor: COLORS.border, textAlign: "center", letterSpacing: 4 },
  deleteBtn:        { backgroundColor: COLORS.error, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  deleteBtnTxt:     { color: "#fff", fontSize: 15, fontWeight: "700" },
});
