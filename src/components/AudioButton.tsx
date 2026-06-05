import { useEffect, useRef, useState } from "react";
import {
  View, TouchableOpacity, Text, ActivityIndicator, StyleSheet, Alert, PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useTranslation } from "react-i18next";
import { COLORS } from "../lib/constants";
import { getItemAudio } from "../lib/api";

const fmt = (ms: number) => {
  if (!ms || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * "Listen" → fetches/generates audio in the parent's language, then shows a mini
 * player with a progress bar, time, and a draggable seek (tap or drag to repeat a part).
 * Pure JS (PanResponder + expo-av) so it works without a native rebuild.
 */
export default function AudioButton({
  sourceType = "custom", sourceId = "", title, content = "", keepEnglish, directUrl, onStart,
}: {
  sourceType?: string;
  sourceId?: string;
  title: string;
  content?: string;
  keepEnglish?: string | null;
  directUrl?: string | null;   // play this URL directly (already-generated audio) — skip generation
  onStart?: () => void;        // fired when playback begins (e.g. to mark "seen")
}) {
  const { i18n } = useTranslation();
  const [state, setState]     = useState<"idle" | "loading" | "active">("idle");
  const [isPlaying, setPlay]  = useState(false);
  const [pos, setPos]         = useState(0);
  const [dur, setDur]         = useState(0);

  const soundRef   = useRef<Audio.Sound | null>(null);
  const mountedRef = useRef(true);
  const durRef     = useRef(0);     // live duration for gesture handlers (avoids stale closure)
  const trackW     = useRef(0);     // measured seek-track width
  const seekingRef = useRef(false); // pause position updates while dragging

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (soundRef.current) { soundRef.current.unloadAsync().catch(() => {}); soundRef.current = null; }
    };
  }, []);

  const onStatus = (st: any) => {
    if (!st?.isLoaded) return;
    if (st.durationMillis) { durRef.current = st.durationMillis; setDur(st.durationMillis); }
    if (!seekingRef.current) setPos(st.positionMillis || 0);
    setPlay(!!st.isPlaying);
    if (st.didJustFinish) { setPlay(false); setPos(0); soundRef.current?.setPositionAsync(0).catch(() => {}); }
  };

  const fracFromX = (x: number) => Math.max(0, Math.min(1, x / (trackW.current || 1)));

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => { seekingRef.current = true; setPos(fracFromX(e.nativeEvent.locationX) * durRef.current); },
    onPanResponderMove:  (e) => { setPos(fracFromX(e.nativeEvent.locationX) * durRef.current); },
    onPanResponderRelease: async (e) => {
      const ms = fracFromX(e.nativeEvent.locationX) * durRef.current;
      try { await soundRef.current?.setPositionAsync(ms); } catch {}
      setPos(ms); seekingRef.current = false;
    },
    onPanResponderTerminate: () => { seekingRef.current = false; },
  })).current;

  const loadAndPlay = async () => {
    setState("loading");
    try {
      let url = directUrl || "";
      if (!url) {
        // on-demand: generate (or fetch cached) in the parent's language
        const lang = (i18n.language || "en").split(/[-_]/)[0];
        let res = await getItemAudio({ sourceType, sourceId, title, content, language: lang, keepEnglish: keepEnglish || undefined });
        let tries = 0;
        while (res?.status === "generating" && tries < 20 && mountedRef.current) {
          await new Promise((r) => setTimeout(r, 3000));
          res = await getItemAudio({ sourceType, sourceId, title, content, language: lang, keepEnglish: keepEnglish || undefined });
          tries++;
        }
        if (res?.status === "ready" && res.audio_url) url = res.audio_url;
      }
      if (!mountedRef.current) return;
      if (url) {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, progressUpdateIntervalMillis: 250 },
          onStatus,
        );
        if (!mountedRef.current) { sound.unloadAsync().catch(() => {}); return; }
        soundRef.current = sound;
        setState("active");
        onStart?.();
      } else {
        setState("idle");
        Alert.alert("Audio unavailable", "Couldn't prepare this audio right now. Please try again in a moment.");
      }
    } catch {
      if (mountedRef.current) {
        setState("idle");
        Alert.alert("Audio unavailable", "Couldn't prepare this audio right now. Please try again in a moment.");
      }
    }
  };

  const togglePlay = async () => {
    const s = soundRef.current; if (!s) return;
    if (isPlaying) { await s.pauseAsync(); }
    else { if (durRef.current && pos >= durRef.current - 250) await s.setPositionAsync(0); await s.playAsync(); }
  };

  const close = async () => {
    if (soundRef.current) { try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch {} soundRef.current = null; }
    if (mountedRef.current) { setState("idle"); setPlay(false); setPos(0); setDur(0); }
  };

  // ── idle / loading: the Listen pill ──
  if (state !== "active") {
    return (
      <TouchableOpacity style={s.btn} onPress={loadAndPlay} activeOpacity={0.8} disabled={state === "loading"}
        accessibilityLabel={`Listen to ${title}`}>
        {state === "loading"
          ? <ActivityIndicator size="small" color={COLORS.edu} />
          : <Ionicons name="volume-high-outline" size={15} color={COLORS.edu} />}
        <Text style={s.txt}>{state === "loading" ? "Preparing…" : "Listen"}</Text>
      </TouchableOpacity>
    );
  }

  // ── active: mini player with draggable seek ──
  const pct = dur ? Math.min(100, (pos / dur) * 100) : 0;
  return (
    <View style={s.player}>
      <TouchableOpacity style={s.playBtn} onPress={togglePlay} activeOpacity={0.85}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={16} color="#fff" />
      </TouchableOpacity>

      <View style={s.trackWrap} onLayout={(e) => { trackW.current = e.nativeEvent.layout.width; }} {...pan.panHandlers}>
        <View style={s.track}><View style={[s.fill, { width: `${pct}%` }]} /></View>
        <View style={[s.thumb, { left: `${pct}%` }]} />
      </View>

      <Text style={s.time}>{fmt(pos)} / {fmt(dur)}</Text>
      <TouchableOpacity style={s.closeBtn} onPress={close} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={16} color={COLORS.mid} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.eduLight, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.edu + "33", alignSelf: "flex-start",
  },
  txt: { fontSize: 12, fontWeight: "700", color: COLORS.edu },

  player: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.eduLight, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.edu + "33",
  },
  playBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.edu, alignItems: "center", justifyContent: "center" },
  trackWrap: { flex: 1, height: 24, justifyContent: "center" },
  track: { height: 4, borderRadius: 2, backgroundColor: COLORS.edu + "33", overflow: "hidden" },
  fill: { height: 4, borderRadius: 2, backgroundColor: COLORS.edu },
  thumb: { position: "absolute", top: 6, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.edu, marginLeft: -6 },
  time: { fontSize: 10, color: COLORS.edu, fontWeight: "700", minWidth: 66, textAlign: "right" },
  closeBtn: { padding: 2 },
});
