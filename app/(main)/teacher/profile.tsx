import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Modal, Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { LANGUAGES, setLanguage, LangCode } from "../../../src/i18n";

export default function TeacherProfile() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { session, clearSession } = useSession();
  const [langOpen, setLangOpen] = useState(false);
  const current = i18n.language as LangCode;
  const currentLang = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  const handleLogout = () => {
    Alert.alert(t("logout"), t("logoutConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("logout"), style: "destructive", onPress: async () => {
          await clearSession();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const features: { label: string; icon: string; route?: string; soon?: boolean }[] = [
    { label: t("attendance"), icon: "checkmark-circle-outline", route: "/(main)/teacher/attendance" },
    { label: t("homework"),   icon: "book-outline",             route: "/(main)/teacher/homework" },
    { label: t("students"),   icon: "people-outline",           route: "/(main)/teacher/students" },
    { label: t("photos"),     icon: "images-outline",           route: "/(main)/teacher/photos" },
    { label: t("kitBooks"),   icon: "bag-outline",              route: "/(main)/teacher/kit" },
    { label: t("messages"),   icon: "chatbubble-outline",       route: "/(main)/teacher/messages" },
    { label: t("transport"),  icon: "bus-outline",              route: "/(main)/teacher/transport" },
    { label: t("incidents"),  icon: "warning-outline",          route: "/(main)/teacher/incidents" },
    { label: t("birthdays"),  icon: "gift-outline",             route: "/(main)/teacher/birthdays" },
    { label: "PTM",           icon: "people-circle-outline",    route: "/(main)/teacher/ptm" },
  ];

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.avatarCircle}>
          <Ionicons name="person" size={36} color="#fff" />
        </View>
        <Text style={s.name}>{session?.name || "Teacher"}</Text>
        <Text style={s.role}>{t("teacherStaff")}</Text>
        {session?.sectionId && (
          <View style={s.sectionPill}>
            <Ionicons name="school-outline" size={12} color={COLORS.primary} />
            <Text style={s.sectionTxt}>{session.sectionId}</Text>
          </View>
        )}
      </View>

      {/* Settings */}
      <Text style={s.sectionLabel}>{t("profile")}</Text>
      <View style={s.card}>
        <TouchableOpacity style={s.row} onPress={() => setLangOpen(true)} activeOpacity={0.7}>
          <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
          <Text style={s.rowLabel}>{t("selectLanguage")}</Text>
          <Text style={s.rowValue}>{currentLang.native}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.mid} />
        </TouchableOpacity>
      </View>

      {/* Features */}
      <Text style={[s.sectionLabel, { marginTop: 20 }]}>{t("moreFeatures")}</Text>
      <View style={s.grid}>
        {features.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={s.featureBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (f.soon) {
                Alert.alert(t("comingSoon"), `${f.label} ${t("comingSoon").toLowerCase()}`);
              } else if (f.route) {
                router.push(f.route as any);
              }
            }}
          >
            <Ionicons name={f.icon as any} size={26} color={f.soon ? COLORS.mid : COLORS.primary} />
            <Text style={[s.featureLabel, f.soon && { color: COLORS.mid }]}>{f.label}</Text>
            {f.soon && <Text style={s.soonBadge}>{t("comingSoon")}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={s.logoutTxt}>{t("logout")}</Text>
      </TouchableOpacity>

      {/* Language Modal */}
      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setLangOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>{t("selectLanguage")}</Text>
            {LANGUAGES.map((lang) => {
              const active = current === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[s.langRow, active && s.langRowActive]}
                  onPress={() => { setLanguage(lang.code); setLangOpen(false); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.langNative, active && s.langNativeActive]}>{lang.native}</Text>
                    <Text style={s.langSub}>{lang.label}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  content:       { padding: 20, paddingBottom: 50 },
  header:        { backgroundColor: COLORS.primary, borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 24 },
  avatarCircle:  { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  name:          { fontSize: 20, fontWeight: "800", color: "#fff" },
  role:          { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  sectionPill:   { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  sectionTxt:    { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  sectionLabel:  { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  card:          { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  row:           { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  rowLabel:      { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.dark },
  rowValue:      { fontSize: 13, color: COLORS.mid, marginRight: 4 },
  grid:          { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
  featureBtn:    { width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  featureLabel:  { fontSize: 13, fontWeight: "600", color: COLORS.dark, marginTop: 8, textAlign: "center" },
  soonBadge:     { fontSize: 9, color: COLORS.mid, marginTop: 3 },
  logoutBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: COLORS.error, borderRadius: 16, padding: 16 },
  logoutTxt:     { fontSize: 16, fontWeight: "800", color: "#fff" },
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet:         { width: "100%", backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  sheetTitle:    { fontSize: 16, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  langRow:       { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginBottom: 8, backgroundColor: "#F8F8F8", borderWidth: 1.5, borderColor: "transparent" },
  langRowActive: { borderColor: COLORS.primary, backgroundColor: "#EEF3FF" },
  langNative:    { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  langNativeActive: { color: COLORS.primary },
  langSub:       { fontSize: 12, color: COLORS.mid, marginTop: 2 },
});
