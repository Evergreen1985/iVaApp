import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Alert, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getOwnerAdmissions, deleteEnquiryRecord } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const STATUSES = ["all","new","called","visited","enrolled","not-interested","waitlist","cancelled"];
const STATUS_COLOR: Record<string,string> = {
  new: COLORS.primary, called: "#0891B2", visited: COLORS.orange,
  enrolled: COLORS.success, "not-interested": COLORS.error,
  waitlist: "#7C3AED", cancelled: COLORS.mid,
};

export default function OwnerAdmissions() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [filter, setFilter]     = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getOwnerAdmissions(token);
      const data = res?.enquiries ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? list : list.filter(e => e.status === filter);

  const counts = STATUSES.reduce((acc, st) => {
    acc[st] = st === "all" ? list.length : list.filter(e => e.status === st).length;
    return acc;
  }, {} as Record<string,number>);

  const handleDelete = () => {
    if (!selected) return;
    const childName = selected.child_name || selected.childName || "this child";
    // First confirmation
    Alert.alert(
      "Delete Child Record",
      `This will permanently delete ALL data for "${childName}" — fees, attendance, homework, photos, and the enquiry itself.\n\nThis cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: () => {
            // Second confirmation
            Alert.alert(
              "Are you absolutely sure?",
              `Type of deletion:\n• Enquiry record\n• Fee assignments\n• Attendance entries\n• All linked data\n\nConfirm permanent deletion of "${childName}"?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Permanently",
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteEnquiryRecord(token, selected.id);
                      // Remove instantly from local state — don't reload from cached backend
                      setList(prev => prev.filter(e => e.id !== selected.id));
                      setSelected(null);
                      Alert.alert("✅ Deleted", `"${childName}" has been removed from the system.`);
                    } catch (err: any) {
                      Alert.alert("Delete Failed", err?.message || "Unknown error.");
                    }
                    setDeleting(false);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>
  );

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={s.title}>Admissions Pipeline</Text>
        <Text style={s.count}>{list.length}</Text>
      </View>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.chipRow} contentContainerStyle={s.chipContent}>
        {STATUSES.map(st => (
          <TouchableOpacity key={st}
            style={[s.chip, filter === st && { backgroundColor: STATUS_COLOR[st] || COLORS.primary, borderColor: STATUS_COLOR[st] || COLORS.primary }]}
            onPress={() => setFilter(st)}>
            <Text style={[s.chipTxt, filter === st && { color: "#fff" }]}>
              {st.charAt(0).toUpperCase() + st.slice(1)} ({counts[st]})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}>
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="person-add-outline" size={40} color={COLORS.mid} />
            <Text style={s.emptyTxt}>No enquiries</Text>
          </View>
        ) : filtered.map((item, i) => {
          const color = STATUS_COLOR[item.status] || COLORS.mid;
          return (
            <TouchableOpacity key={item.id || i} style={s.card} activeOpacity={0.75}
              onPress={() => setSelected(item)}>
              <View style={[s.dot, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.child_name || item.childName || "Child"}</Text>
                <Text style={s.meta}>Parent: {item.parent_name || item.parentName || "—"} · {item.phone || "—"}</Text>
                <Text style={s.meta}>Programme: {item.programme || "—"} · Section: {item.section || "—"}</Text>
                {item.created_at && (
                  <Text style={s.date}>{new Date(item.created_at).toLocaleDateString("en-IN")}</Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <View style={[s.badge, { backgroundColor: color + "20" }]}>
                  <Text style={[s.badgeTxt, { color }]}>{item.status || "new"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={COLORS.mid} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Detail / Action bottom sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={s.overlay} onPress={() => setSelected(null)}>
          <Pressable style={s.sheet}>
            {/* Child info */}
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>{selected?.child_name || selected?.childName || "Child"}</Text>
            <Text style={s.sheetSub}>
              {selected?.parent_name || selected?.parentName || "—"} · {selected?.phone || "—"}
            </Text>

            <View style={s.infoGrid}>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Programme</Text>
                <Text style={s.infoVal}>{selected?.programme || "—"}</Text>
              </View>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Section</Text>
                <Text style={s.infoVal}>{selected?.section || "—"}</Text>
              </View>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Status</Text>
                <View style={[s.badge, { backgroundColor: (STATUS_COLOR[selected?.status] || COLORS.mid) + "20", alignSelf: "flex-start" }]}>
                  <Text style={[s.badgeTxt, { color: STATUS_COLOR[selected?.status] || COLORS.mid }]}>
                    {selected?.status || "new"}
                  </Text>
                </View>
              </View>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Enquiry Date</Text>
                <Text style={s.infoVal}>
                  {selected?.created_at ? new Date(selected.created_at).toLocaleDateString("en-IN") : "—"}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={s.divider} />

            {/* Delete button */}
            <TouchableOpacity
              style={[s.deleteBtn, deleting && { opacity: 0.6 }]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={s.deleteTxt}>Delete Record Permanently</Text>
                  </>
              }
            </TouchableOpacity>

            <Text style={s.deleteNote}>
              ⚠️ Removes all data: enquiry, fees, attendance, and linked records.
            </Text>

            <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)}>
              <Text style={s.closeTxt}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  header:      { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56,
                 backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:        { marginRight: 12 },
  title:       { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  count:       { fontSize: 13, color: COLORS.mid, fontWeight: "600" },
  chipRow:     { maxHeight: 52, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chipContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipTxt:     { fontSize: 11, fontWeight: "600", color: COLORS.mid },
  content:     { padding: 16, gap: 10 },
  empty:       { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:    { fontSize: 14, color: COLORS.mid },
  card:        { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#fff",
                 borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  dot:         { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  name:        { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  meta:        { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  date:        { fontSize: 11, color: COLORS.mid, marginTop: 4 },
  badge:       { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  badgeTxt:    { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  // Bottom sheet
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:       { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
                 padding: 24, paddingBottom: 36 },
  sheetHandle: { width: 36, height: 4, backgroundColor: COLORS.border, borderRadius: 2,
                 alignSelf: "center", marginBottom: 20 },
  sheetTitle:  { fontSize: 18, fontWeight: "800", color: COLORS.dark },
  sheetSub:    { fontSize: 13, color: COLORS.mid, marginTop: 4, marginBottom: 16 },
  infoGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  infoItem:    { minWidth: "45%", gap: 4 },
  infoLabel:   { fontSize: 10, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.5 },
  infoVal:     { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  divider:     { height: 1, backgroundColor: COLORS.border, marginBottom: 20 },
  deleteBtn:   { backgroundColor: COLORS.error, borderRadius: 14, padding: 16,
                 flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  deleteTxt:   { color: "#fff", fontSize: 15, fontWeight: "700" },
  deleteNote:  { fontSize: 11, color: COLORS.mid, textAlign: "center", marginTop: 10, marginBottom: 16 },
  closeBtn:    { backgroundColor: COLORS.bg, borderRadius: 14, padding: 14, alignItems: "center",
                 borderWidth: 1, borderColor: COLORS.border },
  closeTxt:    { fontSize: 14, fontWeight: "600", color: COLORS.dark },
});
