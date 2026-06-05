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
import AudioButton from "../../../src/components/AudioButton";
import { useSeen } from "../../../src/store/seen";

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

// Deterministic uuid-shaped id from a string — cache key for the calendar digest
function hashToUuid(str: string): string {
  const h = [0x811c9dc5, 0x811c9dc5, 0x811c9dc5, 0x811c9dc5];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    for (let k = 0; k < 4; k++) { h[k] ^= c + i * (k + 1); h[k] = Math.imul(h[k], 16777619) >>> 0; }
  }
  const hex = h.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

export default function ParentHome() {
  const router = useRouter();
  const { t, i18n } = useTranslation();          // i18n here is reactive
  const { session, clearSession, setActiveChild } = useSession();
  const seen     = useSeen((st) => st.seen);
  const markSeen = useSeen((st) => st.markSeen);
  const loadSeen = useSeen((st) => st.load);
  const token = session?.token || "";
  const lang  = i18n.language || "en";

  const [data, setData]           = useState<any>(null);
  const [audios, setAudios]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refresh, setRefresh]     = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [audioExpanded, setAudioExpanded] = useState(false);
  const [audioLimit, setAudioLimit]       = useState(10);
  const [annExpanded, setAnnExpanded]     = useState(false);
  const [annLimit, setAnnLimit]           = useState(10);
  const [hwDoneIds, setHwDoneIds]         = useState<Record<string, boolean>>({});

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
    loadSeen();
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

  // Which homework this child has already marked done (for the pending count)
  useEffect(() => {
    const cid = activeChild?.id;
    if (!cid) { setHwDoneIds({}); return; }
    supabase.from("homework_status").select("homework_id").eq("enquiry_id", cid).eq("status", "done")
      .then(({ data: d }) => {
        const m: Record<string, boolean> = {};
        (d || []).forEach((r: any) => { m[r.homework_id] = true; });
        setHwDoneIds(m);
      });
  }, [activeChild?.id]);

  const activeHomework: any[] = (data?.homework || []).filter(
    (h: any) => h.section_id && h.section_id === activeChild?.section_id
  );
  const hwPending = activeHomework.filter((h: any) => !hwDoneIds[h.id]).length;

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

  // Audio overviews list: collapsed shows latest 2 — unless the most recent day has
  // more than 2 (then show all of that day). "View all" → 10, "Show more" → +10.
  const audioLatestDay      = audios[0] ? (audios[0].created_at || "").slice(0, 10) : "";
  const audioLatestDayCount = audios.filter((a: any) => (a.created_at || "").slice(0, 10) === audioLatestDay).length;
  const audioCollapsedCount = audioLatestDayCount > 2 ? audioLatestDayCount : 2;
  const visibleAudios       = audioExpanded ? audios.slice(0, audioLimit) : audios.slice(0, audioCollapsedCount);

  // Announcements: same pagination rule as audio overviews
  const annLatestDay        = announcements[0] ? (announcements[0].created_at || "").slice(0, 10) : "";
  const annLatestDayCount   = announcements.filter((a: any) => (a.created_at || "").slice(0, 10) === annLatestDay).length;
  const annCollapsedCount   = annLatestDayCount > 2 ? annLatestDayCount : 2;
  const visibleAnnouncements = annExpanded ? announcements.slice(0, annLimit) : announcements.slice(0, annCollapsedCount);

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

      {/* ── Active child (70%) + Ask iVa (30%) ── */}
      {activeChild && (
        <View style={s.heroRow}>
          <View style={[s.activeChildCard, s.heroChild]}>
            {activeChild.photo_url ? (
              <Image source={{ uri: activeChild.photo_url }} style={s.activeChildPhoto} />
            ) : (
              <View style={s.activeChildAvt}>
                <Text style={s.activeChildAvtTxt}>{(activeChild.name || "?")[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.activeChildName} numberOfLines={1}>{activeChild.name}</Text>
              <Text style={s.activeChildClass} numberOfLines={1}>{activeChild.class}</Text>
              {activeChild.todayAttendance && (
                <View style={[s.badge, { alignSelf: "flex-start", marginTop: 6, backgroundColor: activeChild.todayAttendance === "present" ? COLORS.eduLight : "#FEE2E2" }]}>
                  <Text style={[s.badgeTxt, { color: activeChild.todayAttendance === "present" ? COLORS.edu : COLORS.error }]}>
                    {activeChild.todayAttendance === "present" ? t("present") : t("absent")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity style={s.heroAgent} activeOpacity={0.85}
            onPress={() => router.push("/(main)/parent/ask" as any)}>
            <View style={s.heroAgentIcon}>
              <Ionicons name="sparkles" size={20} color="#7C3AED" />
            </View>
            <Text style={s.heroAgentTitle}>{t("askAgent") || "Ask iVa"}</Text>
            <Text style={s.heroAgentSub} numberOfLines={1}>Tap to ask</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Announcements (moved up · latest 2 / view all) ── */}
      {announcements.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { marginBottom: 12 }]}>{t("announcements")}</Text>
          {visibleAnnouncements.map((ann: any, i: number) => (
            <TouchableOpacity key={ann.id || i} style={[s.annCard, seen[ann.id] && s.seenCard]}
              activeOpacity={0.85} onPress={() => markSeen(ann.id)}>
              <View style={s.annDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.annTitle}>{ann.title || ann.message}</Text>
                {ann.body && <Text style={s.annBody} numberOfLines={4}>{ann.body}</Text>}
                {(ann.date || ann.created_at) && <Text style={s.annDate}>{new Date(ann.date || ann.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>}
                {ann.id && (
                  <View style={{ marginTop: 10 }}>
                    <AudioButton
                      sourceType="announcement"
                      sourceId={String(ann.id)}
                      title={ann.title || "Announcement"}
                      content={`${ann.title || ""}. ${ann.body || ann.message || ""}`.trim()}
                    />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
          {!annExpanded && announcements.length > annCollapsedCount && (
            <TouchableOpacity style={s.audioMore} onPress={() => { setAnnExpanded(true); setAnnLimit(10); }}>
              <Text style={s.audioMoreTxt}>View all ({announcements.length}) →</Text>
            </TouchableOpacity>
          )}
          {annExpanded && (
            <View style={s.audioMoreRow}>
              {annLimit < announcements.length && (
                <TouchableOpacity style={s.audioMore} onPress={() => setAnnLimit((n) => n + 10)}>
                  <Text style={s.audioMoreTxt}>Show more</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.audioMore} onPress={() => { setAnnExpanded(false); setAnnLimit(10); }}>
                <Text style={[s.audioMoreTxt, { color: COLORS.mid }]}>Show less</Text>
              </TouchableOpacity>
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
        ) : visibleAudios.map((item, i) => (
          <View key={item.id || i} style={[s.audioCard, s.audioCardCol, seen[item.id] && s.seenCard]}>
            <View style={{ marginBottom: 8 }}>
              <Text style={s.audioTitle}>{item.title || `Overview ${i + 1}`}</Text>
              {item.description && <Text style={s.audioDesc} numberOfLines={1}>{item.description}</Text>}
            </View>
            <AudioButton
              title={item.title || `Overview ${i + 1}`}
              directUrl={item.audio_url}
              onStart={() => markSeen(item.id)}
            />
          </View>
        ))}

        {/* View all / Show more controls */}
        {!audioExpanded && audios.length > audioCollapsedCount && (
          <TouchableOpacity style={s.audioMore} onPress={() => { setAudioExpanded(true); setAudioLimit(10); }}>
            <Text style={s.audioMoreTxt}>View all ({audios.length}) →</Text>
          </TouchableOpacity>
        )}
        {audioExpanded && (
          <View style={s.audioMoreRow}>
            {audioLimit < audios.length && (
              <TouchableOpacity style={s.audioMore} onPress={() => setAudioLimit((n) => n + 10)}>
                <Text style={s.audioMoreTxt}>Show more</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.audioMore} onPress={() => { setAudioExpanded(false); setAudioLimit(10); }}>
              <Text style={[s.audioMoreTxt, { color: COLORS.mid }]}>Show less</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Homework pending → Homework tab ── */}
      {activeHomework.length > 0 && (
        <TouchableOpacity style={s.hwPendingCard} activeOpacity={0.85}
          onPress={() => router.push("/(main)/parent/homework" as any)}>
          <View style={[s.hwPendingIcon, hwPending === 0 && { backgroundColor: COLORS.success + "18" }]}>
            <Ionicons name={hwPending === 0 ? "checkmark-done" : "book"} size={22} color={hwPending === 0 ? COLORS.success : COLORS.edu} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.hwPendingTitle}>
              {hwPending === 0 ? "Homework — all done 🎉" : `${hwPending} homework pending`}
            </Text>
            <Text style={s.hwPendingSub}>Tap to view, update status & ask doubts</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.mid} />
        </TouchableOpacity>
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
          <View style={{ marginBottom: 10 }}>
            <AudioButton
              sourceType="custom"
              sourceId={hashToUuid(upcomingEvents.map((e: any) => `${e.id || e.event_date}:${e.title}`).join("|"))}
              title="Upcoming Events"
              content={"Upcoming events at Evergreen Preschool. " + upcomingEvents.map((e: any) => `${e.title} on ${eventDateLabel(e.event_date)}.`).join(" ")}
            />
          </View>
          {upcomingEvents.map((ev: any, i: number) => {
            const m = eventMeta(ev.event_type);
            return (
              <TouchableOpacity key={ev.id || i} style={[s.evCard, seen[ev.id] && s.seenCard]} activeOpacity={0.8}
                onPress={() => { markSeen(ev.id); router.push({ pathname: "/(main)/parent/calendar", params: { date: (ev.event_date || "").slice(0, 10) } } as any); }}>
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
  audioCardCol:   { flexDirection: "column", alignItems: "stretch", gap: 0 },
  audioCardActive:{ borderColor: COLORS.edu, borderWidth: 2 },
  playCircle:     { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.eduLight, alignItems: "center", justifyContent: "center" },
  playCircleActive:{ backgroundColor: COLORS.edu },
  audioTitle:     { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  audioDesc:      { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  audioDur:       { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  waveContainer:  { flexDirection: "row", alignItems: "center", gap: 2 },
  wavebar:        { width: 3, borderRadius: 2, backgroundColor: COLORS.edu },
  audioMore:      { alignItems: "center", paddingVertical: 8, paddingHorizontal: 12 },
  audioMoreTxt:   { fontSize: 13, color: COLORS.edu, fontWeight: "700" },
  audioMoreRow:   { flexDirection: "row", justifyContent: "center", gap: 16 },

  // Hero row: active child (70%) + Ask iVa (30%)
  heroRow:        { flexDirection: "row", gap: 12, marginBottom: 20, alignItems: "stretch" },
  heroChild:      { flex: 0.7, marginBottom: 0 },
  heroAgent:      { flex: 0.3, backgroundColor: "#7C3AED12", borderRadius: 16, borderWidth: 1, borderColor: "#7C3AED30", alignItems: "center", justifyContent: "center", padding: 10, gap: 6 },
  heroAgentIcon:  { width: 40, height: 40, borderRadius: 13, backgroundColor: "#7C3AED18", alignItems: "center", justifyContent: "center" },
  heroAgentTitle: { fontSize: 12, fontWeight: "800", color: "#7C3AED", textAlign: "center" },
  heroAgentSub:   { fontSize: 10, color: "#7C3AED", opacity: 0.7, textAlign: "center" },

  // Already-viewed (seen) items are dimmed to a muted state
  seenCard:       { opacity: 0.5 },

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
  hwCardCol: { flexDirection: "column", alignItems: "stretch", gap: 0 },
  hwTopRow:  { flexDirection: "row", alignItems: "center", gap: 10 },
  hwDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.edu },
  hwSubject: { fontSize: 13, fontWeight: "700", color: COLORS.dark },
  hwDesc:    { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  hwDue:     { fontSize: 11, color: COLORS.orange, fontWeight: "700" },
  hwMore:    { alignItems: "center", paddingVertical: 4 },
  hwMoreTxt: { fontSize: 12, color: COLORS.edu, fontWeight: "600" },
  hwPendingCard:  { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 },
  hwPendingIcon:  { width: 46, height: 46, borderRadius: 14, backgroundColor: COLORS.eduLight, alignItems: "center", justifyContent: "center" },
  hwPendingTitle: { fontSize: 15, fontWeight: "800", color: COLORS.dark },
  hwPendingSub:   { fontSize: 12, color: COLORS.mid, marginTop: 3 },

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
  annBody:        { fontSize: 12, color: COLORS.mid, marginTop: 4, lineHeight: 18 },
  annDate:        { fontSize: 11, color: COLORS.mid, marginTop: 3 },

  // Community dancing bubble
  commBubbleWrap: { position: "absolute", right: 20, bottom: 22, alignItems: "flex-end" },
  captionBox:     { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 10, maxWidth: 200, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 },
  captionSender:  { fontSize: 11, fontWeight: "800", color: COLORS.edu, marginBottom: 2 },
  captionText:    { fontSize: 12, color: COLORS.dark, lineHeight: 17 },
  commBtn:        { width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.edu, alignItems: "center", justifyContent: "center", shadowColor: COLORS.edu, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
});
