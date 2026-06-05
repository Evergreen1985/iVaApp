import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { COLORS } from "../../../src/lib/constants";
import { supabase } from "../../../src/lib/supabase";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// Keep in sync with the parent Home "Upcoming Events" mapping
const EVENT_META: Record<string, { icon: string; color: string }> = {
  holiday:  { icon: "sunny-outline",         color: COLORS.yellow },
  festival: { icon: "sparkles-outline",      color: COLORS.secondary },
  activity: { icon: "color-palette-outline", color: COLORS.edu },
  exam:     { icon: "create-outline",        color: COLORS.error },
  ptm:      { icon: "people-outline",        color: COLORS.primary },
  sports:   { icon: "football-outline",      color: COLORS.success },
};
const meta = (type: string) => EVENT_META[type] || { icon: "calendar-outline", color: COLORS.mid };

// Parse "YYYY-MM-DD" without timezone surprises → [year, monthIndex, day] or null
const parseYMD = (s: string): [number, number, number] | null => {
  const m = (s || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? [+m[1], +m[2] - 1, +m[3]] : null;
};

export default function ParentCalendar() {
  const params = useLocalSearchParams<{ date?: string }>();
  const now    = new Date();

  // Initial view: the date passed from Home (if any), else today
  const initial = parseYMD(typeof params.date === "string" ? params.date : "")
    || [now.getFullYear(), now.getMonth(), now.getDate()];

  const [year, setYear]         = useState(initial[0]);
  const [month, setMonth]       = useState(initial[1]);
  const [selected, setSelected] = useState<number | null>(initial[2]);
  const [events, setEvents]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  // When Home navigates here with a (new) date, jump to that month + highlight it
  useEffect(() => {
    const d = parseYMD(typeof params.date === "string" ? params.date : "");
    if (d) { setYear(d[0]); setMonth(d[1]); setSelected(d[2]); }
  }, [params.date]);

  const load = async () => {
    setLoading(true);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const start   = `${monthKey}-01`;
    const end     = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
    const { data } = await supabase
      .from("calendar_events")
      .select("id,event_date,event_type,title,description")
      .gte("event_date", start)
      .lte("event_date", end)
      .order("event_date");
    setEvents(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [year, month]);

  const navigate = (dir: number) => {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(null);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();

  const eventsByDay: Record<number, any[]> = {};
  events.forEach((e: any) => {
    const d = parseYMD(e.event_date);
    if (d && d[0] === year && d[1] === month) {
      (eventsByDay[d[2]] ??= []).push(e);
    }
  });

  const selectedEvents = selected ? (eventsByDay[selected] || []) : [];

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.pageTitle}>School Calendar</Text>

      {/* Month navigator */}
      <View style={s.monthNav}>
        <TouchableOpacity onPress={() => navigate(-1)} style={s.navBtn}>
          <Ionicons name="chevron-back" size={20} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={() => navigate(1)} style={s.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.dark} />
        </TouchableOpacity>
      </View>

      {/* Calendar grid */}
      <View style={s.calCard}>
        <View style={s.dayRow}>
          {DAYS.map((d) => (
            <Text key={d} style={s.dayHdr}>{d}</Text>
          ))}
        </View>

        <View style={s.grid}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <View key={`e${i}`} style={s.cell} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day     = i + 1;
            const dayEvts = eventsByDay[day];
            const hasEv   = !!dayEvts;
            const isSel   = selected === day;
            const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
            const dotColor = hasEv ? meta(dayEvts[0].event_type).color : COLORS.edu;
            return (
              <TouchableOpacity
                key={day}
                style={[s.cell, isSel && s.cellSelected, isToday && !isSel && s.cellToday]}
                onPress={() => setSelected(isSel ? null : day)}
              >
                <Text style={[s.cellTxt, isSel && s.cellTxtSel, isToday && !isSel && s.cellTxtToday]}>
                  {day}
                </Text>
                {hasEv && <View style={[s.dot, { backgroundColor: isSel ? "#fff" : dotColor }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading && <ActivityIndicator color={COLORS.edu} style={{ marginTop: 20 }} />}

      {/* Events for selected day */}
      {!loading && selected && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{selected} {MONTHS[month]}</Text>
          {selectedEvents.length === 0 ? (
            <Text style={s.noEvent}>No events on this day</Text>
          ) : (
            selectedEvents.map((ev: any, i: number) => {
              const m = meta(ev.event_type);
              return (
                <View key={ev.id || i} style={s.evCard}>
                  <View style={[s.evIcon, { backgroundColor: m.color + "18" }]}>
                    <Ionicons name={m.icon as any} size={18} color={m.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.evTitle}>{ev.title || ev.name}</Text>
                    {ev.event_type && <Text style={[s.evType, { color: m.color }]}>{String(ev.event_type).toUpperCase()}</Text>}
                    {ev.description && <Text style={s.evDesc}>{ev.description}</Text>}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* All events this month */}
      {!loading && events.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>This Month</Text>
          {events.map((ev: any, i: number) => {
            const d = parseYMD(ev.event_date);
            const m = meta(ev.event_type);
            return (
              <TouchableOpacity key={ev.id || i} style={s.evCard} activeOpacity={0.7}
                onPress={() => d && setSelected(d[2])}>
                <View style={s.evDateBox}>
                  <Text style={s.evDay}>{d ? d[2] : "—"}</Text>
                  <Text style={s.evMon}>{d ? MONTHS[d[1]].slice(0, 3) : ""}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.evTitle}>{ev.title || ev.name}</Text>
                  {ev.event_type && <Text style={[s.evType, { color: m.color }]}>{String(ev.event_type).toUpperCase()}</Text>}
                  {ev.description && <Text style={s.evDesc}>{ev.description}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {!loading && events.length === 0 && (
        <View style={s.emptyCard}>
          <Ionicons name="calendar-outline" size={36} color={COLORS.mid} />
          <Text style={s.noEvent}>No events this month</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 20, paddingBottom: 40 },
  pageTitle:   { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 20 },
  monthNav:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  navBtn:      { padding: 8, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  monthLabel:  { fontSize: 16, fontWeight: "700", color: COLORS.dark },
  calCard:     { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  dayRow:      { flexDirection: "row", marginBottom: 8 },
  dayHdr:      { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: COLORS.mid },
  grid:        { flexDirection: "row", flexWrap: "wrap" },
  cell:        { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  cellSelected:{ backgroundColor: COLORS.edu, borderRadius: 100 },
  cellToday:   { borderWidth: 1.5, borderColor: COLORS.edu, borderRadius: 100 },
  cellTxt:     { fontSize: 13, fontWeight: "500", color: COLORS.dark },
  cellTxtSel:  { color: "#fff", fontWeight: "700" },
  cellTxtToday:{ color: COLORS.edu, fontWeight: "700" },
  dot:         { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.edu, marginTop: 1 },
  section:     { marginBottom: 24 },
  sectionTitle:{ fontSize: 13, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  noEvent:     { fontSize: 13, color: COLORS.mid },
  evCard:      { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  evIcon:      { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  evDateBox:   { backgroundColor: COLORS.eduLight, borderRadius: 10, width: 44, alignItems: "center", padding: 6 },
  evDay:       { fontSize: 18, fontWeight: "800", color: COLORS.edu },
  evMon:       { fontSize: 10, fontWeight: "600", color: COLORS.edu },
  evTitle:     { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  evType:      { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, marginTop: 2 },
  evDesc:      { fontSize: 12, color: COLORS.mid, marginTop: 3 },
  emptyCard:   { alignItems: "center", gap: 8, padding: 32, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
});
