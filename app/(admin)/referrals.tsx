import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAdminReferrals } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function AdminReferrals() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAdminReferrals(token);
      const data = res?.referrals ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#0891B2" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Referrals</Text>
        <Text style={s.count}>{list.length}</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor="#0891B2" />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="share-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No referrals yet</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.iconBox}><Ionicons name="gift" size={20} color="#0891B2" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.referrer_name || item.parentName || "Parent"}</Text>
              <Text style={s.meta}>Referred: {item.referred_name || item.referredChild || "—"}</Text>
              {item.reward && <Text style={s.reward}>Reward: {item.reward}</Text>}
              <Text style={s.date}>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : ""}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: item.status === "converted" ? COLORS.success + "22" : COLORS.orange + "22" }]}>
              <Text style={[s.badgeTxt, { color: item.status === "converted" ? COLORS.success : COLORS.orange }]}>
                {item.status || "pending"}
              </Text>
            </View>
          </View>
        ))}
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
  count:     { fontSize: 13, color: COLORS.mid, fontWeight: "600" },
  content:   { padding: 16, gap: 10 },
  empty:     { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:  { fontSize: 14, color: COLORS.mid },
  card:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  iconBox:   { width: 44, height: 44, borderRadius: 14, backgroundColor: "#0891B222", alignItems: "center", justifyContent: "center" },
  name:      { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  meta:      { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  reward:    { fontSize: 12, color: COLORS.orange, fontWeight: "600", marginTop: 2 },
  date:      { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  badge:     { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt:  { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
});
