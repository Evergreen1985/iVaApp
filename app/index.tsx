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
      if (session.role === "owner") router.replace("/(owner)/home");
      else if (session.role === "admin") router.replace("/(admin)/home");
      else if (session.role === "teacher") router.replace("/(main)/teacher/home");
      else router.replace("/(main)/parent/home");
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
