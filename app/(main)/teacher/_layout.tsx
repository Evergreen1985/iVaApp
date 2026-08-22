import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color as string} />
  );
}

export default function TeacherLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  // Non-teaching transport staff (drivers/helpers) only need to share the bus
  // location — give them a focused Transport + Profile tab bar, hide teacher tabs.
  const transportStaff = ["Driver", "Helper"].includes(String(session?.staffRole || ""));
  const mainOpt = (title: string, name: IconName) =>
    transportStaff ? { href: null as any } : { title, tabBarIcon: icon(name) };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.mid,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: COLORS.border,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="home"       options={mainOpt(t("home"), "home")} />
      <Tabs.Screen name="attendance" options={mainOpt(t("attendance"), "checkmark-circle")} />
      <Tabs.Screen name="ai"         options={mainOpt("AI Tools", "sparkles")} />
      <Tabs.Screen name="students"   options={mainOpt(t("students"), "people")} />
      <Tabs.Screen name="profile"    options={{ title: t("profile"),    tabBarIcon: icon("person-circle") }} />
      {/* Transport: a visible tab for drivers/helpers (share bus location); hidden for teachers (reached via home quick actions) */}
      <Tabs.Screen name="transport"  options={transportStaff ? { title: t("transport") || "Transport", tabBarIcon: icon("bus") } : { href: null }} />
      {/* Hidden from tab bar — navigable via home quick actions */}
      <Tabs.Screen name="community"  options={{ href: null }} />
      <Tabs.Screen name="homework"   options={{ href: null }} />
      <Tabs.Screen name="messages"   options={{ href: null }} />
      <Tabs.Screen name="birthdays"  options={{ href: null }} />
      <Tabs.Screen name="incidents"  options={{ href: null }} />
      <Tabs.Screen name="photos"     options={{ href: null }} />
      <Tabs.Screen name="reels"      options={{ href: null }} />
      <Tabs.Screen name="kit"        options={{ href: null }} />
      <Tabs.Screen name="ptm"        options={{ href: null }} />
      <Tabs.Screen name="training"   options={{ href: null }} />
    </Tabs>
  );
}
