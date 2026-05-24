import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { getParentDashboard } from "../../../src/lib/api";
import { registerPushToken } from "../../../src/lib/notifications";
import { useSession } from "../../../src/store/session";

export default function ParentHome() {
  const router = useRouter();
  const { t }  = useTranslation();
  const { session, clearSession } = useSession();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      if (session?.phone) {
        const res = await getParentDashboard(session.phone);
        if (!res?.error) setData(res);
      }
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => {
    load();
    if (session?.phone) registerPushToken(session.phone);
  }, []);

  const handleLogout = async () => {
    await clearSession();
    router.replace("/(auth)/login");
  };

  const children: any[] = data?.children || session?.children || [];
  const announcements: any[] = data?.announcements || [];

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.edu} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{t("hello")}</Text>
          <Text style={s.name}>{session?.name || t("parent")}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.mid} />
        </TouchableOpacity>
      </View>

      {/* Children cards */}
      {children.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("yourChildren")}</Text>
          {children.map((child: any, i: number) => (
            <View key={i} style={s.childCard}>
              <View style={s.childAvatar}>
                <Text style={s.childAvatarTxt}>{(child.name || "?")[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.childName}>{child.name}</Text>
                <Text style={s.childMeta}>{child.class || child.section || "—"}</Text>
              </View>
              {child.todayAttendance && (
                <View style={[s.badge,
                  { backgroundColor: child.todayAttendance === "present" ? COLORS.eduLight : "#FEE2E2" }
                ]}>
                  <Text style={[s.badgeTxt,
                    { color: child.todayAttendance === "present" ? COLORS.edu : COLORS.error }
                  ]}>
                    {child.todayAttendance === "present" ? t("present") : t("absent")}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Quick actions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{t("quickActions")}</Text>
        <View style={s.quickGrid}>
          {[
            { label: t("homework"), icon: "book-outline",     tab: "homework" },
            { label: t("fees"),     icon: "card-outline",     tab: "fees" },
            { label: t("aiTools"),  icon: "sparkles-outline", tab: "ai" },
            { label: t("profile"),  icon: "person-outline",   tab: "profile" },
          ].map((item) => (
            <TouchableOpacity
              key={item.tab}
              style={s.quickBtn}
              onPress={() => router.push(`/(main)/parent/${item.tab}` as any)}
            >
              <Ionicons name={item.icon as any} size={24} color={COLORS.edu} />
              <Text style={s.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Announcements */}
      {announcements.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("announcements")}</Text>
          {announcements.map((ann: any, i: number) => (
            <View key={i} style={s.annCard}>
              <View style={s.annDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.annTitle}>{ann.title || ann.message}</Text>
                {ann.date && <Text style={s.annDate}>{new Date(ann.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {announcements.length === 0 && !loading && (
        <View style={s.emptyCard}>
          <Ionicons name="megaphone-outline" size={36} color={COLORS.mid} />
          <Text style={s.emptyTxt}>{t("noAnnouncements")}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.bg },
  content:      { padding: 20, paddingBottom: 40 },
  center:       { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  greeting:     { fontSize: 13, color: COLORS.mid },
  name:         { fontSize: 20, fontWeight: "800", color: COLORS.dark },
  logoutBtn:    { padding: 8 },
  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  childCard:    { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  childAvatar:  { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.eduLight, alignItems: "center", justifyContent: "center", marginRight: 12 },
  childAvatarTxt: { fontSize: 18, fontWeight: "700", color: COLORS.edu },
  childName:    { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  childMeta:    { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  badge:        { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt:     { fontSize: 11, fontWeight: "700" },
  quickGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickBtn:     { flex: 1, minWidth: "44%", backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  quickLabel:   { fontSize: 13, fontWeight: "600", color: COLORS.dark, marginTop: 6 },
  annCard:      { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  annDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.edu, marginTop: 5, marginRight: 12 },
  annTitle:     { fontSize: 14, fontWeight: "600", color: COLORS.dark, lineHeight: 20 },
  annDate:      { fontSize: 11, color: COLORS.mid, marginTop: 3 },
  emptyCard:    { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  emptyTxt:     { fontSize: 14, color: COLORS.mid, marginTop: 10 },
});
