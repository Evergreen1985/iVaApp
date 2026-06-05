import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Tracks which items (audio overviews, homework, announcements, events) the
// parent has already interacted with, so the UI can dim "already viewed" ones.
// Persisted on-device; ids are stable DB ids.
const KEY = "iva_seen_ids";

type SeenState = {
  seen: Record<string, true>;
  loaded: boolean;
  load: () => Promise<void>;
  markSeen: (id?: string | null) => void;
};

export const useSeen = create<SeenState>((set, get) => ({
  seen: {},
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      set({ seen: raw ? JSON.parse(raw) : {}, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  markSeen: (id) => {
    if (!id || get().seen[id]) return;
    const next = { ...get().seen, [id]: true as const };
    set({ seen: next });
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  },
}));
