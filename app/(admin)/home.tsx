import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../src/lib/constants";
import { useSession } from "../../src/store/session";

type Section = { label: string; icon: string; route: string; color: string };
type Group   = { title: string; items: Section[] };

const GROUPS: Group[] = [
  {
    title: "Admissions",
    items: [
      { label: "Enquiries",   icon: "person-add-outline",   route: "/(admin)/enquiries",   color: COLORS.edu },
      { label: "Follow-ups",  icon: "call-outline",         route: "/(admin)/followups",   color: COLORS.edu },
      { label: "Sections",    icon: "layers-outline",       route: "/(admin)/sections",    color: COLORS.edu },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Announcements", icon: "megaphone-outline",   route: "/(admin)/announcements", color: COLORS.primary },
      { label: "Blog",          icon: "newspaper-outline",   route: "/(admin)/blog",          color: COLORS.primary },
      { label: "Testimonials",  icon: "star-outline",        route: "/(admin)/testimonials",  color: COLORS.primary },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Fees",     icon: "card-outline",       route: "/(admin)/fees",    color: COLORS.orange },
      { label: "Expenses", icon: "receipt-outline",    route: "/(admin)/expenses", color: COLORS.orange },
      { label: "Payroll",  icon: "cash-outline",       route: "/(admin)/payroll", color: COLORS.orange },
      { label: "Reports",  icon: "bar-chart-outline",  route: "/(admin)/reports", color: COLORS.orange },
    ],
  },
  {
    title: "Academic",
    items: [
      { label: "Calendar",  icon: "calendar-outline",         route: "/(admin)/calendar",  color: "#7C3AED" },
      { label: "PTM",       icon: "people-outline",           route: "/(admin)/ptm",       color: "#7C3AED" },
      { label: "Birthdays", icon: "gift-outline",             route: "/(admin)/birthdays", color: "#7C3AED" },
      { label: "Kit",       icon: "bag-outline",              route: "/(admin)/kit",       color: "#7C3AED" },
    ],
  },
  {
    title: "Staff & Students",
    items: [
      { label: "Staff",       icon: "id-card-outline",       route: "/(admin)/staff",     color: COLORS.dark },
      { label: "Medical",     icon: "medkit-outline",        route: "/(admin)/medical",   color: COLORS.dark },
      { label: "Pickup Auth", icon: "car-outline",           route: "/(admin)/pickup",    color: COLORS.dark },
      { label: "Incidents",   icon: "warning-outline",       route: "/(admin)/incidents", color: COLORS.dark },
    ],
  },
  {
    title: "Content & Media",
    items: [
      { label: "Photos",         icon: "images-outline",  route: "/(admin)/photos",      color: "#0891B2" },
      { label: "Reels",          icon: "film-outline",    route: "/(admin)/reels",       color: "#0891B2" },
      { label: "Audio Overviews",icon: "mic-outline",     route: "/(admin)/audio",       color: "#0891B2" },
      { label: "Knowledge Base", icon: "library-outline", route: "/(admin)/kb",          color: "#0891B2" },
      { label: "Referrals",      icon: "share-outline",   route: "/(admin)/referrals",   color: "#0891B2" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Transport",    icon: "bus-outline",          route: "/(admin)/transport", color: "#059669" },
      { label: "Import Data",  icon: "cloud-upload-outline", route: "/(admin)/import",    color: "#059669" },
      { label: "Settings",     icon: "settings-outline",     route: "/(admin)/settings",  color: "#059669" },
    ],
  },
];

export default function AdminHome() {
  const router  = useRouter();
  const { session, clearSession } = useSession();

  const handleLogout = () => {
    Alert.alert("Logout", "Sign out of admin?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive", onPress: async () => {
          await clearSession();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Admin Portal</Text>
          <Text style={s.headerSub}>{session?.name || session?.username || "Administrator"}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Groups */}
      {GROUPS.map((group) => (
        <View key={group.title} style={s.group}>
          <Text style={s.groupTitle}>{group.title}</Text>
          <View style={s.grid}>
            {group.items.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={s.card}
                activeOpacity={0.75}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[s.iconBox, { backgroundColor: item.color + "18" }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <Text style={s.cardLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 16, paddingBottom: 40 },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                 backgroundColor: COLORS.orange, borderRadius: 20, padding: 20, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  logoutBtn:   { padding: 8 },
  group:       { marginBottom: 20 },
  groupTitle:  { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase",
                 letterSpacing: 1, marginBottom: 10, marginLeft: 2 },
  grid:        { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card:        { width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 14,
                 alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  iconBox:     { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  cardLabel:   { fontSize: 12, fontWeight: "700", color: COLORS.dark, textAlign: "center" },
});
