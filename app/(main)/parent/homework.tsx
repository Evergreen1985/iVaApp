import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { getParentDashboard } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";

export default function ParentHomework() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      if (session?.phone) {
        const res = await getParentDashboard(session.phone);
        setItems(res?.homework || []);
      }
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}
    >
      <Text style={s.pageTitle}>{t("homework")}</Text>

      {items.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="book-outline" size={40} color={COLORS.mid} />
          <Text style={s.emptyTxt}>{t("noHomework")}</Text>
        </View>
      ) : (
        items.map((hw: any, i: number) => (
          <View key={i} style={s.card}>
            <View style={s.cardTop}>
              <View style={s.subjectPill}>
                <Text style={s.subjectTxt}>{hw.subject || "General"}</Text>
              </View>
              {hw.dueDate && (
                <Text style={s.dueDate}>
                  Due {new Date(hw.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </Text>
              )}
            </View>
            <Text style={s.hwTitle}>{hw.title || hw.description}</Text>
            {hw.description && hw.title && (
              <Text style={s.hwDesc}>{hw.description}</Text>
            )}
            {hw.childName && (
              <Text style={s.childTag}>For: {hw.childName}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.bg },
  content:    { padding: 20, paddingBottom: 40 },
  center:     { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:  { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 20 },
  card:       { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardTop:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  subjectPill:{ backgroundColor: COLORS.eduLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  subjectTxt: { fontSize: 12, fontWeight: "700", color: COLORS.edu },
  dueDate:    { fontSize: 12, color: COLORS.orange, fontWeight: "600" },
  hwTitle:    { fontSize: 15, fontWeight: "700", color: COLORS.dark, lineHeight: 22 },
  hwDesc:     { fontSize: 13, color: COLORS.mid, marginTop: 6, lineHeight: 19 },
  childTag:   { fontSize: 12, color: COLORS.mid, marginTop: 8, fontStyle: "italic" },
  emptyCard:  { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 40 },
  emptyTxt:   { fontSize: 14, color: COLORS.mid, marginTop: 10 },
});
