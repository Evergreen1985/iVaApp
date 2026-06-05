import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { EDU_API } from "./constants";

export async function registerPushToken(phone: string): Promise<string | null> {
  // Never throw: push is optional. On builds without FCM/Firebase configured,
  // getExpoPushTokenAsync rejects ("Default FirebaseApp is not initialized") —
  // swallow it so it doesn't surface as an uncaught promise rejection.
  try {
    if (!Device.isDevice) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "iVa Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4F46E5",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    try {
      await fetch(`${EDU_API}/api/push/expo-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, token, platform: Platform.OS }),
      });
    } catch {}

    return token;
  } catch (e: any) {
    console.warn("[push] token registration skipped:", e?.message || String(e));
    return null;
  }
}
