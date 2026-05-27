import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         Modal, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS, SUPABASE_URL, SUPABASE_ANON } from "../../src/lib/constants";
import { generateAllAudio, deleteAudioOverview } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const VOICES = ["Aoede", "Zephyr", "Puck", "Charon", "Kore", "Fenrir"];

export default function AdminAudio() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle]       = useState("");
  const [content, setContent]   = useState("");
  const [voice, setVoice]       = useState("Aoede");
  const [busy, setBusy]         = useState(false);
  const [library, setLibrary]   = useState<any[]>([]);
  const [loadingLib, setLoadingLib] = useState(true);

  const loadLibrary = async () => {
    setLoadingLib(true);
    try {
      // Load unique titles (one entry per content, grouped by title)
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/audio_overviews?select=id,title,language,status,duration_seconds,created_at,voice&order=created_at.desc`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      const rows: any[] = await res.json();
      // Group by title — show one card per unique title with language count
      const map = new Map<string, any>();
      for (const row of Array.isArray(rows) ? rows : []) {
        if (!map.has(row.title)) map.set(row.title, { ...row, languages: [row.language], ids: [row.id] });
        else {
          const e = map.get(row.title);
          e.languages.push(row.language);
          e.ids.push(row.id);
        }
      }
      setLibrary([...map.values()]);
    } catch {}
    setLoadingLib(false);
  };

  useEffect(() => { loadLibrary(); }, []);

  const createAudio = async () => {
    if (!title.trim() || !content.trim()) { Alert.alert("Fill in title and content"); return; }
    setBusy(true);
    try {
      const res = await generateAllAudio(token, title, content, voice);
      const succeeded = res?.succeeded ?? 0;
      const total     = res?.total ?? 6;
      Alert.alert(
        "Audio Overviews Created",
        `Generated in ${succeeded}/${total} languages. Parents will hear it in their profile language.`
      );
      resetForm();
      loadLibrary();
    } catch { Alert.alert("Failed to generate audio overviews"); }
    setBusy(false);
  };

  const resetForm = () => {
    setShowForm(false); setTitle(""); setContent(""); setVoice("Aoede");
  };

  const handleDelete = (item: any) => {
    Alert.alert("Delete Audio", `Remove "${item.title}" in all languages?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        // Delete all language variants
        for (const id of item.ids) {
          await deleteAudioOverview(token, id);
        }
        setLibrary(prev => prev.filter(a => a.title !== item.title));
      }},
    ]);
  };

  const LANG_FLAGS: Record<string, string> = {
    en: "EN", te: "TE", hi: "HI", ta: "TA", kn: "KN", ml: "ML"
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={s.title}>Audio Overviews</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.infoBox}>
          <Ionicons name="headset" size={24} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.infoTitle}>Auto-translated into 6 Languages</Text>
            <Text style={s.infoDesc}>Create once — the AI generates audio in English, Telugu, Hindi, Tamil, Kannada and Malayalam. Each parent hears it in their profile language.</Text>
          </View>
        </View>

        {loadingLib ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : library.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="mic-outline" size={48} color={COLORS.mid} />
            <Text style={s.emptyTitle}>No audio overviews yet</Text>
            <Text style={s.emptyDesc}>Tap + to create your first audio overview</Text>
            <TouchableOpacity style={s.createBtn} onPress={() => setShowForm(true)}>
              <Text style={s.createBtnTxt}>Create Audio Overview</Text>
            </TouchableOpacity>
          </View>
        ) : library.map((item, i) => (
          <View key={item.title + i} style={s.card}>
            <View style={s.playBtn}>
              <Ionicons name="mic" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <View style={s.langRow}>
                {item.languages.map((l: string) => (
                  <View key={l} style={s.langChip}>
                    <Text style={s.langChipTxt}>{LANG_FLAGS[l] ?? l.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.cardDate}>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : ""}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)} style={s.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={resetForm}>
        <Pressable style={s.overlay} onPress={resetForm}>
          <Pressable style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>New Audio Overview</Text>
              <TouchableOpacity onPress={resetForm}>
                <Ionicons name="close" size={22} color={COLORS.mid} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Title</Text>
              <TextInput style={s.input} placeholder="e.g. Weekly School Update"
                placeholderTextColor={COLORS.mid} value={title} onChangeText={setTitle} />

              <Text style={s.label}>Content / Key Points</Text>
              <TextInput style={[s.input, s.tall]}
                placeholder="Describe what you want to communicate to parents..."
                placeholderTextColor={COLORS.mid} value={content} onChangeText={setContent}
                multiline textAlignVertical="top" />

              <Text style={s.label}>Voice</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.voiceRow}>
                {VOICES.map(v => (
                  <TouchableOpacity key={v} style={[s.voiceBtn, voice === v && s.voiceBtnActive]} onPress={() => setVoice(v)}>
                    <Text style={[s.voiceTxt, voice === v && s.voiceTxtActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={s.langPreview}>
                <Ionicons name="globe-outline" size={16} color={COLORS.primary} />
                <Text style={s.langPreviewTxt}>Will generate in: EN · TE · HI · TA · KN · ML</Text>
              </View>

              <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={createAudio} disabled={busy}>
                {busy ? (
                  <View style={{ alignItems: "center", gap: 8 }}>
                    <ActivityIndicator color="#fff" />
                    <Text style={[s.saveTxt, { fontSize: 13 }]}>Generating in 6 languages… (may take ~30s)</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={s.saveTxt}>Create in All 6 Languages</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: COLORS.bg },
  header:         { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:           { marginRight: 12 },
  title:          { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  addBtn:         { backgroundColor: COLORS.primary, borderRadius: 10, padding: 6 },
  content:        { padding: 16, gap: 12 },
  infoBox:        { flexDirection: "row", backgroundColor: COLORS.primary + "12", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.primary + "30" },
  infoTitle:      { fontSize: 14, fontWeight: "700", color: COLORS.dark, marginBottom: 4 },
  infoDesc:       { fontSize: 12, color: COLORS.mid, lineHeight: 18 },
  empty:          { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle:     { fontSize: 16, fontWeight: "700", color: COLORS.dark },
  emptyDesc:      { fontSize: 13, color: COLORS.mid },
  createBtn:      { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  createBtnTxt:   { color: "#fff", fontWeight: "700", fontSize: 14 },
  card:           { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  playBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + "18", alignItems: "center", justifyContent: "center" },
  cardTitle:      { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  langRow:        { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  langChip:       { backgroundColor: COLORS.primary + "18", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  langChipTxt:    { fontSize: 10, fontWeight: "700", color: COLORS.primary },
  cardDate:       { fontSize: 11, color: COLORS.mid, marginTop: 4 },
  deleteBtn:      { padding: 8 },
  overlay:        { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:          { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" },
  sheetHeader:    { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  sheetTitle:     { flex: 1, fontSize: 17, fontWeight: "800", color: COLORS.dark },
  label:          { fontSize: 12, fontWeight: "700", color: COLORS.mid, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input:          { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  tall:           { minHeight: 100 },
  voiceRow:       { gap: 8, marginBottom: 14 },
  voiceBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  voiceBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  voiceTxt:       { fontSize: 12, fontWeight: "600", color: COLORS.dark },
  voiceTxtActive: { color: "#fff" },
  langPreview:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.primary + "10", borderRadius: 12, padding: 12, marginBottom: 16 },
  langPreviewTxt: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },
  saveBtn:        { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  saveTxt:        { color: "#fff", fontSize: 16, fontWeight: "700" },
});
