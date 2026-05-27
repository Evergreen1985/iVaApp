import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, Modal, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getOwnerRoles, createOwnerRole, deleteOwnerRole } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

const ROLE_COLORS = ["#7C3AED","#059669","#DC2626","#0891B2","#D97706","#6B7280","#1D4ED8","#DB2777"];

const DASHBOARD_TABS = ["Attendance","Homework","Students","Photos","Kit","Messages"];
const ADMIN_TABS = ["Enquiries","Sections","Calendar","Photos","Fees","Staff","Settings","Academic Year","Import Data","Kit Manager","Announcements","Expenses","Reports","Transport"];

export default function OwnerRoles() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [roles, setRoles]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [color, setColor]       = useState(ROLE_COLORS[0]);
  const [dashTabs, setDashTabs] = useState<string[]>([]);
  const [adminTabs, setAdminTabs] = useState<string[]>([]);
  const [busy, setBusy]         = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getOwnerRoles(token);
      const data = res?.roles ?? res;
      setRoles(Array.isArray(data) ? data : []);
    } catch { setRoles([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleTab = (tab: string, type: "dash"|"admin") => {
    if (type === "dash") setDashTabs(prev => prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab]);
    else setAdminTabs(prev => prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab]);
  };

  const handleCreate = async () => {
    if (!roleName) return;
    setBusy(true);
    await createOwnerRole(token, { name: roleName, color, dashboardTabs: dashTabs, adminTabs });
    setBusy(false);
    setShowForm(false); setRoleName(""); setDashTabs([]); setAdminTabs([]);
    load(true);
  };

  const handleDelete = (role: any) => Alert.alert("Delete Role", `Remove "${role.name}"?`, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => {
      await deleteOwnerRole(token, role.id);
      setRoles(prev => prev.filter(r => r.id !== role.id));
    }},
  ]);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Staff Roles</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}>
        {roles.length === 0 ? (
          <View style={s.empty}><Ionicons name="shield-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No custom roles defined</Text></View>
        ) : roles.map((role, i) => (
          <View key={role.id || i} style={s.card}>
            <View style={[s.colorBar, { backgroundColor: role.color || COLORS.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.roleName}>{role.name}</Text>
              <Text style={s.tabCount}>
                Dashboard: {(role.dashboard_tabs || role.dashboardTabs || []).length} tabs · Admin: {(role.admin_tabs || role.adminTabs || []).length} tabs
              </Text>
              <View style={s.tabsRow}>
                {[...(role.dashboard_tabs || role.dashboardTabs || [])].slice(0, 4).map((t: string) => (
                  <View key={t} style={s.tabChip}><Text style={s.tabChipTxt}>{t}</Text></View>
                ))}
                {(role.dashboard_tabs || role.dashboardTabs || []).length > 4 && (
                  <Text style={s.moreChip}>+{(role.dashboard_tabs || role.dashboardTabs || []).length - 4} more</Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(role)} style={s.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={s.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.sheetTitle}>New Staff Role</Text>
              <TextInput style={s.input} placeholder="Role Name *" placeholderTextColor={COLORS.mid} value={roleName} onChangeText={setRoleName} />

              <Text style={s.subLabel}>Color</Text>
              <View style={s.colorRow}>
                {ROLE_COLORS.map(c => (
                  <TouchableOpacity key={c} style={[s.colorSwatch, { backgroundColor: c }, color === c && s.colorSwatchActive]} onPress={() => setColor(c)} />
                ))}
              </View>

              <Text style={s.subLabel}>Dashboard Tabs</Text>
              <View style={s.tabGrid}>
                {DASHBOARD_TABS.map(t => (
                  <TouchableOpacity key={t} style={[s.tabToggle, dashTabs.includes(t) && { backgroundColor: color, borderColor: color }]}
                    onPress={() => toggleTab(t, "dash")}>
                    <Text style={[s.tabToggleTxt, dashTabs.includes(t) && { color: "#fff" }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.subLabel}>Admin Panel Tabs</Text>
              <View style={s.tabGrid}>
                {ADMIN_TABS.map(t => (
                  <TouchableOpacity key={t} style={[s.tabToggle, adminTabs.includes(t) && { backgroundColor: color, borderColor: color }]}
                    onPress={() => toggleTab(t, "admin")}>
                    <Text style={[s.tabToggleTxt, adminTabs.includes(t) && { color: "#fff" }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[s.saveBtn, { backgroundColor: color }, busy && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Create Role</Text>}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: COLORS.bg },
  center:         { flex: 1, alignItems: "center", justifyContent: "center" },
  header:         { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:           { marginRight: 12 },
  title:          { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  addBtn:         { backgroundColor: COLORS.primary, borderRadius: 10, padding: 6 },
  content:        { padding: 16, gap: 10 },
  empty:          { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:       { fontSize: 14, color: COLORS.mid },
  card:           { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  colorBar:       { width: 6, height: "100%", borderRadius: 3 },
  roleName:       { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  tabCount:       { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  tabsRow:        { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  tabChip:        { backgroundColor: COLORS.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.border },
  tabChipTxt:     { fontSize: 10, color: COLORS.mid },
  moreChip:       { fontSize: 10, color: COLORS.mid, paddingTop: 2 },
  deleteBtn:      { padding: 8 },
  overlay:        { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:          { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  sheetTitle:     { fontSize: 17, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  input:          { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  subLabel:       { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 },
  colorRow:       { flexDirection: "row", gap: 10, marginBottom: 16 },
  colorSwatch:    { width: 32, height: 32, borderRadius: 16 },
  colorSwatchActive: { borderWidth: 3, borderColor: COLORS.dark, transform: [{ scale: 1.2 }] },
  tabGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tabToggle:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  tabToggleTxt:   { fontSize: 12, fontWeight: "600", color: COLORS.dark },
  saveBtn:        { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  saveTxt:        { color: "#fff", fontSize: 16, fontWeight: "700" },
});
