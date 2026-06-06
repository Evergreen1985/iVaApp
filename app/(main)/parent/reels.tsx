import { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
  TextInput, ActivityIndicator, Alert, Dimensions, Animated,
  Share, Linking, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, EDU_API } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { supabase } from "../../../src/lib/supabase";
import { useRealtime } from "../../../src/lib/realtime";

const { width: SW } = Dimensions.get("window");
const CELL = (SW - 4) / 3;

// ── Dark TikTok-style theme ───────────────────────────────────────────────────
const T = {
  bg:     "#0F0F0F",
  card:   "#1C1C1C",
  card2:  "#252525",
  border: "#2C2C2C",
  text:   "#FFFFFF",
  sub:    "rgba(255,255,255,0.55)",
  accent: COLORS.edu,
};

// ── Option data ───────────────────────────────────────────────────────────────
const TRANSITIONS = [
  { id: "fade",   label: "Fade",   emoji: "✨" },
  { id: "slide",  label: "Slide",  emoji: "↔️" },
  { id: "zoom",   label: "Zoom",   emoji: "🔍" },
  { id: "bounce", label: "Bounce", emoji: "🌀" },
] as const;

const SPEEDS = [
  { value: 1, label: "Fast",   emoji: "⚡", desc: "1s/photo" },
  { value: 2, label: "Normal", emoji: "🎬", desc: "2s/photo" },
  { value: 3, label: "Slow",   emoji: "🐌", desc: "3s/photo" },
];

const FILTERS = [
  { id: "natural",  label: "Natural", emoji: "🌿" },
  { id: "warm",     label: "Warm",    emoji: "☀️" },
  { id: "cool",     label: "Cool",    emoji: "❄️" },
  { id: "vintage",  label: "Vintage", emoji: "🎞️" },
  { id: "vibrant",  label: "Vibrant", emoji: "💫" },
] as const;

const MUSIC = [
  { id: "none",      label: "Silent",    emoji: "🔇", desc: "No music"  },
  { id: "upbeat",    label: "Upbeat",    emoji: "🎵", desc: "Energetic" },
  { id: "calm",      label: "Calm",      emoji: "🌊", desc: "Relaxing"  },
  { id: "fun",       label: "Fun",       emoji: "🎉", desc: "Playful"   },
  { id: "energetic", label: "Power",     emoji: "⚡", desc: "Dynamic"   },
] as const;

type TransId  = typeof TRANSITIONS[number]["id"];
type FilterId = typeof FILTERS[number]["id"];
type MusicId  = typeof MUSIC[number]["id"];
type Step     = 1 | 2 | 3;

// ── Photo cell (outside main to avoid re-mounting) ────────────────────────────
function PhotoCell({
  item, selected, onToggle,
}: { item: any; selected: string[]; onToggle: (url: string) => void }) {
  const url = item.photo_url || item.url || "";
  const idx = selected.indexOf(url);
  const sel = idx !== -1;
  return (
    <TouchableOpacity style={s.cell} onPress={() => onToggle(url)} activeOpacity={0.85}>
      <Image source={{ uri: url }} style={s.cellImg} resizeMode="cover" />
      {sel  && <View style={s.cellBorder} />}
      {!sel && selected.length > 0 && <View style={s.cellDim} />}
      {sel  && <View style={s.badge}><Text style={s.badgeNum}>{idx + 1}</Text></View>}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ParentReels() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeChild, session } = useSession();

  const [step, setStep]             = useState<Step>(1);
  const [photos, setPhotos]         = useState<any[]>([]);
  const [photoLoad, setPhotoLoad]   = useState(true);
  const [selected, setSelected]     = useState<string[]>([]);
  const [transition, setTransition] = useState<TransId>("fade");
  const [speed, setSpeed]           = useState(2);
  const [filter, setFilter]         = useState<FilterId>("natural");
  const [music, setMusic]           = useState<MusicId>("upbeat");
  const [caption, setCaption]       = useState("");
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl]     = useState("");
  const [videoDur, setVideoDur]     = useState(0);

  // expo-video player (expo-av removed in SDK 56). Loads the generated reel when ready.
  const videoPlayer = useVideoPlayer(null, (p) => { p.loop = true; });
  useEffect(() => {
    if (videoUrl) { try { videoPlayer.replace({ uri: videoUrl }); videoPlayer.play(); } catch {} }
  }, [videoUrl]);

  const spinVal  = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (generating) {
      spinLoop.current = Animated.loop(
        Animated.timing(spinVal, { toValue: 1, duration: 1400, useNativeDriver: true })
      );
      spinLoop.current.start();
    } else {
      spinLoop.current?.stop();
      spinVal.setValue(0);
    }
  }, [generating]);

  const loadPhotos = async () => {
    setPhotoLoad(true);
    try {
      const { data: photos } = await supabase
        .from("section_photos")
        .select("id, photo_url, title, section_name, uploaded_at")
        .order("uploaded_at", { ascending: false })
        .limit(60);
      setPhotos(photos || []);
    } catch {}
    setPhotoLoad(false);
  };

  useEffect(() => { loadPhotos(); }, []);
  useRealtime("section_photos", loadPhotos);

  const togglePhoto = useCallback((url: string) => {
    setSelected(prev => {
      if (prev.includes(url)) return prev.filter(u => u !== url);
      if (prev.length >= 20) { Alert.alert("Limit", "Maximum 20 photos per reel"); return prev; }
      return [...prev, url];
    });
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${EDU_API}/api/reels/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrls: selected, transition, durationPerPhoto: speed,
          filter, music, caption, schoolName: "Evergreen Preschool",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.videoUrl) throw new Error(data.error || "Generation failed");
      setVideoUrl(data.videoUrl);
      setVideoDur(data.duration || selected.length * speed);
    } catch (e: any) {
      Alert.alert("Could not create reel", e.message || "Try with fewer photos or try again later");
    }
    setGenerating(false);
  };

  // ── Step 1: Photo grid ──────────────────────────────────────────────────────
  const step1 = (
    <View style={{ flex: 1 }}>
      <View style={s.libBadge}>
        <Ionicons name="lock-closed" size={12} color={T.accent} />
        <Text style={s.libTxt}>School library · {photos.length} photos available</Text>
      </View>

      {photoLoad ? (
        <View style={s.center}><ActivityIndicator size="large" color={T.accent} /></View>
      ) : photos.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="images-outline" size={60} color={T.sub} />
          <Text style={[s.sub, { marginTop: 14, textAlign: "center", paddingHorizontal: 32 }]}>
            No photos yet in the school library{"\n"}Teachers upload class photos here
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          numColumns={3}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ paddingBottom: 90 }}
          columnWrapperStyle={{ gap: 2 }}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
          renderItem={({ item }) => (
            <PhotoCell item={item} selected={selected} onToggle={togglePhoto} />
          )}
        />
      )}

      {/* Sticky bottom */}
      <View style={[s.stickyBar, { paddingBottom: 10 + insets.bottom }]}>
        <Text style={s.stickyTxt} numberOfLines={1}>
          {selected.length === 0
            ? "Tap photos to select  ·  max 20"
            : `${selected.length} selected  ·  ~${selected.length * speed}s reel`}
        </Text>
        <TouchableOpacity
          style={[s.nextBtn, selected.length === 0 && s.btnDim]}
          onPress={() => selected.length > 0 && setStep(2)}
          activeOpacity={0.85}
        >
          <Text style={s.nextTxt}>Next</Text>
          <Ionicons name="chevron-forward" size={15} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step 2: Style ────────────────────────────────────────────────────────────
  const step2 = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>
      <Text style={s.sec}>Transition Effect</Text>
      <View style={s.tileRow}>
        {TRANSITIONS.map(tr => (
          <TouchableOpacity
            key={tr.id}
            style={[s.tile, transition === tr.id && s.tileOn]}
            onPress={() => setTransition(tr.id)}
            activeOpacity={0.8}
          >
            <Text style={s.tileEmoji}>{tr.emoji}</Text>
            <Text style={[s.tileTxt, transition === tr.id && { color: T.accent }]}>{tr.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.sec, { marginTop: 24 }]}>Photo Speed</Text>
      <View style={s.pillRow}>
        {SPEEDS.map(sp => (
          <TouchableOpacity
            key={sp.value}
            style={[s.pill, speed === sp.value && s.pillOn, { flex: 1 }]}
            onPress={() => setSpeed(sp.value)}
            activeOpacity={0.8}
          >
            <Text style={s.pillEmoji}>{sp.emoji}</Text>
            <Text style={[s.pillLbl, speed === sp.value && { color: T.accent }]}>{sp.label}</Text>
            <Text style={s.pillSub}>{sp.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.sec, { marginTop: 24 }]}>Color Filter</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[s.fChip, filter === f.id && s.fChipOn]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.8}
            >
              <Text style={s.fEmoji}>{f.emoji}</Text>
              <Text style={[s.fTxt, filter === f.id && { color: T.accent }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[s.navRow, { marginBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={15} color={T.sub} />
          <Text style={s.backTxt}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.nextBtn, { flex: 1 }]} onPress={() => setStep(3)} activeOpacity={0.85}>
          <Text style={s.nextTxt}>Next</Text>
          <Ionicons name="chevron-forward" size={15} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ── Step 3: Finish ───────────────────────────────────────────────────────────
  const step3 = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <Text style={s.sec}>Background Music</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {MUSIC.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[s.mChip, music === m.id && s.mChipOn]}
              onPress={() => setMusic(m.id)}
              activeOpacity={0.8}
            >
              <Text style={s.mEmoji}>{m.emoji}</Text>
              <Text style={[s.mLbl, music === m.id && { color: T.accent }]}>{m.label}</Text>
              <Text style={s.mDesc}>{m.desc}</Text>
              {music === m.id && (
                <View style={s.wave}>
                  {[3, 6, 10, 6, 3].map((h, i) => (
                    <View key={i} style={[s.waveBar, { height: h }]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={[s.sec, { marginTop: 22 }]}>Caption (Optional)</Text>
      <TextInput
        style={s.capInput}
        placeholder="Add a caption for your reel..."
        placeholderTextColor={T.sub}
        value={caption}
        onChangeText={setCaption}
        maxLength={80}
        multiline
      />

      {/* School watermark */}
      <View style={s.wmCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Ionicons name="school" size={16} color={T.accent} />
          <Text style={s.wmName}>Evergreen Preschool</Text>
          <View style={s.wmBadge}><Text style={s.wmBadgeTxt}>ALWAYS ON</Text></View>
        </View>
        <Text style={s.wmSub}>School name appears as watermark in every reel</Text>
      </View>

      {/* Summary */}
      <View style={s.summaryCard}>
        <Text style={{ fontSize: 26 }}>🎬</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.sumTitle}>{selected.length} photos · ~{selected.length * speed}s reel</Text>
          <Text style={s.sumSub}>
            {TRANSITIONS.find(t => t.id === transition)?.emoji} {transition}  ·
            {" "}{FILTERS.find(f => f.id === filter)?.emoji} {filter}  ·
            {" "}{MUSIC.find(m => m.id === music)?.emoji} {music}
          </Text>
        </View>
      </View>

      <View style={[s.navRow, { marginBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => setStep(2)} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={15} color={T.sub} />
          <Text style={s.backTxt}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.createBtn, { flex: 1 }]} onPress={handleGenerate} activeOpacity={0.85}>
          <Ionicons name="film" size={18} color="#fff" />
          <Text style={s.createTxt}>Create Reel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ── Generating ───────────────────────────────────────────────────────────────
  const loadingView = () => {
    const spin = spinVal.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
    return (
      <View style={s.center}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="film" size={54} color={T.accent} />
        </Animated.View>
        <Text style={[s.title, { marginTop: 22 }]}>Crafting your reel...</Text>
        <Text style={[s.sub, { textAlign: "center", marginTop: 8, paddingHorizontal: 40 }]}>
          Applying filters, transitions & school watermark{"\n"}Takes 30–60 seconds
        </Text>
        <View style={{ marginTop: 28, gap: 10, alignSelf: "stretch", paddingHorizontal: 40 }}>
          {["Downloading school photos", "Applying color filter", "Adding transitions", "Adding school watermark", "Uploading reel"].map((lbl, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="checkmark-circle" size={14} color={T.accent} />
              <Text style={s.sub}>{lbl}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ── Result ───────────────────────────────────────────────────────────────────
  const resultView = () => (
    <ScrollView contentContainerStyle={{ padding: 20, alignItems: "center", paddingBottom: 60 + insets.bottom }}>
      <Text style={{ fontSize: 64, marginTop: 12 }}>🎉</Text>
      <Text style={[s.title, { marginTop: 10, textAlign: "center" }]}>Your Reel is Ready!</Text>
      <Text style={[s.sub, { textAlign: "center", marginTop: 4 }]}>
        {selected.length} photos · {videoDur}s · Evergreen Preschool watermark
      </Text>

      <VideoView
        player={videoPlayer}
        style={{
          width: SW - 40,
          height: Math.min(Math.round((SW - 40) * 16 / 9), 520),
          borderRadius: 20,
          marginTop: 20,
          backgroundColor: "#000",
        }}
        contentFit="contain"
        nativeControls
      />

      <View style={{ flexDirection: "row", gap: 12, marginTop: 20, width: "100%" }}>
        <TouchableOpacity
          style={[s.resBtn, { backgroundColor: T.accent }]}
          onPress={() => Share.share({ message: `Watch our school reel! ${videoUrl}`, url: videoUrl }).catch(() => {})}
          activeOpacity={0.85}
        >
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={s.resBtnTxt}>Share Reel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.resBtn, { backgroundColor: T.card, borderWidth: 1, borderColor: T.border }]}
          onPress={() => Linking.openURL(videoUrl)}
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={20} color={T.text} />
          <Text style={[s.resBtnTxt, { color: T.text }]}>Download</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={{ marginTop: 28, flexDirection: "row", alignItems: "center", gap: 6 }}
        onPress={() => { setVideoUrl(""); setSelected([]); setCaption(""); setStep(1); }}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={17} color={T.sub} />
        <Text style={[s.sub, { fontSize: 14 }]}>Create Another Reel</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Root ─────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={s.topTitle}>
          {videoUrl ? "Your Reel" : generating ? "Creating..." : "Create Reel"}
        </Text>
        {!videoUrl && !generating ? (
          <View style={s.stepDots}>
            {[1, 2, 3].map(n => (
              <View key={n} style={[s.dot, step >= n && s.dotOn]} />
            ))}
          </View>
        ) : <View style={{ width: 60 }} />}
      </View>

      {/* Step label */}
      {!videoUrl && !generating && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
          <Text style={s.stepLabel}>
            {step === 1 ? "📸  Select Photos" : step === 2 ? "🎨  Choose Style" : "🎵  Finish & Create"}
          </Text>
        </View>
      )}

      {/* Content */}
      {generating   ? loadingView() :
       videoUrl     ? resultView()  :
       step === 1   ? step1         :
       step === 2   ? step2         : step3}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: T.bg },

  // Top bar
  topBar:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  topTitle:  { fontSize: 17, fontWeight: "800", color: T.text, flex: 1, textAlign: "center" },
  stepDots:  { flexDirection: "row", gap: 6, paddingRight: 4, width: 60, justifyContent: "flex-end" },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: T.border },
  dotOn:     { backgroundColor: T.accent, width: 20, borderRadius: 4 },
  stepLabel: { fontSize: 14, fontWeight: "700", color: T.text },

  center:    { flex: 1, alignItems: "center", justifyContent: "center" },
  title:     { fontSize: 20, fontWeight: "800", color: T.text },
  sub:       { fontSize: 13, color: T.sub, lineHeight: 20 },
  scroll:    { padding: 16, paddingBottom: 20 },
  sec:       { fontSize: 11, fontWeight: "700", color: T.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },

  // Photo library badge
  libBadge:  { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  libTxt:    { fontSize: 12, color: T.sub },

  // Photo cells
  cell:      { width: CELL, height: CELL, overflow: "hidden" },
  cellImg:   { width: "100%", height: "100%" },
  cellBorder:{ ...StyleSheet.absoluteFillObject, borderWidth: 3, borderColor: T.accent },
  cellDim:   { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  badge:     { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: T.accent, alignItems: "center", justifyContent: "center" },
  badgeNum:  { fontSize: 12, fontWeight: "900", color: "#fff" },

  // Sticky bottom (Step 1)
  stickyBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(15,15,15,0.96)", borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 16, paddingTop: 12 },
  stickyTxt: { fontSize: 13, color: T.sub, flex: 1 },

  // Transition tiles (2x2)
  tileRow:   { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile:      { width: (SW - 42) / 2, backgroundColor: T.card, borderRadius: 16, padding: 18, alignItems: "center", borderWidth: 1.5, borderColor: T.border },
  tileOn:    { borderColor: T.accent, backgroundColor: "rgba(23,143,120,0.12)" },
  tileEmoji: { fontSize: 28, marginBottom: 6 },
  tileTxt:   { fontSize: 13, fontWeight: "700", color: T.sub },

  // Speed pills
  pillRow:   { flexDirection: "row", gap: 10 },
  pill:      { backgroundColor: T.card, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: T.border },
  pillOn:    { borderColor: T.accent, backgroundColor: "rgba(23,143,120,0.12)" },
  pillEmoji: { fontSize: 22, marginBottom: 4 },
  pillLbl:   { fontSize: 13, fontWeight: "700", color: T.sub, marginBottom: 2 },
  pillSub:   { fontSize: 10, color: T.sub },

  // Filter chips
  fChip:     { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: T.card, borderWidth: 1.5, borderColor: T.border, alignItems: "center", minWidth: 74 },
  fChipOn:   { borderColor: T.accent, backgroundColor: "rgba(23,143,120,0.12)" },
  fEmoji:    { fontSize: 20, marginBottom: 4 },
  fTxt:      { fontSize: 12, fontWeight: "700", color: T.sub },

  // Music chips
  mChip:     { width: 96, backgroundColor: T.card, borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1.5, borderColor: T.border },
  mChipOn:   { borderColor: T.accent, backgroundColor: "rgba(23,143,120,0.12)" },
  mEmoji:    { fontSize: 28, marginBottom: 6 },
  mLbl:      { fontSize: 12, fontWeight: "700", color: T.sub, marginBottom: 2 },
  mDesc:     { fontSize: 10, color: T.sub },
  wave:      { flexDirection: "row", gap: 2, marginTop: 6, alignItems: "flex-end" },
  waveBar:   { width: 3, backgroundColor: T.accent, borderRadius: 2 },

  // Caption
  capInput:  { backgroundColor: T.card, borderRadius: 12, padding: 14, fontSize: 14, color: T.text, borderWidth: 1, borderColor: T.border, minHeight: 72, textAlignVertical: "top", marginBottom: 16 },

  // School watermark card
  wmCard:    { backgroundColor: "rgba(23,143,120,0.1)", borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(23,143,120,0.28)" },
  wmName:    { fontSize: 14, fontWeight: "800", color: T.text },
  wmBadge:   { backgroundColor: T.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  wmBadgeTxt:{ fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  wmSub:     { fontSize: 12, color: T.sub },

  // Summary card
  summaryCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: T.card, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: T.border },
  sumTitle:  { fontSize: 14, fontWeight: "700", color: T.text, marginBottom: 3 },
  sumSub:    { fontSize: 12, color: T.sub },

  // Nav buttons
  navRow:    { flexDirection: "row", gap: 12, marginTop: 16 },
  backBtn:   { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  backTxt:   { fontSize: 14, fontWeight: "600", color: T.sub },
  nextBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: T.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20 },
  nextTxt:   { fontSize: 15, fontWeight: "800", color: "#fff" },
  btnDim:    { opacity: 0.38 },
  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: T.accent, borderRadius: 14, paddingVertical: 14 },
  createTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },

  // Result
  resBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 14 },
  resBtnTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
