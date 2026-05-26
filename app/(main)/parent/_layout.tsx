import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color as string} />
  );
}

export default function ParentLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.edu,
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
      <Tabs.Screen name="home"     options={{ title: t("home"),     tabBarIcon: icon("home") }} />
      <Tabs.Screen name="homework" options={{ title: t("homework"), tabBarIcon: icon("book") }} />
      <Tabs.Screen name="fees"     options={{ title: t("fees"),     tabBarIcon: icon("card") }} />
      <Tabs.Screen name="ai"       options={{ title: t("aiTools"),  tabBarIcon: icon("sparkles") }} />
      <Tabs.Screen name="profile"  options={{ title: t("profile"),  tabBarIcon: icon("person-circle") }} />
      {/* Hidden from tab bar — navigable via home bubble / profile quick links */}
      <Tabs.Screen name="community"  options={{ href: null }} />
      <Tabs.Screen name="calendar"   options={{ href: null }} />
      <Tabs.Screen name="ask"        options={{ href: null }} />
      <Tabs.Screen name="medical"    options={{ href: null }} />
      <Tabs.Screen name="pickup"     options={{ href: null }} />
      <Tabs.Screen name="audio"      options={{ href: null }} />
      <Tabs.Screen name="photos"     options={{ href: null }} />
      <Tabs.Screen name="incidents"  options={{ href: null }} />
      <Tabs.Screen name="documents"  options={{ href: null }} />
      <Tabs.Screen name="referrals"  options={{ href: null }} />
      <Tabs.Screen name="transport"  options={{ href: null }} />
      <Tabs.Screen name="kit"        options={{ href: null }} />
      <Tabs.Screen name="reels"      options={{ href: null }} />
    </Tabs>
  );
}
