import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SESSION_KEY } from "../lib/constants";

export type Role = "parent" | "teacher" | "admin" | "owner";

export interface Session {
  role:      Role;
  phone?:    string;       // parent
  name?:     string;       // teacher / child name for parent / admin name
  token?:    string;       // teacher / admin session token
  username?: string;       // admin username
  sectionId?: string;      // teacher's primary section
  children?: any[];        // parent's children list
  loginTime: number;
}

interface SessionStore {
  session:        Session | null;
  loading:        boolean;
  activeChild:    any | null;   // in-memory: currently selected child (not persisted)
  setActiveChild: (child: any | null) => void;
  setSession:     (s: Session) => Promise<void>;
  loadSession:    () => Promise<void>;
  clearSession:   () => Promise<void>;
}

export const useSession = create<SessionStore>((set) => ({
  session:     null,
  loading:     true,
  activeChild: null,

  setActiveChild: (child) => set({ activeChild: child }),

  setSession: async (s) => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
    set({ session: s });
  },

  loadSession: async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        const s: Session = JSON.parse(raw);
        // 7-day expiry
        if (Date.now() - s.loginTime < 7 * 24 * 60 * 60 * 1000) {
          set({ session: s, loading: false });
          return;
        }
      }
    } catch {}
    set({ session: null, loading: false });
  },

  clearSession: async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    set({ session: null });
  },
}));
