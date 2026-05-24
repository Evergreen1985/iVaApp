import {
  View, Text, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";

export default function ParentPhotos() {
  const { t } = useTranslation();
  return (
    <View style={s.root}>
      <Ionicons name="images-outline" size={56} color={COLORS.mid} />
      <Text style={s.title}>{t("photos")}</Text>
      <Text style={s.sub}>{t("comingSoon")}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg, gap: 12 },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.dark },
  sub:   { fontSize: 14, color: COLORS.mid },
});
