import { useState } from "react";
import { View, TouchableOpacity, Text, Modal, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { LANGUAGES, setLanguage, LangCode } from "../i18n";
import { COLORS } from "../lib/constants";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.language as LangCode;
  const [open, setOpen] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  return (
    <>
      <TouchableOpacity style={s.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Ionicons name="globe-outline" size={13} color="rgba(255,255,255,0.85)" />
        <Text style={s.triggerTxt}>{currentLang.native}</Text>
        <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>{t("selectLanguage")}</Text>
            {LANGUAGES.map((lang) => {
              const active = current === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[s.langRow, active && s.langRowActive]}
                  onPress={() => { setLanguage(lang.code); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.langNative, active && s.langNativeActive]}>{lang.native}</Text>
                    <Text style={s.langLabel}>{lang.label}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={COLORS.edu} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger:        { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  triggerTxt:     { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
  overlay:        { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet:          { width: "100%", backgroundColor: "#fff", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  sheetTitle:     { fontSize: 16, fontWeight: "800", color: "#1A2F4A", marginBottom: 16 },
  langRow:        { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginBottom: 8, backgroundColor: "#F8F8F8", borderWidth: 1.5, borderColor: "transparent" },
  langRowActive:  { borderColor: COLORS.edu, backgroundColor: "#EEF8F6" },
  langNative:     { fontSize: 15, fontWeight: "700", color: "#1A2F4A" },
  langNativeActive: { color: COLORS.edu },
  langLabel:      { fontSize: 12, color: "#6B7A99", marginTop: 2 },
});
