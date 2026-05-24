import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "../src/store/session";
import { COLORS } from "../src/lib/constants";

export default function Index() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace(session.role === "teacher" ? "/(main)/teacher/home" : "/(main)/parent/home");
    } else {
      router.replace("/(auth)/login");
    }
  }, [session, loading]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary }}>
      <ActivityIndicator color="#fff" size="large" />
    </View>
  );
}
