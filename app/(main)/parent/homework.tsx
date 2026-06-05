import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { supabase } from "../../../src/lib/supabase";
import { useSession } from "../../../src/store/session";
import { useRealtime } from "../../../src/lib/realtime";
import ParentHomeworkCard from "../../../src/components/ParentHomeworkCard";

export default function ParentHomework() {
  const { t } = useTranslation();
  const { activeChild } = useSession();
  const [items, setItems]       = useState<any[]>([]);
  const [statusMap, setStatus]  = useState<Record<string, any>>({});
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const sectionId = activeChild?.section_id;
      const childId   = activeChild?.id;
      if (sectionId) {
        const since = new Date(); since.setDate(since.getDate() - 60);
        const { data: hw } = await supabase
          .from("homework").select("*")
          .eq("section_id", sectionId)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false })
          .limit(50);
        setItems(hw || []);

        // per-child status / doubts
        if (childId) {
          const { data: st } = await supabase
            .from("homework_status").select("*").eq("enquiry_id", childId);
          const map: Record<string, any> = {};
          (st || []).forEach((r: any) => { map[r.homework_id] = r; });
          setStatus(map);
        }
      } else {
        setItems([]); setStatus({});
      }
    } catch { setItems([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [activeChild?.section_id, activeChild?.id]);
  useRealtime("homework", () => load());
  useRealtime("homework_status", () => load());

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;
  }

  const pendingCount = items.filter((h) => statusMap[h.id]?.status !== "done").length;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}
    >
      <Text style={s.pageTitle}>{t("homework")}</Text>

      {activeChild && (
        <View style={s.childBanner}>
          {activeChild.photo_url ? (
            <Image source={{ uri: activeChild.photo_url }} style={s.bannerPhoto} />
          ) : (
            <View style={s.bannerAvt}><Text style={s.bannerAvtTxt}>{(activeChild.name || "?")[0].toUpperCase()}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.bannerName}>{activeChild.name}</Text>
            <Text style={s.bannerClass}>{activeChild.class}</Text>
          </View>
          {items.length > 0 && (
            <View style={[s.pendPill, pendingCount === 0 && s.pendPillDone]}>
              <Text style={[s.pendTxt, pendingCount === 0 && { color: COLORS.success }]}>
                {pendingCount === 0 ? "All done 🎉" : `${pendingCount} pending`}
              </Text>
            </View>
          )}
        </View>
      )}

      {items.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="book-outline" size={40} color={COLORS.mid} />
          <Text style={s.emptyTxt}>{t("noHomework")}</Text>
        </View>
      ) : (
        items.map((hw: any) => (
          <ParentHomeworkCard
            key={hw.id}
            hw={hw}
            statusRow={statusMap[hw.id] || null}
            childId={activeChild?.id}
            childName={activeChild?.name || ""}
            onChanged={() => load(true)}
          />
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 20, paddingBottom: 40 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:   { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  childBanner: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.eduLight, borderRadius: 14, padding: 12, marginBottom: 20, gap: 12, borderWidth: 1, borderColor: COLORS.edu + "40" },
  bannerPhoto: { width: 40, height: 40, borderRadius: 20 },
  bannerAvt:   { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.edu, alignItems: "center", justifyContent: "center" },
  bannerAvtTxt:{ fontSize: 16, fontWeight: "800", color: "#fff" },
  bannerName:  { fontSize: 14, fontWeight: "800", color: COLORS.dark },
  bannerClass: { fontSize: 12, color: COLORS.mid, marginTop: 1 },
  pendPill:    { backgroundColor: "#FEF3C7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pendPillDone:{ backgroundColor: COLORS.success + "22" },
  pendTxt:     { fontSize: 12, fontWeight: "800", color: "#92400E" },
  emptyCard:   { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 40 },
  emptyTxt:    { fontSize: 14, color: COLORS.mid, marginTop: 10 },
});
