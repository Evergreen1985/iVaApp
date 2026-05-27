import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getBlogPosts, createBlogPost } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const CATEGORIES = ["news","announcement","event","tips","milestone"];

export default function AdminBlog() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [bTitle, setBTitle]     = useState("");
  const [bContent, setBContent] = useState("");
  const [bCategory, setBCategory] = useState("news");
  const [busy, setBusy]         = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getBlogPosts(token);
      const data = res?.posts ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!bTitle || !bContent) return;
    setBusy(true);
    await createBlogPost(token, { title: bTitle, content: bContent, category: bCategory });
    setBusy(false);
    setShowForm(false); setBTitle(""); setBContent("");
    load(true);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Blog & News</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="newspaper-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No posts yet</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={[s.catBadge, { backgroundColor: COLORS.primary + "18" }]}>
              <Text style={[s.catTxt, { color: COLORS.primary }]}>{item.category || "news"}</Text>
            </View>
            <Text style={s.postTitle}>{item.title}</Text>
            <Text style={s.postBody} numberOfLines={2}>{item.content}</Text>
            <Text style={s.date}>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : ""}</Text>
          </View>
        ))}
      </ScrollView>
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>New Post</Text>
            <TextInput style={s.input} placeholder="Title *" placeholderTextColor={COLORS.mid} value={bTitle} onChangeText={setBTitle} />
            <TextInput style={[s.input, { minHeight: 100, textAlignVertical: "top" }]} placeholder="Content *" placeholderTextColor={COLORS.mid} value={bContent} onChangeText={setBContent} multiline />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} style={[s.chip, bCategory === c && s.chipActive]} onPress={() => setBCategory(c)}>
                  <Text style={[s.chipTxt, bCategory === c && { color: "#fff" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Publish</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.bg },
  center:     { flex: 1, alignItems: "center", justifyContent: "center" },
  header:     { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:       { marginRight: 12 },
  title:      { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  addBtn:     { backgroundColor: COLORS.primary, borderRadius: 10, padding: 6 },
  content:    { padding: 16, gap: 10 },
  empty:      { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:   { fontSize: 14, color: COLORS.mid },
  card:       { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  catBadge:   { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  catTxt:     { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  postTitle:  { fontSize: 15, fontWeight: "700", color: COLORS.dark, marginBottom: 4 },
  postBody:   { fontSize: 13, color: COLORS.mid, lineHeight: 18 },
  date:       { fontSize: 11, color: COLORS.mid, marginTop: 8 },
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:      { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:      { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  chip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:    { fontSize: 12, fontWeight: "600", color: COLORS.dark, textTransform: "capitalize" },
  saveBtn:    { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:    { color: "#fff", fontSize: 16, fontWeight: "700" },
});
