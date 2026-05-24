import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { getCalendar } from "../../../src/lib/api";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function ParentCalendar() {
  const now   = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth());
  const [events, setEvents]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(now.getDate());

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const load = async () => {
    setLoading(true);
    const res = await getCalendar(monthKey);
    setEvents(res?.events || res || []);
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
    const d = new Date(e.date || e.eventDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      (eventsByDay[day] ??= []).push(e);
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
        {/* Day headers */}
        <View style={s.dayRow}>
          {DAYS.map((d) => (
            <Text key={d} style={s.dayHdr}>{d}</Text>
          ))}
        </View>

        {/* Cells */}
        <View style={s.grid}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <View key={`e${i}`} style={s.cell} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day   = i + 1;
            const hasEv = !!eventsByDay[day];
            const isSel = selected === day;
            const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
            return (
              <TouchableOpacity
                key={day}
                style={[s.cell, isSel && s.cellSelected, isToday && !isSel && s.cellToday]}
                onPress={() => setSelected(isSel ? null : day)}
              >
                <Text style={[s.cellTxt, isSel && s.cellTxtSel, isToday && !isSel && s.cellTxtToday]}>
                  {day}
                </Text>
                {hasEv && <View style={[s.dot, isSel && { backgroundColor: "#fff" }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Events for selected day */}
      {loading && <ActivityIndicator color={COLORS.edu} style={{ marginTop: 20 }} />}
      {!loading && selected && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{selected} {MONTHS[month]}</Text>
          {selectedEvents.length === 0 ? (
            <Text style={s.noEvent}>No events on this day</Text>
          ) : (
            selectedEvents.map((ev: any, i: number) => (
              <View key={i} style={s.evCard}>
                <View style={s.evDot} />
                <View>
                  <Text style={s.evTitle}>{ev.title || ev.name}</Text>
                  {ev.description && <Text style={s.evDesc}>{ev.description}</Text>}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* All events list */}
      {!loading && events.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>This Month</Text>
          {events.map((ev: any, i: number) => {
            const d = new Date(ev.date || ev.eventDate);
            return (
              <View key={i} style={s.evCard}>
                <View style={[s.evDateBox]}>
                  <Text style={s.evDay}>{d.getDate()}</Text>
                  <Text style={s.evMon}>{MONTHS[d.getMonth()].slice(0, 3)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.evTitle}>{ev.title || ev.name}</Text>
                  {ev.description && <Text style={s.evDesc}>{ev.description}</Text>}
                </View>
              </View>
            );
          })}
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
  evDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.edu, marginTop: 5 },
  evDateBox:   { backgroundColor: COLORS.eduLight, borderRadius: 10, width: 44, alignItems: "center", padding: 6 },
  evDay:       { fontSize: 18, fontWeight: "800", color: COLORS.edu },
  evMon:       { fontSize: 10, fontWeight: "600", color: COLORS.edu },
  evTitle:     { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  evDesc:      { fontSize: 12, color: COLORS.mid, marginTop: 3 },
});
