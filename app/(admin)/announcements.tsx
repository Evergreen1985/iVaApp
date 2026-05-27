import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const TARGETS = ["all", "parents", "staff"];

export default function AdminAnnouncements() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle]     = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget]   = useState("all");
  const [busy, setBusy]       = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAnnouncements(token);
      const data = res?.announcements ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!title || !message) { Alert.alert("Fill all fields"); return; }
    setBusy(true);
    await createAnnouncement(token, { title, message, target });
    setBusy(false);
    setShowForm(false); setTitle(""); setMessage(""); setTarget("all");
    load(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete", "Remove this announcement?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await deleteAnnouncement(token, id); load(true);
        }
      },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={s.title}>Announcements</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
      >
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="megaphone-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No announcements</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardBody} numberOfLines={2}>{item.message}</Text>
                <View style={s.metaRow}>
                  <View style={s.targetBadge}><Text style={s.targetTxt}>{item.target || "all"}</Text></View>
                  <Text style={s.date}>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : ""}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.delBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Create modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>New Announcement</Text>
            <TextInput style={s.input} placeholder="Title" placeholderTextColor={COLORS.mid} value={title} onChangeText={setTitle} />
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: "top" }]} placeholder="Message" placeholderTextColor={COLORS.mid}
              value={message} onChangeText={setMessage} multiline />
            <Text style={s.label}>Send to</Text>
            <View style={s.targetRow}>
              {TARGETS.map((t) => (
                <TouchableOpacity key={t} style={[s.targetBtn, target === t && s.targetBtnActive]} onPress={() => setTarget(t)}>
                  <Text style={[s.targetBtnTxt, target === t && { color: "#fff" }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Send Announcement</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  center:        { flex: 1, alignItems: "center", justifyContent: "center" },
  header:        { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:          { marginRight: 12 },
  title:         { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  addBtn:        { backgroundColor: COLORS.primary, borderRadius: 10, padding: 6 },
  content:       { padding: 16, gap: 10 },
  empty:         { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:      { fontSize: 14, color: COLORS.mid },
  card:          { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  cardRow:       { flexDirection: "row", gap: 10 },
  cardTitle:     { fontSize: 15, fontWeight: "700", color: COLORS.dark, marginBottom: 4 },
  cardBody:      { fontSize: 13, color: COLORS.mid, lineHeight: 18 },
  metaRow:       { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  targetBadge:   { backgroundColor: COLORS.primary + "18", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  targetTxt:     { fontSize: 11, fontWeight: "700", color: COLORS.primary, textTransform: "capitalize" },
  date:          { fontSize: 11, color: COLORS.mid },
  delBtn:        { padding: 6, alignSelf: "flex-start" },
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:         { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle:    { fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:         { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  label:         { fontSize: 12, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", marginBottom: 8 },
  targetRow:     { flexDirection: "row", gap: 8, marginBottom: 16 },
  targetBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  targetBtnActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  targetBtnTxt:  { fontSize: 13, fontWeight: "600", color: COLORS.dark, textTransform: "capitalize" },
  saveBtn:       { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:       { color: "#fff", fontSize: 16, fontWeight: "700" },
});
