import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { getKitItems } from "../../../src/lib/api";

const CATEGORY_ICONS: Record<string, string> = {
  book:       "book-outline",
  uniform:    "shirt-outline",
  bag:        "bag-outline",
  stationery: "pencil-outline",
  other:      "cube-outline",
};

export default function ParentKit() {
  const { t } = useTranslation();
  const { session } = useSession();
  const child = session?.children?.[0];
  const enquiryId = child?.id || child?.enquiry_id || "";

  const [kitItems, setKitItems] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);

  const load = async (isRefresh = false) => {
    if (!enquiryId) { setLoading(false); return; }
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const items = await getKitItems(enquiryId);
      setKitItems(Array.isArray(items) ? items : []);
    } catch { setKitItems([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [enquiryId]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;
  }

  const issued  = kitItems.filter((k) => k.is_issued || k.issued);
  const pending = kitItems.filter((k) => !(k.is_issued || k.issued));
  const categories = [...new Set(kitItems.map((k) => (k.item_category || "other").toLowerCase()))];

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}
    >
      <Text style={s.pageTitle}>{t("kitBooks")}</Text>
      {child && (
        <Text style={s.subtitle}>Items for {child.name || child.child_name}</Text>
      )}

      {/* Summary */}
      {kitItems.length > 0 && (
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statVal}>{kitItems.length}</Text>
            <Text style={s.statLabel}>Total</Text>
          </View>
          <View style={[s.statCard, { borderColor: "rgba(23,143,120,0.3)" }]}>
            <Text style={[s.statVal, { color: COLORS.edu }]}>{issued.length}</Text>
            <Text style={s.statLabel}>Issued</Text>
          </View>
          <View style={[s.statCard, { borderColor: "rgba(231,76,60,0.3)" }]}>
            <Text style={[s.statVal, { color: COLORS.error }]}>{pending.length}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </View>
        </View>
      )}

      {kitItems.length === 0
        ? (
          <View style={s.emptyBox}>
            <Ionicons name="bag-outline" size={48} color={COLORS.mid} />
            <Text style={s.emptyTitle}>No Kit Items Yet</Text>
            <Text style={s.emptyDesc}>
              The school will update your child's kit and book list here once assigned.
            </Text>
          </View>
        )
        : categories.map((cat) => {
            const items = kitItems.filter((k) => (k.item_category || "other").toLowerCase() === cat);
            const catIcon = CATEGORY_ICONS[cat] || "cube-outline";
            return (
              <View key={cat} style={{ marginBottom: 20 }}>
                <View style={s.catHeader}>
                  <Ionicons name={catIcon as any} size={15} color={COLORS.edu} />
                  <Text style={s.catLabel}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
                </View>
                {items.map((item: any) => {
                  const isIssued = item.is_issued || item.issued;
                  return (
                    <View key={item.id} style={[s.kitItem, isIssued && s.kitItemIssued]}>
                      <View style={[s.statusDot, { backgroundColor: isIssued ? COLORS.edu : COLORS.border }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.itemName}>{item.item_name}</Text>
                        {item.quantity > 1 && (
                          <Text style={s.itemMeta}>Qty: {item.quantity}</Text>
                        )}
                        {item.size && (
                          <Text style={s.itemMeta}>Size: {item.size}</Text>
                        )}
                        {item.school_notes && (
                          <Text style={s.schoolNote}>{item.school_notes}</Text>
                        )}
                      </View>
                      <View style={[s.badge, isIssued ? s.badgeIssued : s.badgePending]}>
                        <Text style={[s.badgeTxt, { color: isIssued ? COLORS.edu : COLORS.mid }]}>
                          {isIssued ? "Issued" : "Pending"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
      }

      <View style={s.noteCard}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.mid} />
        <Text style={s.noteTxt}>
          Items are marked as issued by school staff. Contact the school if anything is missing.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.bg },
  content:      { padding: 16, paddingBottom: 50 },
  center:       { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:    { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  subtitle:     { fontSize: 13, color: COLORS.mid, marginTop: 2, marginBottom: 16 },
  statsRow:     { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard:     { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1.5, borderColor: COLORS.border },
  statVal:      { fontSize: 22, fontWeight: "900", color: COLORS.dark },
  statLabel:    { fontSize: 10, color: COLORS.mid, fontWeight: "600", marginTop: 2 },
  emptyBox:     { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle:   { fontSize: 16, fontWeight: "800", color: COLORS.dark },
  emptyDesc:    { fontSize: 13, color: COLORS.mid, textAlign: "center", lineHeight: 20, maxWidth: 260 },
  catHeader:    { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  catLabel:     { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8 },
  kitItem:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  kitItemIssued:{ backgroundColor: "#EEF8F6", borderColor: "rgba(23,143,120,0.2)" },
  statusDot:    { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  itemName:     { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  itemMeta:     { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  schoolNote:   { fontSize: 11, color: COLORS.primary, marginTop: 3, fontStyle: "italic" },
  badge:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeIssued:  { backgroundColor: "#EEF8F6", borderColor: "rgba(23,143,120,0.3)" },
  badgePending: { backgroundColor: "#F5F5F5", borderColor: COLORS.border },
  badgeTxt:     { fontSize: 11, fontWeight: "700" },
  noteCard:     { flexDirection: "row", gap: 8, backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginTop: 8 },
  noteTxt:      { flex: 1, fontSize: 12, color: COLORS.mid, lineHeight: 18 },
});
