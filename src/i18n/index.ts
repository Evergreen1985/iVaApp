import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./en";
import ml from "./ml";
import hi from "./hi";
import te from "./te";
import ta from "./ta";
import kn from "./kn";

export type LangCode = "en" | "ml" | "hi" | "te" | "ta" | "kn";
export const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: "en", label: "English",   native: "English" },
  { code: "hi", label: "Hindi",     native: "हिन्दी" },
  { code: "te", label: "Telugu",    native: "తెలుగు" },
  { code: "ta", label: "Tamil",     native: "தமிழ்" },
  { code: "kn", label: "Kannada",   native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
];

const VALID_LANGS: LangCode[] = ["en", "ml", "hi", "te", "ta", "kn"];
const LANG_KEY = "iva_language";

async function getStoredLang(): Promise<LangCode> {
  try {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    if (stored && VALID_LANGS.includes(stored as LangCode)) return stored as LangCode;
    const device = Localization.getLocales()[0]?.languageCode;
    if (device && VALID_LANGS.includes(device as LangCode)) return device as LangCode;
  } catch {}
  return "en";
}

export async function initI18n() {
  const lng = await getStoredLang();
  await i18n.use(initReactI18next).init({
    lng,
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      ml: { translation: ml },
      hi: { translation: hi },
      te: { translation: te },
      ta: { translation: ta },
      kn: { translation: kn },
    },
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
  });
}

export async function setLanguage(code: LangCode) {
  await AsyncStorage.setItem(LANG_KEY, code);
  await i18n.changeLanguage(code);
}

export default i18n;
