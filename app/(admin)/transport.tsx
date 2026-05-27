import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAdminTransport, createRoute } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function AdminTransport() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [list, setList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rName, setRName]       = useState("");
  const [driver, setDriver]     = useState("");
  const [vehicle, setVehicle]   = useState("");
  const [stops, setStops]       = useState("");
  const [busy, setBusy]         = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getAdminTransport(token);
      const data = res?.routes ?? res;
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!rName) return;
    setBusy(true);
    await createRoute(token, { name: rName, driverName: driver, vehicleNumber: vehicle, stops: stops.split(",").map(s => s.trim()).filter(Boolean) });
    setBusy(false);
    setShowForm(false); setRName(""); setDriver(""); setVehicle(""); setStops("");
    load(true);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#059669" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Transport Routes</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor="#059669" />}>
        {list.length === 0 ? (
          <View style={s.empty}><Ionicons name="bus-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No routes configured</Text></View>
        ) : list.map((item, i) => (
          <View key={item.id || i} style={s.card}>
            <View style={s.iconBox}><Ionicons name="bus" size={22} color="#059669" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name || item.route_name}</Text>
              <Text style={s.meta}>Driver: {item.driver_name || item.driverName || "—"}</Text>
              <Text style={s.meta}>Vehicle: {item.vehicle_number || item.vehicleNumber || "—"}</Text>
              {item.student_count != null && <Text style={s.meta}>{item.student_count} students</Text>}
            </View>
          </View>
        ))}
      </ScrollView>
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>New Route</Text>
            <TextInput style={s.input} placeholder="Route Name *" placeholderTextColor={COLORS.mid} value={rName} onChangeText={setRName} />
            <TextInput style={s.input} placeholder="Driver Name" placeholderTextColor={COLORS.mid} value={driver} onChangeText={setDriver} />
            <TextInput style={s.input} placeholder="Vehicle Number" placeholderTextColor={COLORS.mid} autoCapitalize="characters" value={vehicle} onChangeText={setVehicle} />
            <TextInput style={s.input} placeholder="Stops (comma separated)" placeholderTextColor={COLORS.mid} value={stops} onChangeText={setStops} />
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Create Route</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: COLORS.bg },
  center:    { flex: 1, alignItems: "center", justifyContent: "center" },
  header:    { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:      { marginRight: 12 },
  title:     { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  addBtn:    { backgroundColor: "#059669", borderRadius: 10, padding: 6 },
  content:   { padding: 16, gap: 10 },
  empty:     { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:  { fontSize: 14, color: COLORS.mid },
  card:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  iconBox:   { width: 48, height: 48, borderRadius: 14, backgroundColor: "#05966922", alignItems: "center", justifyContent: "center" },
  name:      { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  meta:      { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle:{ fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:     { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  saveBtn:   { backgroundColor: "#059669", borderRadius: 14, padding: 16, alignItems: "center" },
  saveTxt:   { color: "#fff", fontSize: 16, fontWeight: "700" },
});
