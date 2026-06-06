import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { supabase } from "../../../src/lib/supabase";
import { useSession } from "../../../src/store/session";
import { useRealtime } from "../../../src/lib/realtime";
import TeacherSectionPicker from "../../../src/components/TeacherSectionPicker";

export default function TeacherHome() {
  const router = useRouter();
  const { session, clearSession } = useSession();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const sid = session?.sectionId;
      if (!sid) { setLoading(false); setRefresh(false); return; }
      const todayDate = new Date().toISOString().split("T")[0];
      // attendance has no section_id — it's keyed by student_id. Resolve the
      // section's children first, then count attendance by those student ids.
      const { data: kids, count: totalStudents } = await supabase
        .from("enquiries").select("id", { count: "exact" }).eq("section_id", sid);
      const childIds = (kids || []).map((k: any) => k.id);
      const attCount = (status: string) =>
        childIds.length
          ? supabase.from("attendance").select("id", { count: "exact", head: true })
              .in("student_id", childIds).eq("date", todayDate).eq("status", status)
          : Promise.resolve({ count: 0 } as any);
      const [
        { count: presentToday },
        { count: absentToday },
        { count: homeworkDue },
        { data: notices },
      ] = await Promise.all([
        attCount("present"),
        attCount("absent"),
        supabase.from("homework").select("id", { count: "exact", head: true }).eq("section_id", sid).gte("due_date", todayDate),
        supabase.from("announcements").select("title,message").or("target.eq.all,target.eq.teachers").order("created_at", { ascending: false }).limit(5),
      ]);
      setData({
        totalStudents: totalStudents ?? 0,
        presentToday:  presentToday  ?? 0,
        absentToday:   absentToday   ?? 0,
        homeworkDue:   homeworkDue   ?? 0,
        sectionName:   session?.sectionName,
        notices:       notices || [],
      });
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [session?.sectionId]);
  useRealtime("attendance", () => load());
  useRealtime("homework",   () => load());
  useRealtime("enquiries",  () => load());

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
        await clearSession();
        router.replace("/(auth)/login");
      }},
    ]);
  };

  const todayStr = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const stats = [
    { label: "Total Students", value: data?.totalStudents ?? "—", icon: "people",         color: COLORS.primary },
    { label: "Present Today",  value: data?.presentToday  ?? "—", icon: "checkmark-circle", color: COLORS.success },
    { label: "Absent Today",   value: data?.absentToday   ?? "—", icon: "close-circle",    color: COLORS.error },
    { label: "Homework Due",   value: data?.homeworkDue   ?? "—", icon: "book",            color: COLORS.orange },
  ];

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Good day 👋</Text>
          <Text style={s.name}>{session?.name || "Teacher"}</Text>
          <Text style={s.date}>{todayStr}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.mid} />
        </TouchableOpacity>
      </View>

      {/* Section info */}
      {(session?.sectionName || data?.sectionName) && (
        <View style={s.sectionCard}>
          <Ionicons name="school" size={22} color={COLORS.primary} />
          <View style={{ marginLeft: 12 }}>
            <Text style={s.sectionLabel}>Active Section</Text>
            <Text style={s.sectionName}>{session?.sectionName || data?.sectionName}</Text>
          </View>
        </View>
      )}

      {/* Section switcher (parity with web — pick any section) */}
      <TeacherSectionPicker />

      {/* Stats */}
      <Text style={s.sectionTitle}>Today's Overview</Text>
      <View style={s.statsGrid}>
        {stats.map((st) => (
          <View key={st.label} style={s.statCard}>
            <Ionicons name={st.icon as any} size={22} color={st.color} />
            <Text style={s.statVal}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <Text style={[s.sectionTitle, { marginTop: 8 }]}>Quick Actions</Text>
      <View style={s.actionsGrid}>
        {[
          { label: "Mark Attendance", icon: "checkmark-circle-outline", tab: "attendance" },
          { label: "View Students",   icon: "people-outline",           tab: "students" },
          { label: "Homework",        icon: "book-outline",             tab: "homework" },
          { label: "Community",       icon: "chatbubbles-outline",      tab: "community" },
          { label: "Training",        icon: "school-outline",           tab: "training" },
        ].map((item) => (
          <TouchableOpacity
            key={item.tab}
            style={s.actionBtn}
            onPress={() => router.push(`/(main)/teacher/${item.tab}` as any)}
          >
            <Ionicons name={item.icon as any} size={26} color={COLORS.primary} />
            <Text style={s.actionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notices */}
      {data?.notices?.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={s.sectionTitle}>Notices</Text>
          {data.notices.map((n: any, i: number) => (
            <View key={i} style={s.noticeCard}>
              <View style={s.noticeDot} />
              <Text style={s.noticeTxt}>{n.message || n.title}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 20, paddingBottom: 40 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting:    { fontSize: 13, color: COLORS.mid },
  name:        { fontSize: 20, fontWeight: "800", color: COLORS.dark },
  date:        { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  logoutBtn:   { padding: 8 },
  sectionCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  sectionLabel:{ fontSize: 11, color: COLORS.mid, fontWeight: "600" },
  sectionName: { fontSize: 16, fontWeight: "700", color: COLORS.dark },
  sectionTitle:{ fontSize: 13, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  statsGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  statCard:    { flex: 1, minWidth: "44%", backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  statVal:     { fontSize: 26, fontWeight: "900", color: COLORS.dark, marginVertical: 4 },
  statLabel:   { fontSize: 11, color: COLORS.mid, fontWeight: "600", textAlign: "center" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  actionBtn:   { flex: 1, minWidth: "44%", backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  actionLabel: { fontSize: 13, fontWeight: "600", color: COLORS.dark, marginTop: 6, textAlign: "center" },
  noticeCard:  { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  noticeDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 12 },
  noticeTxt:   { fontSize: 14, color: COLORS.dark, flex: 1, lineHeight: 20 },
});
