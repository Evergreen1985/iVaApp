import { useEffect, useRef, useState } from "react";
import {
  View, TouchableOpacity, Text, ActivityIndicator, StyleSheet, Alert, PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { useTranslation } from "react-i18next";
import { COLORS } from "../lib/constants";
import { getItemAudio } from "../lib/api";

// expo-audio reports time in SECONDS (expo-av used milliseconds).
const fmt = (sec: number) => {
  if (!sec || sec < 0) return "0:00";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * "Listen" → fetches/generates audio in the parent's language, then shows a mini
 * player with a progress bar, time, and a draggable seek (tap or drag to repeat a part).
 * Uses expo-audio (expo-av was removed in SDK 56).
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
  const player = useAudioPlayer(undefined, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  const [state, setState]   = useState<"idle" | "loading" | "active">("idle");
  const [dragPos, setDrag]  = useState<number | null>(null); // seconds, while dragging
  const mountedRef = useRef(true);
  const durRef     = useRef(0);     // live duration (seconds) for gesture handlers
  const trackW     = useRef(0);     // measured seek-track width
  const seekingRef = useRef(false); // ignore status position while dragging

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; try { player.remove(); } catch {} };
  }, []);

  if (status?.duration) durRef.current = status.duration;
  const dur     = durRef.current;
  const playing = !!status?.playing;
  const pos     = seekingRef.current && dragPos != null ? dragPos : (status?.currentTime || 0);

  // Reset to start when playback finishes
  useEffect(() => {
    if (status?.didJustFinish) { player.seekTo(0).catch(() => {}); player.pause(); }
  }, [status?.didJustFinish]);

  const fracFromX = (x: number) => Math.max(0, Math.min(1, x / (trackW.current || 1)));

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => { seekingRef.current = true; setDrag(fracFromX(e.nativeEvent.locationX) * durRef.current); },
    onPanResponderMove:  (e) => { setDrag(fracFromX(e.nativeEvent.locationX) * durRef.current); },
    onPanResponderRelease: async (e) => {
      const sec = fracFromX(e.nativeEvent.locationX) * durRef.current;
      try { await player.seekTo(sec); } catch {}
      setDrag(sec); seekingRef.current = false;
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
        await setAudioModeAsync({ playsInSilentMode: true });
        player.replace({ uri: url });
        player.play();
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

  const togglePlay = () => {
    if (playing) { player.pause(); }
    else { if (durRef.current && pos >= durRef.current - 0.25) player.seekTo(0).catch(() => {}); player.play(); }
  };

  const close = () => {
    try { player.pause(); player.seekTo(0).catch(() => {}); } catch {}
    setState("idle"); setDrag(null);
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
        <Ionicons name={playing ? "pause" : "play"} size={16} color="#fff" />
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
