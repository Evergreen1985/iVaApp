import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Image, Modal, Pressable, TextInput, FlatList, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAdminPhotos } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const { width } = Dimensions.get("window");
const IMG_SIZE = (width - 48) / 3;

const CATEGORIES = ["all","events","classroom","trips","sports","celebrations"];

export default function AdminPhotos() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [photos, setPhotos]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [cat, setCat]           = useState("all");
  const [preview, setPreview]   = useState<any>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAdminPhotos(token);
      const data = res?.photos ?? res;
      setPhotos(Array.isArray(data) ? data : []);
    } catch { setPhotos([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = cat === "all" ? photos : photos.filter(p => p.category === cat);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Photos</Text>
        <Text style={s.count}>{photos.length}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.chipRow} contentContainerStyle={s.chipContent}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[s.chip, cat === c && s.chipActive]} onPress={() => setCat(c)}>
            <Text style={[s.chipTxt, cat === c && s.chipTxtActive]}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.grid}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}>
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="images-outline" size={40} color={COLORS.mid} />
            <Text style={s.emptyTxt}>No photos in this category</Text>
          </View>
        ) : filtered.map((photo, i) => (
          <TouchableOpacity key={photo.id || i} style={s.thumb} onPress={() => setPreview(photo)}>
            {photo.url || photo.photo_url ? (
              <Image source={{ uri: photo.url || photo.photo_url }} style={s.img} />
            ) : (
              <View style={[s.img, s.placeholder]}>
                <Ionicons name="image-outline" size={24} color={COLORS.mid} />
              </View>
            )}
            {photo.category && (
              <View style={s.catBadge}><Text style={s.catBadgeTxt}>{photo.category}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={s.overlay} onPress={() => setPreview(null)}>
          <View style={s.previewBox}>
            {preview?.url || preview?.photo_url ? (
              <Image source={{ uri: preview.url || preview.photo_url }}
                style={s.previewImg} resizeMode="contain" />
            ) : (
              <View style={[s.previewImg, s.placeholder]}>
                <Ionicons name="image-outline" size={48} color={COLORS.mid} />
              </View>
            )}
            <View style={s.previewInfo}>
              <Text style={s.previewTitle}>{preview?.caption || preview?.title || "Photo"}</Text>
              {preview?.uploaded_by && <Text style={s.previewMeta}>Uploaded by: {preview.uploaded_by}</Text>}
              {preview?.created_at && (
                <Text style={s.previewMeta}>{new Date(preview.created_at).toLocaleDateString("en-IN")}</Text>
              )}
            </View>
          </View>
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
  count:         { fontSize: 13, color: COLORS.mid, fontWeight: "600" },
  chipRow:       { maxHeight: 52, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chipContent:   { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:       { fontSize: 12, fontWeight: "600", color: COLORS.mid },
  chipTxtActive: { color: "#fff" },
  grid:          { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 4 },
  thumb:         { width: IMG_SIZE, height: IMG_SIZE, borderRadius: 8, overflow: "hidden", position: "relative" },
  img:           { width: "100%", height: "100%", backgroundColor: COLORS.border },
  placeholder:   { alignItems: "center", justifyContent: "center" },
  catBadge:      { position: "absolute", bottom: 4, left: 4, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  catBadgeTxt:   { fontSize: 9, color: "#fff", fontWeight: "600", textTransform: "capitalize" },
  empty:         { flex: 1, alignItems: "center", paddingTop: 80, gap: 10, width: "100%" },
  emptyTxt:      { fontSize: 14, color: COLORS.mid },
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 24 },
  previewBox:    { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", width: "100%" },
  previewImg:    { width: "100%", height: 300, backgroundColor: "#000" },
  previewInfo:   { padding: 16 },
  previewTitle:  { fontSize: 15, fontWeight: "700", color: COLORS.dark, marginBottom: 4 },
  previewMeta:   { fontSize: 12, color: COLORS.mid, marginTop: 2 },
});
