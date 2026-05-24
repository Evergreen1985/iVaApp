import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert, RefreshControl, TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { createClient } from "@supabase/supabase-js";
import { COLORS, SUPABASE_URL, SUPABASE_ANON } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { getSectionPhotos, postPhotoRecord } from "../../../src/lib/api";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

export default function TeacherPhotos() {
  const { t } = useTranslation();
  const { session } = useSession();
  const sectionId = session?.sectionId || "";
  const sectionName = session?.name || "";

  const [photos, setPhotos]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle]       = useState("");

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const data = await getSectionPhotos(sectionId);
      setPhotos(Array.isArray(data) ? data : []);
    } catch { setPhotos([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { if (sectionId) load(); else setLoading(false); }, [sectionId]);

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photos."); return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext   = asset.uri.split(".").pop() || "jpg";
      const path  = `sections/${sectionId}/${Date.now()}.${ext}`;

      const response = await fetch(asset.uri);
      const blob     = await response.blob();

      const { error: upErr } = await sb.storage.from("photos").upload(path, blob, { contentType: `image/${ext}` });
      if (upErr) { Alert.alert("Upload failed", upErr.message); setUploading(false); return; }

      const { data: { publicUrl } } = sb.storage.from("photos").getPublicUrl(path);

      await postPhotoRecord({
        photoUrl:       publicUrl,
        sectionId,
        sectionName,
        title:          title.trim() || undefined,
        uploadedBy:     session?.name,
        uploadedByRole: "teacher",
      });
      setTitle("");
      Alert.alert("Uploaded!", "Photo added to class gallery.");
      load(true);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Upload failed.");
    }
    setUploading(false);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
    >
      <Text style={s.pageTitle}>{t("photos")}</Text>

      {/* Upload */}
      <View style={s.uploadCard}>
        <TextInput
          style={s.titleInput}
          placeholder="Caption / title (optional)"
          placeholderTextColor={COLORS.mid}
          value={title}
          onChangeText={setTitle}
        />
        <TouchableOpacity style={s.uploadBtn} onPress={handleUpload} disabled={uploading} activeOpacity={0.85}>
          {uploading
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="camera-outline" size={18} color="#fff" />
                <Text style={s.uploadTxt}>Upload Photo</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* Gallery */}
      {photos.length === 0
        ? (
          <View style={s.emptyBox}>
            <Ionicons name="images-outline" size={48} color={COLORS.mid} />
            <Text style={s.emptyTxt}>No photos yet. Upload above!</Text>
          </View>
        )
        : (
          <View style={s.grid}>
            {photos.map((p: any) => (
              <View key={p.id || p.photo_url} style={s.photoCard}>
                <Image source={{ uri: p.photo_url || p.photoUrl }} style={s.photo} resizeMode="cover" />
                {p.title && <Text style={s.photoTitle}>{p.title}</Text>}
                <Text style={s.photoDate}>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : ""}
                </Text>
              </View>
            ))}
          </View>
        )
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 16, paddingBottom: 50 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:   { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  uploadCard:  { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, gap: 10 },
  titleInput:  { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  uploadBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, padding: 13 },
  uploadTxt:   { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyBox:    { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyTxt:    { fontSize: 14, color: COLORS.mid },
  grid:        { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoCard:   { width: "47%", backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  photo:       { width: "100%", height: 140 },
  photoTitle:  { fontSize: 12, fontWeight: "600", color: COLORS.dark, paddingHorizontal: 8, paddingTop: 6 },
  photoDate:   { fontSize: 10, color: COLORS.mid, paddingHorizontal: 8, paddingBottom: 8, marginTop: 2 },
});
