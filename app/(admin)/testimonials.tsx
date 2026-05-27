import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getTestimonials, updateTestimonial } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function AdminTestimonials() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getTestimonials(token);
      const data = res?.testimonials ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleApprove = async (item: any) => {
    const newStatus = item.status === "approved" ? "pending" : "approved";
    await updateTestimonial(token, item.id, { status: newStatus });
    load(true);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Testimonials</Text>
        <Text style={s.count}>{list.length}</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="star-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No testimonials</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.parentName}>{item.parent_name || item.name || "Parent"}</Text>
                <Text style={s.childInfo}>{item.child_name || ""} {item.section || ""}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {[1,2,3,4,5].map(star => (
                  <Ionicons key={star} name={star <= (item.rating || 5) ? "star" : "star-outline"} size={14} color={COLORS.orange} />
                ))}
              </View>
            </View>
            <Text style={s.review}>{item.review || item.message}</Text>
            <View style={s.footer}>
              <Text style={s.date}>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : ""}</Text>
              <TouchableOpacity
                style={[s.approveBtn, item.status === "approved" && s.approveBtnActive]}
                onPress={() => toggleApprove(item)}
              >
                <Text style={[s.approveTxt, item.status === "approved" && { color: "#fff" }]}>
                  {item.status === "approved" ? "✓ Approved" : "Approve"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  center:        { flex: 1, alignItems: "center", justifyContent: "center" },
  header:        { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:          { marginRight: 12 },
  title:         { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  count:         { fontSize: 13, color: COLORS.mid, fontWeight: "600" },
  content:       { padding: 16, gap: 10 },
  empty:         { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:      { fontSize: 14, color: COLORS.mid },
  card:          { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardTop:       { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  parentName:    { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  childInfo:     { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  review:        { fontSize: 13, color: COLORS.dark, lineHeight: 20 },
  footer:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  date:          { fontSize: 11, color: COLORS.mid },
  approveBtn:    { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.edu },
  approveBtnActive: { backgroundColor: COLORS.edu },
  approveTxt:    { fontSize: 12, fontWeight: "700", color: COLORS.edu },
});
