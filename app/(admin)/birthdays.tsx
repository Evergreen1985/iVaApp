import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAdminBirthdays } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const BG = ["#EDE9FE","#DCFCE7","#FEF3C7","#FEE2E2","#DBEAFE"];

export default function AdminBirthdays() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAdminBirthdays(token);
      const data = res?.birthdays ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Upcoming Birthdays</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor="#7C3AED" />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="gift-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No upcoming birthdays</Text></View>
        ) : list.map((item, i) => {
          const dob = item.dob ? new Date(item.dob) : null;
          const today = new Date();
          const next = dob ? new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) : null;
          if (next && next < today) next?.setFullYear(today.getFullYear() + 1);
          const days = next ? Math.ceil((next.getTime() - today.getTime()) / 86400000) : null;
          return (
            <View key={item.id || i} style={s.card}>
              <View style={[s.avatar, { backgroundColor: BG[i % BG.length] }]}>
                <Text style={s.avatarTxt}>{(item.name || "?")[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.meta}>{item.section_name || item.sectionName || ""}</Text>
                {dob && <Text style={s.meta}>{dob.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}</Text>}
              </View>
              {days != null && (
                <View style={[s.daysBadge, days === 0 && { backgroundColor: "#FEF3C7" }]}>
                  <Text style={[s.daysTxt, days === 0 && { color: COLORS.orange }]}>
                    {days === 0 ? "🎂 Today!" : `${days}d`}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: COLORS.bg },
  center:    { flex: 1, alignItems: "center", justifyContent: "center" },
  header:    { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:      { marginRight: 12 },
  title:     { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  content:   { padding: 16, gap: 10 },
  empty:     { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:  { fontSize: 14, color: COLORS.mid },
  card:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  avatar:    { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 16, fontWeight: "800", color: COLORS.dark },
  name:      { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  meta:      { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  daysBadge: { backgroundColor: COLORS.eduLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  daysTxt:   { fontSize: 13, fontWeight: "800", color: COLORS.edu },
});
