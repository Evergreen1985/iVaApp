import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert, RefreshControl, TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { supabase } from "../../../src/lib/supabase";
import { EDU_API } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { useRealtime } from "../../../src/lib/realtime";
import FaceAutoTagger from "../../../src/components/FaceAutoTagger";

export default function TeacherPhotos() {
  const { session } = useSession();
  const sectionId   = session?.sectionId || "";
  const sectionName = session?.sectionId || "";

  const [photos, setPhotos]           = useState<any[]>([]);
  const [kids, setKids]               = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refresh, setRefresh]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [progress, setProgress]       = useState(0);
  const [title, setTitle]             = useState("");

  const loadPhotos = async (isRefresh = false) => {
    if (!sectionId) { setLoading(false); return; }
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res  = await fetch(`${EDU_API}/api/reels/photos?sectionId=${encodeURIComponent(sectionId)}`);
      const json = await res.json();
      setPhotos(json.photos || []);
    } catch { setPhotos([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { if (sectionId) loadPhotos(); else setLoading(false); }, [sectionId]);
  useRealtime("section_photos", () => loadPhotos());

  // Children (with profile photos) used as the reference faces for auto-tagging
  useEffect(() => {
    if (!sectionId) return;
    supabase.from("enquiries").select("id, child_name, photo_url").eq("section_id", sectionId)
      .then(({ data }) => setKids(data || []));
  }, [sectionId]);

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photos."); return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsMultipleSelection: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const assets = result.assets;
    setUploading(true);
    setProgress(0);
    let done = 0;

    for (let i = 0; i < assets.length; i++) {
      try {
        const asset    = assets[i];
        const ext      = (asset.uri.split(".").pop() || "jpg").toLowerCase();
        const mimeType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
        const path     = `sections/${sectionId}/${Date.now()}_${i}.${ext}`;

        const res = await fetch(asset.uri);
        const arrayBuffer = await res.arrayBuffer();

        const { error: upErr } = await supabase.storage
          .from("school-photos")
          .upload(path, arrayBuffer, { contentType: mimeType });
        if (upErr) continue;

        const { data: { publicUrl } } = supabase.storage.from("school-photos").getPublicUrl(path);

        const { error: dbErr } = await supabase.from("section_photos").insert({
          photo_url:        publicUrl,
          section_id:       sectionId,
          section_name:     sectionName,
          title:            title.trim() || null,
          uploaded_by:      session?.name || null,
          uploaded_by_role: "teacher",
          is_featured:      false,
        });
        if (dbErr) continue;

        done++;
      } catch { }
      setProgress(Math.round(((i + 1) / assets.length) * 100));
    }

    setUploading(false);
    setProgress(0);
    setTitle("");

    if (done > 0) {
      Alert.alert("Done!", `${done} photo${done > 1 ? "s" : ""} uploaded.`);
      loadPhotos(true);
    } else {
      Alert.alert("Error", "Upload failed. Check connection.");
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => loadPhotos(true)} tintColor={COLORS.primary} />}
    >
      <View style={s.header}>
        <Text style={s.pageTitle}>Class Photos</Text>
        <Text style={s.photoCount}>{photos.length} photos</Text>
      </View>

      {/* Upload card */}
      <View style={s.uploadCard}>
        <TextInput
          style={s.titleInput}
          placeholder="Caption / title (optional)"
          placeholderTextColor={COLORS.mid}
          value={title}
          onChangeText={setTitle}
        />
        <TouchableOpacity style={s.uploadBtn} onPress={handleUpload} disabled={uploading} activeOpacity={0.85}>
          {uploading ? (
            <View style={s.progressRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.uploadTxt}>Uploading… {progress}%</Text>
            </View>
          ) : (
            <>
              <Ionicons name="images-outline" size={18} color="#fff" />
              <Text style={s.uploadTxt}>Upload Photos</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={s.hint}>Tap to select one or multiple photos at once</Text>
      </View>

      {/* Gallery grid */}
      {photos.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="images-outline" size={48} color={COLORS.mid} />
          <Text style={s.emptyTxt}>No photos yet. Upload above!</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {photos.map((p: any) => (
            <View key={p.id || p.photo_url} style={s.photoCard}>
              <Image source={{ uri: p.photo_url }} style={s.photo} resizeMode="cover" />
              {p.title && <Text style={s.photoTitle} numberOfLines={1}>{p.title}</Text>}
              <Text style={s.photoDate}>
                {new Date(p.uploaded_at || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </Text>
              <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
                <FaceAutoTagger photo={p} children={kids} onSaved={() => loadPhotos(true)} />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 16, paddingBottom: 50 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  pageTitle:   { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  photoCount:  { fontSize: 13, color: COLORS.mid, fontWeight: "600" },
  uploadCard:  { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, gap: 10 },
  titleInput:  { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  uploadBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, padding: 13 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadTxt:   { color: "#fff", fontWeight: "700", fontSize: 14 },
  hint:        { fontSize: 11, color: COLORS.mid, textAlign: "center" },
  emptyBox:    { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyTxt:    { fontSize: 14, color: COLORS.mid },
  grid:        { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoCard:   { width: "47%", backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  photo:       { width: "100%", height: 140 },
  photoTitle:  { fontSize: 12, fontWeight: "600", color: COLORS.dark, paddingHorizontal: 8, paddingTop: 6 },
  photoDate:   { fontSize: 10, color: COLORS.mid, paddingHorizontal: 8, paddingBottom: 8, marginTop: 2 },
});
