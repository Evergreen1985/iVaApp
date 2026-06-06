import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { getBirthdays, getBirthdaysMonth } from "../../../src/lib/api";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function TeacherBirthdays() {
  const { t } = useTranslation();
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [mode, setMode]       = useState<"month" | "all">("month"); // default: this month

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      // Default to the current month; "All" shows the next year's upcoming birthdays.
      const res = mode === "month" ? await getBirthdaysMonth() : await getBirthdays(365);
      setData(Array.isArray(res) ? res : []);
    } catch { setData([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [mode]);

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = MONTHS[new Date().getMonth()];

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
    >
      <Text style={s.pageTitle}>{mode === "month" ? `🎂 ${thisMonth} Birthdays` : "🎂 All Upcoming Birthdays"}</Text>
      <View style={s.toggleRow}>
        <TouchableOpacity style={[s.toggle, mode === "month" && s.toggleActive]} onPress={() => setMode("month")}>
          <Text style={[s.toggleTxt, mode === "month" && s.toggleTxtActive]}>This Month</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.toggle, mode === "all" && s.toggleActive]} onPress={() => setMode("all")}>
          <Text style={[s.toggleTxt, mode === "all" && s.toggleTxtActive]}>All Upcoming</Text>
        </TouchableOpacity>
      </View>

      {data.length === 0
        ? (
          <View style={s.emptyBox}>
            <Ionicons name="gift-outline" size={48} color={COLORS.mid} />
            <Text style={s.emptyTxt}>{t("noBirthdays")}</Text>
          </View>
        )
        : data.map((item, i) => {
            const isToday = item.dob?.slice(5) === today.slice(5);
            return (
              <View key={i} style={[s.card, isToday && s.cardToday]}>
                <View style={[s.avatar, isToday && s.avatarToday]}>
                  <Text style={s.avatarTxt}>
                    {(item.name || item.childName || "?")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={s.childName}>{item.name || item.childName}</Text>
                  <Text style={s.section}>{item.section || item.program || ""}</Text>
                  {isToday
                    ? <Text style={s.todayBadge}>{t("today")} 🎉</Text>
                    : <Text style={s.daysAway}>
                        {item.daysUntil != null ? `${item.daysUntil} ${t("daysAway")}` : ""}
                      </Text>
                  }
                </View>
                {item.age != null && (
                  <View style={s.ageBubble}>
                    <Text style={s.ageTxt}>{t("turnsAge")} {item.age}</Text>
                  </View>
                )}
              </View>
            );
          })
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.bg },
  content:    { padding: 20, paddingBottom: 50 },
  center:     { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:  { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 14 },
  toggleRow:  { flexDirection: "row", gap: 8, marginBottom: 20 },
  toggle:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border },
  toggleActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleTxt:  { fontSize: 13, fontWeight: "700", color: COLORS.mid },
  toggleTxtActive: { color: "#fff" },
  emptyBox:   { alignItems: "center", marginTop: 60, gap: 12 },
  emptyTxt:   { fontSize: 15, color: COLORS.mid },
  card:       { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardToday:  { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" },
  avatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarToday:{ backgroundColor: "#F59E0B" },
  avatarTxt:  { fontSize: 20, fontWeight: "800", color: "#fff" },
  childName:  { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  section:    { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  todayBadge: { fontSize: 13, fontWeight: "700", color: "#D97706", marginTop: 4 },
  daysAway:   { fontSize: 12, color: COLORS.mid, marginTop: 4 },
  ageBubble:  { backgroundColor: "#EEF3FF", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  ageTxt:     { fontSize: 11, fontWeight: "700", color: COLORS.primary, textAlign: "center" },
});
