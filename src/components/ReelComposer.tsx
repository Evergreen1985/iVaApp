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
import { COLORS, EDU_API } from "../lib/constants";
import { supabase } from "../lib/supabase";
import { useRealtime } from "../lib/realtime";

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
  err:    "#E8694A",
};

// ── One-tap style templates (mirror the web composer) ─────────────────────────
// Each preset just sets the granular controls below — no hidden behaviour.
const TEMPLATES = [
  { id: "weekly",   label: "Weekly Summary",  emoji: "🍂", transition: "fade",  speed: 3,   filter: "warm",    music: "calm",      td: 0.6  },
  { id: "sports",   label: "Sports / Activity", emoji: "⚡", transition: "slide", speed: 2,   filter: "vibrant", music: "energetic", td: 0.08 },
  { id: "showcase", label: "Project Showcase", emoji: "🎓", transition: "fade",  speed: 3,   filter: "natural", music: "calm",      td: 0.8  },
] as const;

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

// Stage → the ticker it lights up (matches the API's NDJSON stage names).
const STEPS = [
  { keys: ["start", "images"], label: "Analyzing images" },
  { keys: ["cards"],           label: "Building title cards" },
  { keys: ["transitions"],     label: "Splicing transitions" },
  { keys: ["music"],           label: "Synching background beats" },
  { keys: ["upload"],          label: "Publishing reel" },
];
const stageToStep = (stage: string) => STEPS.findIndex(s => s.keys.includes(stage));

// ── Photo cell ────────────────────────────────────────────────────────────────
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

/**
 * Shared Reel Composer — used by parent, teacher and admin native screens.
 *   sectionId  — scope the gallery to one section (teacher). Omit = whole school.
 */
export default function ReelComposer({ sectionId }: { sectionId?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep]             = useState<Step>(1);
  const [photos, setPhotos]         = useState<any[]>([]);
  const [photoLoad, setPhotoLoad]   = useState(true);
  const [selected, setSelected]     = useState<string[]>([]);   // ordered photo URLs
  const [transition, setTransition] = useState<TransId>("fade");
  const [speed, setSpeed]           = useState(2);
  const [filter, setFilter]         = useState<FilterId>("natural");
  const [music, setMusic]           = useState<MusicId>("upbeat");
  const [transDur, setTransDur]     = useState<number | null>(null); // set by templates
  const [tpl, setTpl]               = useState<string>("");
  const [caption, setCaption]       = useState("");
  const [introTitle, setIntro]      = useState("");
  const [midText, setMid]           = useState("");
  const [outroText, setOutro]       = useState("Evergreen Preschool");

  const [generating, setGenerating] = useState(false);
  const [stageIdx, setStageIdx]     = useState(-1);
  const [stageDetail, setDetail]    = useState("");
  const [videoUrl, setVideoUrl]     = useState("");
  const [videoDur, setVideoDur]     = useState(0);

  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // expo-video player (expo-av removed in SDK 56).
  const videoPlayer = useVideoPlayer(null, (p) => { p.loop = true; });
  useEffect(() => {
    if (videoUrl) { try { videoPlayer.replace({ uri: videoUrl }); videoPlayer.play(); } catch {} }
  }, [videoUrl]);

  const loadPhotos = async () => {
    setPhotoLoad(true);
    try {
      let q = supabase
        .from("section_photos")
        .select("id, photo_url, title, section_name, uploaded_at")
        .order("uploaded_at", { ascending: false })
        .limit(60);
      if (sectionId) q = q.eq("section_id", sectionId);
      const { data } = await q;
      setPhotos(data || []);
    } catch {}
    setPhotoLoad(false);
  };

  useEffect(() => { loadPhotos(); }, [sectionId]);
  useRealtime("section_photos", loadPhotos);

  const togglePhoto = useCallback((url: string) => {
    setSelected(prev => {
      if (prev.includes(url)) return prev.filter(u => u !== url);
      if (prev.length >= 20) { Alert.alert("Limit", "Maximum 20 photos per reel"); return prev; }
      return [...prev, url];
    });
  }, []);

  // Reorder selected timeline
  const moveSel = (i: number, dir: -1 | 1) => {
    setSelected(prev => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const sortByDate = () => {
    const order = new Map(photos.map((p, i) => [p.photo_url || p.url, i]));
    setSelected(prev => [...prev].sort((a, b) => (order.get(b) ?? 0) - (order.get(a) ?? 0)));
  };

  const applyTemplate = (t: typeof TEMPLATES[number]) => {
    setTpl(t.id);
    setTransition(t.transition as TransId);
    setSpeed(t.speed);
    setFilter(t.filter as FilterId);
    setMusic(t.music as MusicId);
    setTransDur(t.td);
  };

  // ── Generate with REAL streamed progress (XHR — RN fetch can't stream body) ──
  const handleGenerate = () => {
    if (selected.length < 2) { Alert.alert("Pick more", "Select at least 2 photos."); return; }
    setGenerating(true); setStageIdx(0); setDetail(""); setVideoUrl("");

    // Map selected URLs → photo IDs so the server resolves URLs itself (no SSRF).
    const idByUrl = new Map(photos.map(p => [p.photo_url || p.url, p.id]));
    const photoIds = selected.map(u => idByUrl.get(u)).filter(Boolean);

    const payload: any = {
      photoIds: photoIds.length === selected.length ? photoIds : undefined,
      photoUrls: selected,
      transition, durationPerPhoto: speed, filter, music,
      caption, introTitle, midText, outroText,
      schoolName: "Evergreen Preschool",
      stream: true,
    };
    if (transDur != null) payload.transitionDuration = transDur;

    let seen = -1;
    const handleText = (text: string) => {
      const lines = text.split("\n");
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        let evt: any;
        try { evt = JSON.parse(t); } catch { continue; }
        if (evt.stage === "done" && evt.videoUrl) {
          setVideoUrl(evt.videoUrl);
          setVideoDur(evt.duration || selected.length * speed);
          setStageIdx(STEPS.length);
        } else if (evt.stage === "error") {
          throw new Error(evt.error || "Generation failed");
        } else {
          const idx = stageToStep(evt.stage);
          if (idx > seen) { seen = idx; setStageIdx(idx); }
          setDetail(evt.stage === "images" && evt.n ? `${evt.i}/${evt.n}` : "");
        }
      }
    };

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `${EDU_API}/api/reels/generate`);
    xhr.setRequestHeader("Content-Type", "application/json");
    // onprogress fires as chunks arrive → real-time stage updates when available.
    xhr.onprogress = () => { try { handleText(xhr.responseText); } catch (e: any) { fail(e); } };
    xhr.onload = () => {
      try {
        handleText(xhr.responseText);
        // Fallback: non-streamed JSON {videoUrl}
        if (!videoUrl) {
          try { const j = JSON.parse(xhr.responseText); if (j.videoUrl) { setVideoUrl(j.videoUrl); setVideoDur(j.duration || 0); } } catch {}
        }
        setGenerating(false);
      } catch (e: any) { fail(e); }
    };
    xhr.onerror = () => fail(new Error("Network error. Check connection."));
    const fail = (e: any) => {
      setGenerating(false);
      Alert.alert("Could not create reel", e?.message || "Try with fewer photos or try again later");
    };
    xhr.send(JSON.stringify(payload));
  };

  useEffect(() => () => { try { xhrRef.current?.abort(); } catch {} }, []);

  // ── Step 1: photo grid + timeline ─────────────────────────────────────────────
  const step1 = (
    <View style={{ flex: 1 }}>
      <View style={s.libBadge}>
        <Ionicons name="lock-closed" size={12} color={T.accent} />
        <Text style={s.libTxt}>{sectionId ? "Section library" : "School library"} · {photos.length} photos</Text>
      </View>

      {selected.length > 1 && (
        <View>
          <View style={s.tlHead}>
            <Text style={s.tlTitle}>Timeline · reorder</Text>
            <TouchableOpacity onPress={sortByDate}><Text style={s.tlSort}>↕ Sort by date</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingBottom: 8 }}>
            {selected.map((url, i) => (
              <View key={url} style={s.tlItem}>
                <Image source={{ uri: url }} style={s.tlImg} />
                <View style={s.tlNum}><Text style={s.tlNumTxt}>{i + 1}</Text></View>
                <View style={s.tlArrows}>
                  <TouchableOpacity onPress={() => moveSel(i, -1)} disabled={i === 0} style={[s.tlArr, i === 0 && { opacity: 0.3 }]}>
                    <Ionicons name="chevron-back" size={14} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveSel(i, 1)} disabled={i === selected.length - 1} style={[s.tlArr, i === selected.length - 1 && { opacity: 0.3 }]}>
                    <Ionicons name="chevron-forward" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {photoLoad ? (
        <View style={s.center}><ActivityIndicator size="large" color={T.accent} /></View>
      ) : photos.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="images-outline" size={60} color={T.sub} />
          <Text style={[s.sub, { marginTop: 14, textAlign: "center", paddingHorizontal: 32 }]}>
            No photos yet{"\n"}Teachers upload class photos here
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

      <View style={[s.stickyBar, { paddingBottom: 10 + insets.bottom }]}>
        <Text style={s.stickyTxt} numberOfLines={1}>
          {selected.length === 0
            ? "Tap photos to select  ·  max 20"
            : `${selected.length} selected  ·  ~${selected.length * speed}s reel`}
        </Text>
        <TouchableOpacity
          style={[s.nextBtn, selected.length < 2 && s.btnDim]}
          onPress={() => selected.length >= 2 && setStep(2)}
          activeOpacity={0.85}
        >
          <Text style={s.nextTxt}>Next</Text>
          <Ionicons name="chevron-forward" size={15} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step 2: template + style ──────────────────────────────────────────────────
  const step2 = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>
      <Text style={s.sec}>Quick Template</Text>
      <View style={s.tileRow}>
        {TEMPLATES.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tile, tpl === t.id && s.tileOn]}
            onPress={() => applyTemplate(t)}
            activeOpacity={0.8}
          >
            <Text style={s.tileEmoji}>{t.emoji}</Text>
            <Text style={[s.tileTxt, tpl === t.id && { color: T.accent }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.hint}>Music is a generated background bed, not a licensed track.</Text>

      <Text style={[s.sec, { marginTop: 24 }]}>Transition Effect</Text>
      <View style={s.tileRow}>
        {TRANSITIONS.map(tr => (
          <TouchableOpacity
            key={tr.id}
            style={[s.tile, transition === tr.id && s.tileOn]}
            onPress={() => { setTransition(tr.id); setTpl(""); setTransDur(null); }}
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

  // ── Step 3: music + text cards ──────────────────────────────────────────────
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
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={[s.sec, { marginTop: 22 }]}>Text Cards</Text>
      <TextInput style={s.capInput} placeholder="Intro card title — e.g. UKG-A · Sports Day" placeholderTextColor={T.sub} value={introTitle} onChangeText={setIntro} maxLength={60} />
      <TextInput style={s.capInput} placeholder="Mid-video highlight — e.g. The Big Race! 🏃" placeholderTextColor={T.sub} value={midText} onChangeText={setMid} maxLength={60} />
      <TextInput style={s.capInput} placeholder="Outro / closing signature" placeholderTextColor={T.sub} value={outroText} onChangeText={setOutro} maxLength={60} />

      <Text style={[s.sec, { marginTop: 10 }]}>Per-photo Caption (Optional)</Text>
      <TextInput
        style={[s.capInput, { minHeight: 60 }]}
        placeholder="A caption shown on every photo..."
        placeholderTextColor={T.sub}
        value={caption}
        onChangeText={setCaption}
        maxLength={80}
        multiline
      />

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

  // ── Generating (real step tickers) ────────────────────────────────────────────
  const loadingView = () => (
    <View style={s.center}>
      <ActivityIndicator size="large" color={T.accent} />
      <Text style={[s.title, { marginTop: 22 }]}>Composing your reel…</Text>
      <Text style={[s.sub, { textAlign: "center", marginTop: 8, paddingHorizontal: 40 }]}>
        This usually takes 20–60 seconds
      </Text>
      <View style={{ marginTop: 28, gap: 12, alignSelf: "stretch", paddingHorizontal: 48 }}>
        {STEPS.map((st, i) => {
          const state = stageIdx > i ? "done" : stageIdx === i ? "active" : "pending";
          return (
            <View key={st.label} style={{ flexDirection: "row", alignItems: "center", gap: 10, opacity: state === "pending" ? 0.4 : 1 }}>
              {state === "done"
                ? <Ionicons name="checkmark-circle" size={16} color={T.accent} />
                : state === "active"
                ? <ActivityIndicator size="small" color={T.accent} />
                : <Ionicons name="ellipse-outline" size={16} color={T.sub} />}
              <Text style={[s.sub, state === "active" && { color: T.text, fontWeight: "700" }]}>
                {st.label}{state === "active" && stageDetail ? `  ${stageDetail}` : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  // ── Result ─────────────────────────────────────────────────────────────────────
  const resultView = () => (
    <ScrollView contentContainerStyle={{ padding: 20, alignItems: "center", paddingBottom: 60 + insets.bottom }}>
      <Text style={{ fontSize: 64, marginTop: 12 }}>🎉</Text>
      <Text style={[s.title, { marginTop: 10, textAlign: "center" }]}>Your Reel is Ready!</Text>
      <Text style={[s.sub, { textAlign: "center", marginTop: 4 }]}>
        {selected.length} photos · {videoDur}s · Evergreen Preschool
      </Text>

      <VideoView
        player={videoPlayer}
        style={{ width: SW - 40, height: Math.min(Math.round((SW - 40) * 16 / 9), 520), borderRadius: 20, marginTop: 20, backgroundColor: "#000" }}
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
          <Text style={s.resBtnTxt}>Share</Text>
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
        onPress={() => { setVideoUrl(""); setSelected([]); setCaption(""); setIntro(""); setMid(""); setStep(1); }}
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
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={s.topTitle}>
          {videoUrl ? "Your Reel" : generating ? "Creating..." : "Smart Reel Composer"}
        </Text>
        {!videoUrl && !generating ? (
          <View style={s.stepDots}>
            {[1, 2, 3].map(n => <View key={n} style={[s.dot, step >= n && s.dotOn]} />)}
          </View>
        ) : <View style={{ width: 60 }} />}
      </View>

      {!videoUrl && !generating && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
          <Text style={s.stepLabel}>
            {step === 1 ? "📸  Select & Order" : step === 2 ? "🎨  Style & Template" : "🎵  Text & Create"}
          </Text>
        </View>
      )}

      {generating ? loadingView() :
       videoUrl   ? resultView()  :
       step === 1 ? step1         :
       step === 2 ? step2         : step3}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: T.bg },
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
  hint:      { fontSize: 11, color: T.sub, marginTop: 8 },

  libBadge:  { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  libTxt:    { fontSize: 12, color: T.sub },

  // Timeline strip
  tlHead:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  tlTitle:   { fontSize: 11, fontWeight: "700", color: T.sub, textTransform: "uppercase", letterSpacing: 1 },
  tlSort:    { fontSize: 12, color: T.accent, fontWeight: "700" },
  tlItem:    { width: 64, height: 88, borderRadius: 10, overflow: "hidden", backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  tlImg:     { width: "100%", height: 60 },
  tlNum:     { position: "absolute", top: 3, left: 3, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  tlNumTxt:  { fontSize: 11, fontWeight: "800", color: "#fff" },
  tlArrows:  { flexDirection: "row", height: 28, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  tlArr:     { padding: 2 },

  cell:      { width: CELL, height: CELL, overflow: "hidden" },
  cellImg:   { width: "100%", height: "100%" },
  cellBorder:{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 3, borderColor: T.accent },
  cellDim:   { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" },
  badge:     { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: T.accent, alignItems: "center", justifyContent: "center" },
  badgeNum:  { fontSize: 12, fontWeight: "900", color: "#fff" },

  stickyBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(15,15,15,0.96)", borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 16, paddingTop: 12 },
  stickyTxt: { fontSize: 13, color: T.sub, flex: 1 },

  tileRow:   { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile:      { width: (SW - 42) / 2, backgroundColor: T.card, borderRadius: 16, padding: 18, alignItems: "center", borderWidth: 1.5, borderColor: T.border },
  tileOn:    { borderColor: T.accent, backgroundColor: "rgba(23,143,120,0.12)" },
  tileEmoji: { fontSize: 28, marginBottom: 6 },
  tileTxt:   { fontSize: 13, fontWeight: "700", color: T.sub, textAlign: "center" },

  pillRow:   { flexDirection: "row", gap: 10 },
  pill:      { backgroundColor: T.card, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: T.border },
  pillOn:    { borderColor: T.accent, backgroundColor: "rgba(23,143,120,0.12)" },
  pillEmoji: { fontSize: 22, marginBottom: 4 },
  pillLbl:   { fontSize: 13, fontWeight: "700", color: T.sub, marginBottom: 2 },
  pillSub:   { fontSize: 10, color: T.sub },

  fChip:     { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: T.card, borderWidth: 1.5, borderColor: T.border, alignItems: "center", minWidth: 74 },
  fChipOn:   { borderColor: T.accent, backgroundColor: "rgba(23,143,120,0.12)" },
  fEmoji:    { fontSize: 20, marginBottom: 4 },
  fTxt:      { fontSize: 12, fontWeight: "700", color: T.sub },

  mChip:     { width: 96, backgroundColor: T.card, borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1.5, borderColor: T.border },
  mChipOn:   { borderColor: T.accent, backgroundColor: "rgba(23,143,120,0.12)" },
  mEmoji:    { fontSize: 28, marginBottom: 6 },
  mLbl:      { fontSize: 12, fontWeight: "700", color: T.sub, marginBottom: 2 },
  mDesc:     { fontSize: 10, color: T.sub },

  capInput:  { backgroundColor: T.card, borderRadius: 12, padding: 14, fontSize: 14, color: T.text, borderWidth: 1, borderColor: T.border, marginBottom: 10 },

  summaryCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: T.card, borderRadius: 14, padding: 16, marginTop: 10, marginBottom: 20, borderWidth: 1, borderColor: T.border },
  sumTitle:  { fontSize: 14, fontWeight: "700", color: T.text, marginBottom: 3 },
  sumSub:    { fontSize: 12, color: T.sub },

  navRow:    { flexDirection: "row", gap: 12, marginTop: 16 },
  backBtn:   { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  backTxt:   { fontSize: 14, fontWeight: "600", color: T.sub },
  nextBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: T.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20 },
  nextTxt:   { fontSize: 15, fontWeight: "800", color: "#fff" },
  btnDim:    { opacity: 0.38 },
  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: T.accent, borderRadius: 14, paddingVertical: 14 },
  createTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },

  resBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 14 },
  resBtnTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
