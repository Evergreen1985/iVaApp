import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { getPTMSchedule } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";

export default function TeacherPTM() {
  const { session } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getPTMSchedule(session?.sectionId || "");
      setEvents(Array.isArray(res) ? res : res?.meetings || []);
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const now      = new Date();
  const upcoming = events.filter(e => new Date(e.scheduled_date || e.date) >= now);
  const past     = events.filter(e => new Date(e.scheduled_date || e.date) < now);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
    >
      <Text style={s.pageTitle}>📅 PTM Schedule</Text>
      <Text style={s.sub}>Parent–Teacher Meetings{session?.sectionId ? ` · ${session.sectionId}` : ""}</Text>

      {events.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="people-circle-outline" size={48} color={COLORS.mid} />
          <Text style={s.emptyTxt}>No PTM Scheduled</Text>
          <Text style={s.emptySubTxt}>
            PTM dates will appear here once the admin schedules them. Check back closer to the end of term.
          </Text>
        </View>
      ) : (
        <>
          {upcoming.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Upcoming</Text>
              {upcoming.map((event: any, i: number) => (
                <View key={event.id || i} style={[s.eventCard, { borderLeftColor: COLORS.primary }]}>
                  <View style={s.eventHeader}>
                    <Ionicons name="people-circle" size={22} color={COLORS.primary} />
                    <Text style={s.eventTitle}>{event.title || "Parent–Teacher Meeting"}</Text>
                    <View style={s.upcomingBadge}>
                      <Text style={s.upcomingTxt}>Upcoming</Text>
                    </View>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.mid} />
                    <Text style={s.metaTxt}>
                      {new Date(event.scheduled_date || event.date).toLocaleDateString("en-IN", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                      })}
                    </Text>
                  </View>
                  {event.time_slot && (
                    <View style={s.metaRow}>
                      <Ionicons name="time-outline" size={14} color={COLORS.mid} />
                      <Text style={s.metaTxt}>{event.time_slot}</Text>
                    </View>
                  )}
                  {event.venue && (
                    <View style={s.metaRow}>
                      <Ionicons name="location-outline" size={14} color={COLORS.mid} />
                      <Text style={s.metaTxt}>{event.venue}</Text>
                    </View>
                  )}
                  {event.notes && (
                    <View style={s.notesBox}>
                      <Text style={s.notesTxt}>{event.notes}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {past.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Past Meetings</Text>
              {past.map((event: any, i: number) => (
                <View key={event.id || i} style={[s.eventCard, s.pastCard]}>
                  <View style={s.eventHeader}>
                    <Ionicons name="people-circle-outline" size={20} color={COLORS.mid} />
                    <Text style={[s.eventTitle, { color: COLORS.mid }]}>{event.title || "Parent–Teacher Meeting"}</Text>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons name="calendar-outline" size={13} color={COLORS.mid} />
                    <Text style={s.metaTxt}>
                      {new Date(event.scheduled_date || event.date).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  content:       { padding: 20, paddingBottom: 40 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:     { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  sub:           { fontSize: 13, color: COLORS.mid, marginBottom: 20, marginTop: 2 },
  emptyCard:     { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 20 },
  emptyTxt:      { fontSize: 17, fontWeight: "800", color: COLORS.dark, marginTop: 12 },
  emptySubTxt:   { fontSize: 13, color: COLORS.mid, marginTop: 6, textAlign: "center", lineHeight: 20 },
  section:       { marginBottom: 24 },
  sectionTitle:  { fontSize: 12, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  eventCard:     { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4 },
  pastCard:      { borderLeftColor: COLORS.mid, opacity: 0.75 },
  eventHeader:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  eventTitle:    { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.dark },
  upcomingBadge: { backgroundColor: "#EEF3FF", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  upcomingTxt:   { fontSize: 10, fontWeight: "700", color: COLORS.primary },
  metaRow:       { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  metaTxt:       { fontSize: 13, color: COLORS.mid },
  notesBox:      { marginTop: 8, backgroundColor: COLORS.bg, borderRadius: 10, padding: 12 },
  notesTxt:      { fontSize: 13, color: COLORS.dark },
});
