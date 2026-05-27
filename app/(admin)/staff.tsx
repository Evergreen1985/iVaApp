import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getStaff, createStaff } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const ROLES = ["teacher","admin","driver","helper","coordinator"];
const COLORS_MAP = ["#EDE9FE","#DCFCE7","#FEF3C7","#FEE2E2","#DBEAFE"];

export default function AdminStaff() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName]       = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]       = useState("teacher");
  const [phone, setPhone]     = useState("");
  const [busy, setBusy]       = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getStaff(token);
      const data = res?.staff ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name || !username || !password) { Alert.alert("Fill all required fields"); return; }
    setBusy(true);
    await createStaff(token, { name, username, password, role, phone });
    setBusy(false);
    setShowForm(false); setName(""); setUsername(""); setPassword(""); setPhone("");
    load(true);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.dark} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={s.title}>Staff</Text>
        <Text style={s.count}>{list.length}</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.dark} />}
      >
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="people-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No staff added</Text></View>
        ) : list.map((item, i) => {
          const initials = (item.name || "S").split(" ").slice(0,2).map((w: string) => w[0]).join("").toUpperCase();
          return (
            <View key={item.id || i} style={s.card}>
              <View style={[s.avatar, { backgroundColor: COLORS_MAP[i % COLORS_MAP.length] }]}>
                <Text style={s.avatarTxt}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.meta}>{item.username} · {item.role || "staff"}</Text>
                {item.phone && <Text style={s.meta}>{item.phone}</Text>}
              </View>
              <View style={[s.roleBadge, { backgroundColor: COLORS.dark + "18" }]}>
                <Text style={[s.roleTxt]}>{item.role || "staff"}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>Add Staff Member</Text>
            <TextInput style={s.input} placeholder="Full Name *" placeholderTextColor={COLORS.mid} value={name} onChangeText={setName} />
            <TextInput style={s.input} placeholder="Username *" placeholderTextColor={COLORS.mid} autoCapitalize="none" value={username} onChangeText={setUsername} />
            <TextInput style={s.input} placeholder="Password *" placeholderTextColor={COLORS.mid} secureTextEntry value={password} onChangeText={setPassword} />
            <TextInput style={s.input} placeholder="Phone" placeholderTextColor={COLORS.mid} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <Text style={s.label}>Role</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {ROLES.map((r) => (
                <TouchableOpacity key={r} style={[s.roleBtn, role === r && s.roleBtnActive]} onPress={() => setRole(r)}>
                  <Text style={[s.roleBtnTxt, role === r && { color: "#fff" }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Add Staff</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  header:      { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:        { marginRight: 4 },
  title:       { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  count:       { fontSize: 13, color: COLORS.mid, fontWeight: "600" },
  addBtn:      { backgroundColor: COLORS.dark, borderRadius: 10, padding: 6 },
  content:     { padding: 16, gap: 10 },
  empty:       { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:    { fontSize: 14, color: COLORS.mid },
  card:        { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarTxt:   { fontSize: 15, fontWeight: "800", color: COLORS.dark },
  name:        { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  meta:        { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  roleBadge:   { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  roleTxt:     { fontSize: 11, fontWeight: "700", color: COLORS.dark, textTransform: "capitalize" },
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:       { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle:  { fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:       { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  label:       { fontSize: 12, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", marginBottom: 8 },
  roleBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  roleBtnActive:{ backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  roleBtnTxt:  { fontSize: 13, fontWeight: "600", color: COLORS.dark, textTransform: "capitalize" },
  saveBtn:     { backgroundColor: COLORS.dark, borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:     { color: "#fff", fontSize: 16, fontWeight: "700" },
});
