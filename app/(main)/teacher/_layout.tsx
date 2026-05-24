import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ColorValue } from "react-native";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color as string} />
  );
}

export default function TeacherLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.mid,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="home"       options={{ title: t("home"),       tabBarIcon: icon("home") }} />
      <Tabs.Screen name="attendance" options={{ title: t("attendance"), tabBarIcon: icon("checkmark-circle") }} />
      <Tabs.Screen name="students"   options={{ title: t("students"),   tabBarIcon: icon("people") }} />
      <Tabs.Screen name="ai"         options={{ title: t("aiTools"),    tabBarIcon: icon("sparkles") }} />
      <Tabs.Screen name="profile"    options={{ title: t("profile"),    tabBarIcon: icon("person-circle") }} />
      {/* Hidden from tab bar — navigable via profile quick links */}
      <Tabs.Screen name="homework"   options={{ href: null }} />
      <Tabs.Screen name="messages"   options={{ href: null }} />
      <Tabs.Screen name="birthdays"  options={{ href: null }} />
      <Tabs.Screen name="incidents"  options={{ href: null }} />
      <Tabs.Screen name="photos"     options={{ href: null }} />
      <Tabs.Screen name="transport"  options={{ href: null }} />
      <Tabs.Screen name="kit"        options={{ href: null }} />
      <Tabs.Screen name="ptm"        options={{ href: null }} />
    </Tabs>
  );
}
