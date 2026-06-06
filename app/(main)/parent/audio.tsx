import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { COLORS } from "../../../src/lib/constants";
import { getAudioOverviews } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";
import i18n from "../../../src/i18n";

export default function ParentAudio() {
  const { t } = useTranslation();
  const { session } = useSession();
  const token = session?.token || "";
  const [overviews, setOverviews] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refresh, setRefresh]     = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const player = useAudioPlayer(undefined);
  const status = useAudioPlayerStatus(player);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAudioOverviews(token, i18n.language);
      const data = Array.isArray(res) ? res : (res?.overviews ?? res?.audioOverviews ?? []);
      setOverviews(data.filter((a: any) => a.status === "ready" || !a.status));
    } catch { setOverviews([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => {
    load();
    return () => { try { player.remove(); } catch {} };
  }, []);

  // Clear the "now playing" highlight when a clip finishes
  useEffect(() => { if (status?.didJustFinish) setPlayingId(null); }, [status?.didJustFinish]);

  const handlePlay = async (item: any) => {
    try {
      if (playingId === item.id) { player.pause(); setPlayingId(null); return; }
      await setAudioModeAsync({ playsInSilentMode: true });
      player.replace({ uri: item.audio_url || item.url || item.audioUrl });
      player.play();
      setPlayingId(item.id);
    } catch {
      Alert.alert("Error", "Could not play this audio.");
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}
    >
      <Text style={s.pageTitle}>{t("audioOverviews")}</Text>

      {overviews.length === 0
        ? (
          <View style={s.emptyBox}>
            <Ionicons name="headset-outline" size={48} color={COLORS.mid} />
            <Text style={s.emptyTxt}>{t("noAudio")}</Text>
          </View>
        )
        : overviews.map((item, i) => {
            const isPlaying = playingId === item.id;
            return (
              <View key={item.id || i} style={s.card}>
                <View style={[s.iconBox, isPlaying && s.iconBoxActive]}>
                  <Ionicons name={isPlaying ? "pause" : "play"} size={22} color={isPlaying ? "#fff" : COLORS.edu} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={s.title}>{item.title || `Overview ${i + 1}`}</Text>
                  {item.description && <Text style={s.desc}>{item.description}</Text>}
                  {item.duration && <Text style={s.duration}>{item.duration}</Text>}
                </View>
                <TouchableOpacity
                  style={[s.playBtn, isPlaying && s.playBtnActive]}
                  onPress={() => handlePlay(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.playTxt, isPlaying && s.playTxtActive]}>
                    {isPlaying ? t("pause") : t("play")}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.bg },
  content:      { padding: 20, paddingBottom: 50 },
  center:       { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:    { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 20 },
  emptyBox:     { alignItems: "center", gap: 12, paddingTop: 50 },
  emptyTxt:     { fontSize: 14, color: COLORS.mid },
  card:         { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  iconBox:      { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EEF8F6", alignItems: "center", justifyContent: "center" },
  iconBoxActive:{ backgroundColor: COLORS.edu },
  title:        { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  desc:         { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  duration:     { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  playBtn:      { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: COLORS.edu },
  playBtnActive:{ backgroundColor: COLORS.edu },
  playTxt:      { fontSize: 13, fontWeight: "700", color: COLORS.edu },
  playTxtActive:{ color: "#fff" },
});
