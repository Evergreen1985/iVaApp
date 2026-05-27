import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, EDU_API } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";

export default function TeacherPTM() {
  const { session } = useSession();
  const [slots, setSlots]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [slotDate, setSlotDate]     = useState("");
  const [startTime, setStartTime]   = useState("");
  const [endTime, setEndTime]       = useState("");
  const [maxBook, setMaxBook]       = useState("1");
  const [notes, setNotes]           = useState("");

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await fetch(`${EDU_API}/api/ptm?type=all`);
      const data = await res.json();
      const all: any[] = Array.isArray(data) ? data : [];
      // Filter to this teacher's section only if sectionId set
      const filtered = session?.sectionId
        ? all.filter(s => !s.section_name || s.section_name === session.sectionId || s.section_name === session.name)
        : all;
      setSlots(filtered);
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!slotDate || !startTime || !endTime) {
      Alert.alert("Required", "Date, start time and end time are required."); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${EDU_API}/api/ptm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotDate,
          startTime,
          endTime,
          teacherName:  session?.name || "",
          sectionName:  session?.sectionId || "",
          maxBookings:  parseInt(maxBook, 10) || 1,
          notes:        notes.trim() || "",
        }),
      });
      const data = await res.json();
      if (data.error) { Alert.alert("Error", data.error); return; }
      Alert.alert("Created!", "PTM slot added.");
      setSlotDate(""); setStartTime(""); setEndTime(""); setMaxBook("1"); setNotes("");
      setShowForm(false);
      load();
    } catch {
      Alert.alert("Error", "Could not create slot. Check connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, isActive: boolean) => {
    try {
      await fetch(`${EDU_API}/api/ptm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      load();
    } catch {}
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const now      = new Date();
  const upcoming = slots.filter(e => new Date(e.slot_date || e.scheduled_date) >= now);
  const past     = slots.filter(e => new Date(e.slot_date || e.scheduled_date) < now);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={s.pageHeader}>
          <View>
            <Text style={s.pageTitle}>📅 PTM Schedule</Text>
            <Text style={s.pageSub}>Parent–Teacher Meetings</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(v => !v)}>
            <Ionicons name={showForm ? "close" : "add"} size={20} color="#fff" />
            <Text style={s.addBtnTxt}>{showForm ? "Cancel" : "Add Slot"}</Text>
          </TouchableOpacity>
        </View>

        {/* Create slot form */}
        {showForm && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>New PTM Slot</Text>

            <Text style={s.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 2026-06-15"
              placeholderTextColor={COLORS.mid}
              value={slotDate}
              onChangeText={setSlotDate}
              keyboardType="numbers-and-punctuation"
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Start Time</Text>
                <TextInput
                  style={s.input}
                  placeholder="09:00"
                  placeholderTextColor={COLORS.mid}
                  value={startTime}
                  onChangeText={setStartTime}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>End Time</Text>
                <TextInput
                  style={s.input}
                  placeholder="09:30"
                  placeholderTextColor={COLORS.mid}
                  value={endTime}
                  onChangeText={setEndTime}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <Text style={s.label}>Max Bookings per Slot</Text>
            <TextInput
              style={s.input}
              placeholder="1"
              placeholderTextColor={COLORS.mid}
              value={maxBook}
              onChangeText={setMaxBook}
              keyboardType="number-pad"
            />

            <Text style={s.label}>Notes (optional)</Text>
            <TextInput
              style={[s.input, { height: 70, textAlignVertical: "top" }]}
              placeholder="Venue, agenda, etc."
              placeholderTextColor={COLORS.mid}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitTxt}>Create Slot →</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Upcoming ({upcoming.length})</Text>
            {upcoming.map((ev: any, i: number) => (
              <View key={ev.id || i} style={s.eventCard}>
                <View style={s.eventTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.eventDate}>
                      {new Date(ev.slot_date || ev.scheduled_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" })}
                    </Text>
                    <Text style={s.eventTime}>
                      {ev.start_time} – {ev.end_time}
                      {ev.max_bookings && ` · max ${ev.max_bookings} bookings`}
                    </Text>
                  </View>
                  <View style={s.upcomingBadge}><Text style={s.upcomingTxt}>Upcoming</Text></View>
                </View>
                {ev.notes ? <Text style={s.eventNotes}>{ev.notes}</Text> : null}
                {ev.ptm_bookings?.length > 0 && (
                  <Text style={s.bookingCount}>{ev.ptm_bookings.length} booking{ev.ptm_bookings.length !== 1 ? "s" : ""}</Text>
                )}
                <TouchableOpacity style={s.deactBtn} onPress={() => handleDeactivate(ev.id, ev.is_active ?? true)}>
                  <Text style={s.deactTxt}>{ev.is_active !== false ? "Deactivate" : "Reactivate"}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Past */}
        {past.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Past ({past.length})</Text>
            {past.map((ev: any, i: number) => (
              <View key={ev.id || i} style={[s.eventCard, s.pastCard]}>
                <Text style={[s.eventDate, { color: COLORS.mid }]}>
                  {new Date(ev.slot_date || ev.scheduled_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
                <Text style={s.eventTime}>{ev.start_time} – {ev.end_time}</Text>
                {ev.ptm_bookings?.length > 0 && (
                  <Text style={s.bookingCount}>{ev.ptm_bookings.length} parent{ev.ptm_bookings.length !== 1 ? "s" : ""} attended</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {slots.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="people-circle-outline" size={48} color={COLORS.mid} />
            <Text style={s.emptyTxt}>No PTM Slots</Text>
            <Text style={s.emptySubTxt}>Tap "Add Slot" above to schedule a parent–teacher meeting.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  content:       { padding: 20, paddingBottom: 40 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  pageTitle:     { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  pageSub:       { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  addBtn:        { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnTxt:     { color: "#fff", fontWeight: "700", fontSize: 14 },

  formCard:      { backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 22, borderWidth: 1, borderColor: COLORS.border },
  formTitle:     { fontSize: 16, fontWeight: "800", color: COLORS.dark, marginBottom: 14 },
  label:         { fontSize: 12, fontWeight: "700", color: COLORS.mid, marginBottom: 4, marginTop: 2 },
  input:         { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  submitBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 4 },
  submitTxt:     { color: "#fff", fontSize: 15, fontWeight: "700" },

  section:       { marginBottom: 24 },
  sectionTitle:  { fontSize: 12, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  eventCard:     { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  pastCard:      { opacity: 0.7 },
  eventTop:      { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  eventDate:     { fontSize: 15, fontWeight: "700", color: COLORS.dark, marginBottom: 2 },
  eventTime:     { fontSize: 13, color: COLORS.mid },
  eventNotes:    { fontSize: 13, color: COLORS.dark, marginTop: 6, backgroundColor: COLORS.bg, borderRadius: 8, padding: 10 },
  bookingCount:  { fontSize: 12, color: COLORS.primary, fontWeight: "700", marginTop: 8 },
  deactBtn:      { marginTop: 10, alignSelf: "flex-start" },
  deactTxt:      { fontSize: 12, color: COLORS.error, fontWeight: "600" },
  upcomingBadge: { backgroundColor: "#EEF3FF", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  upcomingTxt:   { fontSize: 10, fontWeight: "700", color: COLORS.primary },

  emptyCard:     { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 20 },
  emptyTxt:      { fontSize: 17, fontWeight: "800", color: COLORS.dark, marginTop: 12 },
  emptySubTxt:   { fontSize: 13, color: COLORS.mid, marginTop: 6, textAlign: "center", lineHeight: 20 },
});
