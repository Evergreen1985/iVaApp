import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { supabase } from "../../../src/lib/supabase";
import { useRealtime } from "../../../src/lib/realtime";

const { width: SW } = Dimensions.get("window");
const CELL = (SW - 42) / 3;

type Photo = {
  id: string;
  photo_url: string;
  title: string | null;
  section_name: string | null;
  uploaded_at: string;
};

export default function ParentPhotos() {
  const [photos, setPhotos]       = useState<Photo[]>([]);
  const [filtered, setFiltered]   = useState<Photo[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refresh, setRefresh]     = useState(false);
  const [search, setSearch]       = useState("");
  const [preview, setPreview]     = useState<Photo | null>(null);
  const [sections, setSections]   = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState("All");

  const loadPhotos = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const { data } = await supabase
        .from("section_photos")
        .select("id, photo_url, title, section_name, uploaded_at")
        .order("uploaded_at", { ascending: false })
        .limit(200);
      const list: Photo[] = data || [];
      setPhotos(list);
      // Collect unique section names
      const names = Array.from(new Set(list.map(p => p.section_name).filter(Boolean) as string[]));
      setSections(names);
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  }, []);

  useEffect(() => { loadPhotos(); }, []);
  useRealtime("section_photos", () => loadPhotos());

  // Filter whenever photos, section or search changes
  useEffect(() => {
    let list = photos;
    if (activeSection !== "All") list = list.filter(p => p.section_name === activeSection);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.section_name?.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [photos, activeSection, search]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.topBar}>
        <Text style={s.title}>School Photos</Text>
        <Text style={s.countBadge}>{filtered.length}</Text>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={16} color={COLORS.mid} />
        <TextInput
          style={s.searchInput}
          placeholder="Search photos…"
          placeholderTextColor={COLORS.mid}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={COLORS.mid} />
          </TouchableOpacity>
        )}
      </View>

      {/* Section filter pills */}
      {sections.length > 0 && (
        <FlatList
          data={["All", ...sections]}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.pill, activeSection === item && s.pillOn]}
              onPress={() => setActiveSection(item)}
              activeOpacity={0.8}
            >
              <Text style={[s.pillTxt, activeSection === item && s.pillTxtOn]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="images-outline" size={52} color={COLORS.mid} />
          <Text style={s.emptyTxt}>No photos yet</Text>
          <Text style={s.emptySub}>Teachers upload class photos here</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={3}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => loadPhotos(true)} tintColor={COLORS.edu} />}
          contentContainerStyle={s.grid}
          columnWrapperStyle={{ gap: 2 }}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setPreview(item)} activeOpacity={0.9}>
              <Image source={{ uri: item.photo_url }} style={s.cell} resizeMode="cover" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Full-screen preview modal */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={s.modal}>
          <TouchableOpacity style={s.modalClose} onPress={() => setPreview(null)}>
            <Ionicons name="close-circle" size={32} color="#fff" />
          </TouchableOpacity>
          {preview && (
            <>
              <Image
                source={{ uri: preview.photo_url }}
                style={s.modalImg}
                resizeMode="contain"
              />
              <View style={s.modalMeta}>
                {preview.title && <Text style={s.modalTitle}>{preview.title}</Text>}
                <Text style={s.modalSub}>
                  {preview.section_name ? `${preview.section_name} · ` : ""}
                  {new Date(preview.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.bg },
  center:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  topBar:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  title:      { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  countBadge: { fontSize: 13, fontWeight: "700", color: COLORS.mid },
  searchBox:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput:{ flex: 1, fontSize: 14, color: COLORS.dark },
  pillRow:    { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  pill:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border },
  pillOn:     { backgroundColor: COLORS.edu, borderColor: COLORS.edu },
  pillTxt:    { fontSize: 12, fontWeight: "600", color: COLORS.mid },
  pillTxtOn:  { color: "#fff" },
  grid:       { paddingBottom: 30 },
  cell:       { width: CELL, height: CELL },
  emptyTxt:   { fontSize: 16, fontWeight: "700", color: COLORS.dark },
  emptySub:   { fontSize: 13, color: COLORS.mid },

  // Modal
  modal:       { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  modalClose:  { position: "absolute", top: 52, right: 20, zIndex: 10 },
  modalImg:    { width: SW, height: SW * 1.2 },
  modalMeta:   { position: "absolute", bottom: 40, left: 20, right: 20 },
  modalTitle:  { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 4 },
  modalSub:    { fontSize: 13, color: "rgba(255,255,255,0.65)" },
});
