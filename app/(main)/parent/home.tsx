import { useEffect, useState, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Animated, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Audio } from "expo-av";
import { COLORS } from "../../../src/lib/constants";
import { supabase } from "../../../src/lib/supabase";
import { getParentDashboard, getAudioOverviews } from "../../../src/lib/api";
import { registerPushToken } from "../../../src/lib/notifications";
import { useSession } from "../../../src/store/session";
import { useRealtime } from "../../../src/lib/realtime";

const ALL_ACTIVITIES = [
  { label: "Homework",    icon: "book-outline",            route: "/(main)/parent/homework",  color: COLORS.edu },
  { label: "Fees",        icon: "card-outline",            route: "/(main)/parent/fees",      color: COLORS.orange },
  { label: "Calendar",    icon: "calendar-outline",        route: "/(main)/parent/calendar",  color: COLORS.primary },
  { label: "Photos",      icon: "images-outline",          route: "/(main)/parent/photos",    color: "#0891B2" },
  { label: "Documents",   icon: "document-text-outline",   route: "/(main)/parent/documents", color: "#7C3AED" },
  { label: "Medical",     icon: "medkit-outline",          route: "/(main)/parent/medical",   color: COLORS.error },
  { label: "Pickup Auth", icon: "car-outline",             route: "/(main)/parent/pickup",    color: COLORS.dark },
  { label: "Transport",   icon: "bus-outline",             route: "/(main)/parent/transport", color: "#059669" },
  { label: "Kit",         icon: "bag-outline",             route: "/(main)/parent/kit",       color: COLORS.orange },
  { label: "Incidents",   icon: "warning-outline",         route: "/(main)/parent/incidents", color: COLORS.error },
  { label: "Referrals",   icon: "gift-outline",            route: "/(main)/parent/referrals", color: "#0891B2" },
  { label: "AI Tools",    icon: "sparkles-outline",        route: "/(main)/parent/ai",        color: "#7C3AED" },
  { label: "Profile",     icon: "person-outline",          route: "/(main)/parent/profile",   color: COLORS.mid },
];

export default function ParentHome() {
  const router = useRouter();
  const { t, i18n } = useTranslation();          // i18n here is reactive
  const { session, clearSession, setActiveChild } = useSession();
  const token = session?.token || "";
  const lang  = i18n.language || "en";

  const [data, setData]           = useState<any>(null);
  const [audios, setAudios]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refresh, setRefresh]     = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Ref so cleanup/logout always holds the live sound, never stale null
  const soundRef    = useRef<Audio.Sound | null>(null);
  const loadingRef  = useRef(false);   // prevents concurrent createAsync on rapid taps
  const mountedLang = useRef(lang);    // skip re-fetch on first render of lang effect

  // Community bubble
  const [liveCaption, setLiveCaption] = useState<{ sender: string; text: string } | null>(null);
  const bubbleBob   = useRef(new Animated.Value(0)).current;
  const bubblePulse = useRef(new Animated.Value(1)).current;
  const bubbleSubRef = useRef<any>(null);

  const stopSound = async () => {
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }
    setPlayingId(null);
  };

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const dashRes = session?.phone ? await getParentDashboard(session.phone) : null;
      const audioRes = await getAudioOverviews(token, lang);
      if (dashRes && !dashRes.error) setData(dashRes);
      const raw = Array.isArray(audioRes) ? audioRes : (audioRes?.overviews ?? audioRes?.audioOverviews ?? []);
      setAudios(raw.filter((a: any) => a.status === "ready" || !a.status));
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  // On mount: full load + push token; cleanup stops audio on unmount
  useEffect(() => {
    load();
    if (session?.phone) registerPushToken(session.phone);
    return () => { stopSound(); };
  }, []);

  // Real-time sync: reload whenever admin/teacher changes these tables
  useRealtime("announcements", () => load());
  useRealtime("homework",      () => load());
  useRealtime("attendance",    () => load());

  // When language changes after mount: stop audio + re-fetch in new language
  useEffect(() => {
    if (lang === mountedLang.current) return;   // skip first render
    mountedLang.current = lang;
    stopSound();
    getAudioOverviews(token, lang)
      .then(audioRes => {
        const raw = Array.isArray(audioRes) ? audioRes : (audioRes?.overviews ?? audioRes?.audioOverviews ?? []);
        setAudios(raw.filter((a: any) => a.status === "ready" || !a.status));
      })
      .catch(() => {});
  }, [lang]);

  // Community bubble: continuous bob animation
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleBob, { toValue: -10, duration: 900, useNativeDriver: true }),
        Animated.timing(bubbleBob, { toValue: 0,   duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Community bubble: fetch latest message + subscribe for live captions
  useEffect(() => {
    supabase
      .from("community_messages")
      .select("display_name, content")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setLiveCaption({ sender: data[0].display_name, text: data[0].content });
      });

    const sub = supabase
      .channel("home-bubble")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "community_messages",
      }, ({ new: msg }) => {
        const m = msg as any;
        if (m.content) {
          setLiveCaption({ sender: m.display_name, text: m.content });
          Animated.sequence([
            Animated.timing(bubblePulse, { toValue: 1.18, duration: 140, useNativeDriver: true }),
            Animated.timing(bubblePulse, { toValue: 1,    duration: 140, useNativeDriver: true }),
          ]).start();
        }
      })
      .subscribe();
    bubbleSubRef.current = sub;

    return () => {
      if (bubbleSubRef.current) { supabase.removeChannel(bubbleSubRef.current); bubbleSubRef.current = null; }
    };
  }, []);

  const handlePlay = async (item: any) => {
    if (loadingRef.current) return;             // ignore rapid taps while loading
    loadingRef.current = true;
    try {
      const wasPlaying = playingId === item.id;
      await stopSound();
      if (wasPlaying) return;                   // tap same card = pause/stop

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: item.audio_url || item.url || item.audioUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingId(item.id);
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          soundRef.current = null;
          setPlayingId(null);
        }
      });
    } catch { Alert.alert("Error", "Could not play this audio."); }
    finally { loadingRef.current = false; }
  };

  const handleLogout = async () => {
    await stopSound();
    await clearSession();
    router.replace("/(auth)/login");
  };

  // Dashboard returns "enquiries" (one row per child). Map to a unified shape.
  const rawChildren: any[] = data?.enquiries || data?.children || session?.children || [];
  const children: any[] = rawChildren.map((c: any) => ({
    ...c,
    name:      c.child_name  || c.name  || "?",
    class:     c.program_label || c.section_name || c.class || c.section || "—",
    photo_url: c.photo_url   || null,
  }));
  const announcements: any[] = data?.announcements || [];
  const activeChild = children[selectedIdx] || children[0] || null;

  // Sync active child to global store so all screens share it
  useEffect(() => {
    if (activeChild) setActiveChild(activeChild);
  }, [activeChild?.section_id, activeChild?.name]);

  const activeHomework: any[] = (data?.homework || []).filter(
    (h: any) => h.section_id && h.section_id === activeChild?.section_id
  );

  // ── Upcoming events (reuses calendarEvents the dashboard already fetched) ──
  const nowDate  = new Date();
  const ymd = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const todayStr = ymd(nowDate);
  const tomStr   = ymd(new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 1));

  const upcomingEvents: any[] = (data?.calendarEvents || [])
    .filter((e: any) => (e.event_date || "").slice(0, 10) >= todayStr)
    .slice(0, 4);

  const EVENT_META: Record<string, { icon: string; color: string }> = {
    holiday:  { icon: "sunny-outline",         color: COLORS.yellow },
    festival: { icon: "sparkles-outline",      color: COLORS.secondary },
    activity: { icon: "color-palette-outline", color: COLORS.edu },
    exam:     { icon: "create-outline",        color: COLORS.error },
    ptm:      { icon: "people-outline",        color: COLORS.primary },
    sports:   { icon: "football-outline",      color: COLORS.success },
  };
  const eventMeta = (type: string) =>
    EVENT_META[type] || { icon: "calendar-outline", color: COLORS.mid };

  const eventDateLabel = (dateStr: string) => {
    const d = (dateStr || "").slice(0, 10);
    if (d === todayStr) return "Today";
    if (d === tomStr)   return "Tomorrow";
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={s.root} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.greeting}>Hello 👋</Text>
        <View style={s.headerRight}>
          {children.map((child: any, i: number) => {
            const active = selectedIdx === i;
            return (
              <TouchableOpacity key={i} onPress={() => setSelectedIdx(i)} activeOpacity={0.8}
                style={[s.hdrAvtWrap, active && s.hdrAvtWrapActive]}>
                {child.photo_url ? (
                  <Image source={{ uri: child.photo_url }} style={s.hdrAvt} />
                ) : (
                  <View style={[s.hdrAvtFallback, active && s.hdrAvtFallbackActive]}>
                    <Text style={[s.hdrAvtTxt, active && s.hdrAvtTxtActive]}>
                      {(child.name || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.mid} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Active child card ── */}
      {activeChild && (
        <View style={[s.activeChildCard, { marginBottom: 20 }]}>
          {activeChild.photo_url ? (
            <Image source={{ uri: activeChild.photo_url }} style={s.activeChildPhoto} />
          ) : (
            <View style={s.activeChildAvt}>
              <Text style={s.activeChildAvtTxt}>{(activeChild.name || "?")[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.activeChildName}>{activeChild.name}</Text>
            <Text style={s.activeChildClass}>{activeChild.class}</Text>
          </View>
          {activeChild.todayAttendance && (
            <View style={[s.badge, { backgroundColor: activeChild.todayAttendance === "present" ? COLORS.eduLight : "#FEE2E2" }]}>
              <Text style={[s.badgeTxt, { color: activeChild.todayAttendance === "present" ? COLORS.edu : COLORS.error }]}>
                {activeChild.todayAttendance === "present" ? t("present") : t("absent")}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Audio Overviews ── */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>{t("audioOverviews")}</Text>
          <View style={s.langBadge}><Text style={s.langBadgeTxt}>{lang.toUpperCase()}</Text></View>
        </View>
        {audios.length === 0 ? (
          <View style={s.audioEmpty}>
            <Ionicons name="headset-outline" size={32} color={COLORS.mid} />
            <Text style={s.audioEmptyTxt}>{t("noAudio")}</Text>
          </View>
        ) : audios.map((item, i) => {
          const isPlaying = playingId === item.id;
          return (
            <View key={item.id || i} style={[s.audioCard, isPlaying && s.audioCardActive]}>
              <TouchableOpacity style={[s.playCircle, isPlaying && s.playCircleActive]} onPress={() => handlePlay(item)}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={20} color={isPlaying ? "#fff" : COLORS.edu} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.audioTitle}>{item.title || `Overview ${i + 1}`}</Text>
                {item.description && <Text style={s.audioDesc} numberOfLines={1}>{item.description}</Text>}
                {item.duration && <Text style={s.audioDur}>{item.duration}</Text>}
              </View>
              {isPlaying && (
                <View style={s.waveContainer}>
                  {[1,2,3,4,3,2,1].map((h, wi) => (
                    <View key={wi} style={[s.wavebar, { height: h * 4 + 4 }]} />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ── AI Agent ── */}
      <TouchableOpacity style={s.agentCard} onPress={() => router.push("/(main)/parent/ask" as any)} activeOpacity={0.85}>
        <View style={s.agentIconBox}>
          <Ionicons name="sparkles" size={22} color="#7C3AED" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.agentTitle}>{t("askAgent") || "Ask iVa"}</Text>
          <Text style={s.agentDesc}>{t("agentDesc") || "Need help navigating? Ask me anything about fees, homework, events..."}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.mid} />
      </TouchableOpacity>

      {/* ── Homework preview ── */}
      {activeHomework.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { marginBottom: 8 }]}>Upcoming Homework</Text>
          {activeHomework.slice(0, 2).map((hw: any, i: number) => (
            <TouchableOpacity key={i} style={s.hwCard}
              onPress={() => router.push("/(main)/parent/homework" as any)} activeOpacity={0.8}>
              <View style={s.hwDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.hwSubject}>{hw.subject || hw.title || "Homework"}</Text>
                {(hw.description || hw.content) && (
                  <Text style={s.hwDesc} numberOfLines={1}>{hw.description || hw.content}</Text>
                )}
              </View>
              {hw.due_date && (
                <Text style={s.hwDue}>
                  {new Date(hw.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </Text>
              )}
            </TouchableOpacity>
          ))}
          {activeHomework.length > 2 && (
            <TouchableOpacity style={s.hwMore} onPress={() => router.push("/(main)/parent/homework" as any)}>
              <Text style={s.hwMoreTxt}>+{activeHomework.length - 2} more assignments →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Upcoming Events ── */}
      {upcomingEvents.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionRowBetween}>
            <Text style={s.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => router.push("/(main)/parent/calendar" as any)}>
              <Text style={s.viewAll}>View all →</Text>
            </TouchableOpacity>
          </View>
          {upcomingEvents.map((ev: any, i: number) => {
            const m = eventMeta(ev.event_type);
            return (
              <TouchableOpacity key={ev.id || i} style={s.evCard} activeOpacity={0.8}
                onPress={() => router.push("/(main)/parent/calendar" as any)}>
                <View style={[s.evIcon, { backgroundColor: m.color + "18" }]}>
                  <Ionicons name={m.icon as any} size={20} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.evTitle} numberOfLines={1}>{ev.title || "Event"}</Text>
                  {ev.event_type && <Text style={s.evType}>{String(ev.event_type).toUpperCase()}</Text>}
                </View>
                <View style={[s.evDateBadge, { backgroundColor: m.color + "12" }]}>
                  <Text style={[s.evDateTxt, { color: m.color }]}>{eventDateLabel(ev.event_date)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── All Activities ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          {children.length > 1 && activeChild ? `${activeChild.name}'s Activities` : (t("allActivities") || "All Activities")}
        </Text>
        <View style={s.actGrid}>
          {ALL_ACTIVITIES.map((act) => (
            <TouchableOpacity key={act.route} style={s.actCard} activeOpacity={0.75}
              onPress={() => router.push(act.route as any)}>
              <View style={[s.actIcon, { backgroundColor: act.color + "18" }]}>
                <Ionicons name={act.icon as any} size={22} color={act.color} />
              </View>
              <Text style={s.actLabel}>{act.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Announcements ── */}
      {announcements.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("announcements")}</Text>
          {announcements.map((ann: any, i: number) => (
            <View key={i} style={s.annCard}>
              <View style={s.annDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.annTitle}>{ann.title || ann.message}</Text>
                {ann.date && <Text style={s.annDate}>{new Date(ann.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>

    {/* ── Dancing Community Bubble ── */}
    <Animated.View
      style={[s.commBubbleWrap, { transform: [{ translateY: bubbleBob }, { scale: bubblePulse }] }]}
      pointerEvents="box-none"
    >
      {liveCaption && (
        <View style={s.captionBox}>
          <Text style={s.captionSender} numberOfLines={1}>{liveCaption.sender}</Text>
          <Text style={s.captionText} numberOfLines={2}>{liveCaption.text}</Text>
        </View>
      )}
      <TouchableOpacity
        style={s.commBtn}
        onPress={() => router.push("/(main)/parent/community" as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="people" size={26} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: COLORS.bg },
  content:        { padding: 20, paddingBottom: 50 },
  center:         { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  greeting:       { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  headerRight:    { flexDirection: "row", alignItems: "center", gap: 8 },
  hdrAvtWrap:     { borderRadius: 24, borderWidth: 2, borderColor: "transparent" },
  hdrAvtWrapActive:{ borderColor: COLORS.edu },
  hdrAvt:         { width: 44, height: 44, borderRadius: 22 },
  hdrAvtFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EBEBEB", alignItems: "center", justifyContent: "center" },
  hdrAvtFallbackActive: { backgroundColor: COLORS.edu },
  hdrAvtTxt:      { fontSize: 16, fontWeight: "700", color: COLORS.mid },
  hdrAvtTxtActive:{ color: "#fff" },
  logoutBtn:      { padding: 8 },
  section:        { marginBottom: 24 },
  sectionRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle:   { fontSize: 13, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8 },
  langBadge:      { backgroundColor: COLORS.edu, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  langBadgeTxt:   { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 1 },

  // Audio
  audioEmpty:     { alignItems: "center", gap: 8, paddingVertical: 24, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  audioEmptyTxt:  { fontSize: 13, color: COLORS.mid },
  audioCard:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  audioCardActive:{ borderColor: COLORS.edu, borderWidth: 2 },
  playCircle:     { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.eduLight, alignItems: "center", justifyContent: "center" },
  playCircleActive:{ backgroundColor: COLORS.edu },
  audioTitle:     { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  audioDesc:      { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  audioDur:       { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  waveContainer:  { flexDirection: "row", alignItems: "center", gap: 2 },
  wavebar:        { width: 3, borderRadius: 2, backgroundColor: COLORS.edu },

  // Agent
  agentCard:      { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#7C3AED12", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#7C3AED30", marginBottom: 24 },
  agentIconBox:   { width: 48, height: 48, borderRadius: 16, backgroundColor: "#7C3AED18", alignItems: "center", justifyContent: "center" },
  agentTitle:     { fontSize: 15, fontWeight: "800", color: COLORS.dark },
  agentDesc:      { fontSize: 12, color: COLORS.mid, marginTop: 3, lineHeight: 18 },

  // Active child card
  activeChildCard:   { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: COLORS.edu },
  activeChildPhoto:  { width: 58, height: 58, borderRadius: 29, marginRight: 14 },
  activeChildAvt:    { width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.edu, alignItems: "center", justifyContent: "center", marginRight: 14 },
  activeChildAvtTxt: { fontSize: 24, fontWeight: "800", color: "#fff" },
  activeChildName:   { fontSize: 16, fontWeight: "800", color: COLORS.dark },
  activeChildClass:  { fontSize: 12, color: COLORS.mid, marginTop: 3 },
  badge:             { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt:          { fontSize: 11, fontWeight: "700" },

  // Homework preview
  hwCard:    { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, gap: 10 },
  hwDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.edu },
  hwSubject: { fontSize: 13, fontWeight: "700", color: COLORS.dark },
  hwDesc:    { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  hwDue:     { fontSize: 11, color: COLORS.orange, fontWeight: "700" },
  hwMore:    { alignItems: "center", paddingVertical: 4 },
  hwMoreTxt: { fontSize: 12, color: COLORS.edu, fontWeight: "600" },

  // Upcoming events
  sectionRowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  viewAll:     { fontSize: 12, color: COLORS.edu, fontWeight: "700" },
  evCard:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  evIcon:      { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  evTitle:     { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  evType:      { fontSize: 10, fontWeight: "700", color: COLORS.mid, letterSpacing: 0.6, marginTop: 2 },
  evDateBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  evDateTxt:   { fontSize: 11, fontWeight: "800" },

  // All Activities grid
  actGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actCard:        { width: "30%", backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  actIcon:        { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  actLabel:       { fontSize: 11, fontWeight: "600", color: COLORS.dark, textAlign: "center" },

  // Announcements
  annCard:        { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  annDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.edu, marginTop: 5, marginRight: 12 },
  annTitle:       { fontSize: 14, fontWeight: "600", color: COLORS.dark, lineHeight: 20 },
  annDate:        { fontSize: 11, color: COLORS.mid, marginTop: 3 },

  // Community dancing bubble
  commBubbleWrap: { position: "absolute", right: 20, bottom: 22, alignItems: "flex-end" },
  captionBox:     { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 10, maxWidth: 200, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 },
  captionSender:  { fontSize: 11, fontWeight: "800", color: COLORS.edu, marginBottom: 2 },
  captionText:    { fontSize: 12, color: COLORS.dark, lineHeight: 17 },
  commBtn:        { width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.edu, alignItems: "center", justifyContent: "center", shadowColor: COLORS.edu, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
});
