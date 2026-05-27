import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getOwnerStaffAttendance, markStaffAttendance, createStaffLogin } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const STATUSES = ["present","absent","late","half_day","leave"];
const STATUS_COLOR: Record<string,string> = {
  present: COLORS.success, absent: COLORS.error, late: COLORS.orange,
  half_day: "#0891B2", leave: "#7C3AED",
};

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function OwnerStaff() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [date, setDate]       = useState(toISODate(new Date()));
  const [staff, setStaff]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getOwnerStaffAttendance(token, date);
      const data = res?.staff ?? res;
      setStaff(Array.isArray(data) ? data : []);
    } catch { setStaff([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [date]);

  const markStatus = async (member: any, status: string) => {
    await markStaffAttendance(token, { staffId: member.id, date, status });
    load(true);
  };

  const handleCreateLogin = async (member: any) => {
    Alert.alert("Create Login", `Create portal login for ${member.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Create", onPress: async () => {
        const res = await createStaffLogin(token, member.id);
        if (res?.password) Alert.alert("Login Created", `Username: ${res.username}\nPassword: ${res.password}`);
        else Alert.alert("Done", "Login created. Staff can reset password on first login.");
      }},
    ]);
  };

  const summary = STATUSES.reduce((acc, s) => {
    acc[s] = staff.filter(m => m.status === s).length;
    return acc;
  }, {} as Record<string,number>);

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate()-1); setDate(toISODate(d)); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate()+1); setDate(toISODate(d)); };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Staff Attendance</Text>
      </View>

      <View style={s.dateNav}>
        <TouchableOpacity onPress={prevDay} style={s.navBtn}><Ionicons name="chevron-back" size={20} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.dateTxt}>{new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" })}</Text>
        <TouchableOpacity onPress={nextDay} style={s.navBtn}><Ionicons name="chevron-forward" size={20} color={COLORS.dark} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.dark} />}>
        {loading ? <ActivityIndicator color={COLORS.dark} style={{ marginTop: 40 }} /> : <>
          <View style={s.summaryRow}>
            {STATUSES.map(st => (
              <View key={st} style={[s.sumCard, { borderColor: STATUS_COLOR[st] }]}>
                <Text style={[s.sumVal, { color: STATUS_COLOR[st] }]}>{summary[st]}</Text>
                <Text style={s.sumLabel}>{st.replace("_"," ")}</Text>
              </View>
            ))}
          </View>

          {staff.length === 0 ? (
            <View style={s.empty}><Ionicons name="people-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No staff records</Text></View>
          ) : staff.map((member, i) => {
            const status = member.status || "unmarked";
            const color  = STATUS_COLOR[status] || COLORS.mid;
            return (
              <View key={member.id || i} style={s.card}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>{(member.name || "S")[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{member.name}</Text>
                  <Text style={s.role}>{member.role || "Staff"}</Text>
                  {member.clock_in && <Text style={s.time}>In: {member.clock_in}</Text>}
                  {member.clock_out && <Text style={s.time}>Out: {member.clock_out}</Text>}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statusRow}>
                    {STATUSES.map(st => (
                      <TouchableOpacity key={st}
                        style={[s.stBtn, status === st && { backgroundColor: STATUS_COLOR[st], borderColor: STATUS_COLOR[st] }]}
                        onPress={() => markStatus(member, st)}>
                        <Text style={[s.stTxt, status === st && { color: "#fff" }]}>{st.replace("_"," ")}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <TouchableOpacity style={s.loginBtn} onPress={() => handleCreateLogin(member)}>
                  <Ionicons name="key-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            );
          })}
        </>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.bg },
  header:     { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:       { marginRight: 12 },
  title:      { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  dateNav:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  navBtn:     { padding: 8 },
  dateTxt:    { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  content:    { padding: 16, gap: 10, paddingBottom: 40 },
  summaryRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  sumCard:    { flex: 1, minWidth: "18%", backgroundColor: "#fff", borderRadius: 10, padding: 8, alignItems: "center", borderWidth: 2 },
  sumVal:     { fontSize: 16, fontWeight: "900" },
  sumLabel:   { fontSize: 9, color: COLORS.mid, marginTop: 1, textAlign: "center", textTransform: "capitalize" },
  empty:      { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:   { fontSize: 14, color: COLORS.mid },
  card:       { flexDirection: "row", gap: 10, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  avatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + "20", alignItems: "center", justifyContent: "center" },
  avatarTxt:  { fontSize: 16, fontWeight: "800", color: COLORS.primary },
  name:       { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  role:       { fontSize: 12, color: COLORS.mid, marginTop: 1 },
  time:       { fontSize: 11, color: COLORS.mid },
  statusRow:  { marginTop: 8, gap: 6 },
  stBtn:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  stTxt:      { fontSize: 10, fontWeight: "600", color: COLORS.dark, textTransform: "capitalize" },
  loginBtn:   { padding: 8, alignSelf: "flex-start" },
});
