import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getKBDocuments } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const CATEGORIES = ["all","policy","curriculum","safety","forms","other"];

const DOC_ICON: Record<string,string> = {
  pdf: "document-text",
  doc: "document",
  docx: "document",
  xls: "grid",
  xlsx: "grid",
  ppt: "easel",
  pptx: "easel",
  default: "attach",
};

function getIcon(filename: string): string {
  const ext = filename?.split(".").pop()?.toLowerCase() || "";
  return DOC_ICON[ext] || DOC_ICON.default;
}

function getColor(category: string): string {
  const map: Record<string,string> = {
    policy: COLORS.error, curriculum: COLORS.edu, safety: COLORS.orange,
    forms: COLORS.primary, other: COLORS.mid,
  };
  return map[category] || COLORS.mid;
}

export default function AdminKB() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [docs, setDocs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [cat, setCat]           = useState("all");
  const [search, setSearch]     = useState("");

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getKBDocuments(token);
      const data = res?.documents ?? res;
      setDocs(Array.isArray(data) ? data : []);
    } catch { setDocs([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = docs.filter(d => {
    const matchCat = cat === "all" || d.category === cat;
    const matchSearch = !search || (d.title || d.name || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Knowledge Base</Text>
        <Text style={s.count}>{docs.length}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.chipRow} contentContainerStyle={s.chipContent}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[s.chip, cat === c && s.chipActive]} onPress={() => setCat(c)}>
            <Text style={[s.chipTxt, cat === c && s.chipTxtActive]}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}>
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="library-outline" size={40} color={COLORS.mid} />
            <Text style={s.emptyTxt}>No documents found</Text>
          </View>
        ) : filtered.map((doc, i) => {
          const color = getColor(doc.category);
          const icon = getIcon(doc.filename || doc.url || "");
          return (
            <TouchableOpacity key={doc.id || i} style={s.card}
              onPress={() => { if (doc.url) Linking.openURL(doc.url); }}>
              <View style={[s.iconBox, { backgroundColor: color + "18" }]}>
                <Ionicons name={icon as any} size={22} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.docTitle}>{doc.title || doc.name || "Document"}</Text>
                {doc.description && <Text style={s.docDesc} numberOfLines={1}>{doc.description}</Text>}
                <View style={s.metaRow}>
                  {doc.category && (
                    <View style={[s.catTag, { backgroundColor: color + "18" }]}>
                      <Text style={[s.catTagTxt, { color }]}>{doc.category}</Text>
                    </View>
                  )}
                  {doc.created_at && (
                    <Text style={s.docDate}>{new Date(doc.created_at).toLocaleDateString("en-IN")}</Text>
                  )}
                </View>
              </View>
              <Ionicons name="open-outline" size={18} color={COLORS.mid} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  center:        { flex: 1, alignItems: "center", justifyContent: "center" },
  header:        { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:          { marginRight: 12 },
  title:         { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  count:         { fontSize: 13, color: COLORS.mid, fontWeight: "600" },
  chipRow:       { maxHeight: 52, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chipContent:   { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipActive:    { backgroundColor: COLORS.edu, borderColor: COLORS.edu },
  chipTxt:       { fontSize: 12, fontWeight: "600", color: COLORS.mid },
  chipTxtActive: { color: "#fff" },
  content:       { padding: 16, gap: 10 },
  empty:         { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:      { fontSize: 14, color: COLORS.mid },
  card:          { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  iconBox:       { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  docTitle:      { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  docDesc:       { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  metaRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  catTag:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  catTagTxt:     { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  docDate:       { fontSize: 11, color: COLORS.mid },
});
