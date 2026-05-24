import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { getParentDashboard } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";

export default function ParentFees() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [dues, setDues]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      if (session?.phone) {
        const res = await getParentDashboard(session.phone);
        setDues(res?.feeDues || res?.fees || []);
      }
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total = dues.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}
    >
      <Text style={s.pageTitle}>{t("feeDues")}</Text>

      {dues.length > 0 && (
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>{t("totalPending")}</Text>
          <Text style={s.totalAmt}>₹ {total.toLocaleString("en-IN")}</Text>
        </View>
      )}

      {dues.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={40} color={COLORS.success} />
          <Text style={s.emptyTxt}>{t("noDues")}</Text>
          <Text style={s.emptySubTxt}>{t("allFeesUpToDate")}</Text>
        </View>
      ) : (
        dues.map((due: any, i: number) => (
          <View key={i} style={s.card}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.feeName}>{due.feeName || due.title || "Fee"}</Text>
                {due.dueDate && (
                  <Text style={s.dueDate}>
                    Due: {new Date(due.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                )}
                {due.childName && <Text style={s.childTag}>For: {due.childName}</Text>}
              </View>
              <View style={s.amountCol}>
                <Text style={s.amount}>₹ {(due.amount || 0).toLocaleString("en-IN")}</Text>
                <View style={[s.statusBadge, { backgroundColor: due.status === "overdue" ? "#FEE2E2" : "#FEF3C7" }]}>
                  <Text style={[s.statusTxt, { color: due.status === "overdue" ? COLORS.error : "#92400E" }]}>
                    {due.status === "overdue" ? t("overdue") : t("pending")}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={s.payBtn}
              onPress={() => Alert.alert(t("feeDues"), t("feePaymentSoon"))}
            >
              <Text style={s.payBtnTxt}>{t("payNow")}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 20, paddingBottom: 40 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:   { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 20 },
  totalCard:   { backgroundColor: COLORS.dark, borderRadius: 20, padding: 20, marginBottom: 20, alignItems: "center" },
  totalLabel:  { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  totalAmt:    { fontSize: 32, fontWeight: "900", color: "#fff", marginTop: 4 },
  card:        { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardRow:     { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  feeName:     { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  dueDate:     { fontSize: 12, color: COLORS.mid, marginTop: 3 },
  childTag:    { fontSize: 12, color: COLORS.mid, marginTop: 2, fontStyle: "italic" },
  amountCol:   { alignItems: "flex-end" },
  amount:      { fontSize: 17, fontWeight: "800", color: COLORS.dark },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  statusTxt:   { fontSize: 10, fontWeight: "700" },
  payBtn:      { backgroundColor: COLORS.edu, borderRadius: 10, padding: 10, alignItems: "center" },
  payBtnTxt:   { color: "#fff", fontSize: 14, fontWeight: "700" },
  emptyCard:   { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 40 },
  emptyTxt:    { fontSize: 16, fontWeight: "700", color: COLORS.dark, marginTop: 12 },
  emptySubTxt: { fontSize: 13, color: COLORS.mid, marginTop: 4 },
});
