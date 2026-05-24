import { useEffect, useRef, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import * as Notifications from "expo-notifications";
import { useSession } from "../src/store/session";
import { initI18n } from "../src/i18n";
import { COLORS } from "../src/lib/constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const { loadSession } = useSession();
  const router    = useRouter();
  const tapRef    = useRef<Notifications.Subscription | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadSession(), initI18n()]).then(() => setReady(true));

    tapRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen as string | undefined;
      if (screen) router.push(screen as any);
    });

    return () => tapRef.current?.remove();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
