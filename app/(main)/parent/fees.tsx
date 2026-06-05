import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { getFeeDues } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  overdue: { bg: "#FEE2E2", text: COLORS.error },
  partial: { bg: "#EDE9FE", text: "#5B21B6" },
  paid:    { bg: "#DCFCE7", text: "#166534" },
  waived:  { bg: "#F1F5F9", text: COLORS.mid },
};

export default function ParentFees() {
  const { activeChild } = useSession();
  const [fees, setFees]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const enquiryId = activeChild?.id;
      if (enquiryId) {
        const data = await getFeeDues(enquiryId);
        setFees(Array.isArray(data) ? data : []);
      } else {
        setFees([]);
      }
    } catch { setFees([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [activeChild?.id]);

  // For each fee:
  //   remaining = amount − discount_amount − paid_amount
  //   This is what the parent still owes
  const remaining = (f: any) =>
    Math.max(0, (f.amount || 0) - (f.discount_amount || 0) - (f.paid_amount || 0));

  // "Due" = fees that still have a remaining balance
  const due     = fees.filter(f => remaining(f) > 0);
  // "Paid" = fees fully paid/waived OR any fee that has a partial payment recorded
  const history = fees.filter(f => f.status === "paid" || f.status === "waived" || (f.paid_amount > 0));

  const totalDue  = due.reduce((s, f) => s + remaining(f), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.paid_amount || 0) + (f.discount_amount || 0), 0);

  const feeName = (f: any) =>
    f.fee_structures?.name || f.period_label || f.fee_type || "Fee";

  const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}
    >
      <Text style={s.pageTitle}>Fees</Text>

      {/* Child banner */}
      {activeChild && (
        <View style={s.childBanner}>
          {activeChild.photo_url ? (
            <Image source={{ uri: activeChild.photo_url }} style={s.bannerPhoto} />
          ) : (
            <View style={s.bannerAvt}>
              <Text style={s.bannerAvtTxt}>{(activeChild.name || "?")[0].toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text style={s.bannerName}>{activeChild.name}</Text>
            <Text style={s.bannerClass}>{activeChild.class}</Text>
          </View>
        </View>
      )}

      {/* Summary strip */}
      {fees.length > 0 && (
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { borderColor: COLORS.error + "50" }]}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={[s.summaryAmt, { color: COLORS.error }]}>
              ₹ {totalDue.toLocaleString("en-IN")}
            </Text>
            <Text style={s.summaryLabel}>Balance Due</Text>
          </View>
          <View style={[s.summaryCard, { borderColor: COLORS.success + "50" }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
            <Text style={[s.summaryAmt, { color: COLORS.success }]}>
              ₹ {totalPaid.toLocaleString("en-IN")}
            </Text>
            <Text style={s.summaryLabel}>Paid + Discounts</Text>
          </View>
        </View>
      )}

      {/* ── Due / Pending ── */}
      {due.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Balance Due</Text>
          {due.map((f: any) => {
            const sc   = STATUS_COLOR[f.status] || STATUS_COLOR.pending;
            const bal  = remaining(f);
            return (
              <View key={f.id} style={s.card}>
                <View style={s.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.feeName}>{feeName(f)}</Text>
                    <Text style={s.metaTxt}>Due: {fmtDate(f.due_date)}</Text>
                    {f.receipt_no && <Text style={s.metaTxt}>Ref: {f.receipt_no}</Text>}

                    {/* Show fee breakdown if discounts / partial payments exist */}
                    {(f.discount_amount > 0 || f.paid_amount > 0) && (
                      <View style={s.breakdownBox}>
                        <Text style={s.breakdownRow}>
                          Fee total:{"  "}
                          <Text style={{ fontWeight: "700" }}>₹ {(f.amount||0).toLocaleString("en-IN")}</Text>
                        </Text>
                        {f.discount_amount > 0 && (
                          <Text style={[s.breakdownRow, { color: COLORS.success }]}>
                            Discount:{"  "}-₹ {f.discount_amount.toLocaleString("en-IN")}
                          </Text>
                        )}
                        {f.paid_amount > 0 && (
                          <Text style={[s.breakdownRow, { color: COLORS.edu }]}>
                            Already paid:{"  "}-₹ {f.paid_amount.toLocaleString("en-IN")}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={s.amountCol}>
                    <Text style={s.amount}>₹ {bal.toLocaleString("en-IN")}</Text>
                    <Text style={s.amountSub}>remaining</Text>
                    <View style={[s.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.badgeTxt, { color: sc.text }]}>
                        {f.status === "partial" ? "PARTIAL" : f.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.payBtn}
                  onPress={() => Alert.alert(
                    "Pay Now",
                    `Balance: ₹ ${bal.toLocaleString("en-IN")}\n\nOnline payment coming soon.\nPlease pay at the school office and the receipt will be updated here.`
                  )}
                >
                  <Ionicons name="card-outline" size={15} color="#fff" />
                  <Text style={s.payBtnTxt}>Pay Now</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}

      {/* ── Payment History ── */}
      {history.length > 0 && (
        <>
          <Text style={[s.sectionLabel, { marginTop: 24 }]}>Payment History</Text>
          {history.map((f: any) => {
            const sc = f.status === "waived"
              ? STATUS_COLOR.waived
              : STATUS_COLOR.paid;
            const paidAmt    = f.paid_amount    || 0;
            const discountAmt = f.discount_amount || 0;
            return (
              <View key={`h-${f.id}`} style={[s.card, s.paidCard]}>
                <View style={s.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.feeName}>{feeName(f)}</Text>
                    {f.paid_at && (
                      <Text style={s.metaTxt}>
                        Paid on: {fmtDate(f.paid_at)}
                      </Text>
                    )}
                    {f.payment_mode && (
                      <Text style={s.metaTxt}>Mode: {f.payment_mode}</Text>
                    )}
                    {f.receipt_no && (
                      <Text style={[s.metaTxt, { color: COLORS.edu, fontWeight: "700" }]}>
                        Receipt: {f.receipt_no}
                      </Text>
                    )}
                    {f.notes && <Text style={s.metaTxt}>{f.notes}</Text>}
                  </View>
                  <View style={s.amountCol}>
                    {paidAmt > 0 && (
                      <Text style={[s.amount, { color: COLORS.success }]}>
                        ₹ {paidAmt.toLocaleString("en-IN")}
                      </Text>
                    )}
                    {discountAmt > 0 && (
                      <Text style={[s.discountLine]}>
                        Disc: ₹ {discountAmt.toLocaleString("en-IN")}
                      </Text>
                    )}
                    <View style={[s.badge, { backgroundColor: sc.bg, marginTop: 4 }]}>
                      <Text style={[s.badgeTxt, { color: sc.text }]}>
                        {f.status === "partial" ? "PARTIAL PAID" : f.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* All clear */}
      {fees.length > 0 && due.length === 0 && (
        <View style={s.allClearCard}>
          <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
          <Text style={s.allClearTxt}>All fees paid! 🎉</Text>
        </View>
      )}

      {/* No data */}
      {fees.length === 0 && (
        <View style={s.emptyCard}>
          <Ionicons name="receipt-outline" size={40} color={COLORS.mid} />
          <Text style={s.emptyTxt}>No Fee Records</Text>
          <Text style={s.emptySubTxt}>
            No fees have been assigned yet. Contact the school if you think this is incorrect.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  content:       { padding: 20, paddingBottom: 50 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:     { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },

  childBanner:   { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.eduLight,
                   borderRadius: 14, padding: 12, marginBottom: 16, gap: 12,
                   borderWidth: 1, borderColor: COLORS.edu + "40" },
  bannerPhoto:   { width: 40, height: 40, borderRadius: 20 },
  bannerAvt:     { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.edu,
                   alignItems: "center", justifyContent: "center" },
  bannerAvtTxt:  { fontSize: 16, fontWeight: "800", color: "#fff" },
  bannerName:    { fontSize: 14, fontWeight: "800", color: COLORS.dark },
  bannerClass:   { fontSize: 12, color: COLORS.mid, marginTop: 1 },

  summaryRow:    { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryCard:   { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 14,
                   alignItems: "center", borderWidth: 1.5, gap: 3 },
  summaryAmt:    { fontSize: 20, fontWeight: "900" },
  summaryLabel:  { fontSize: 10, color: COLORS.mid, fontWeight: "600" },

  sectionLabel:  { fontSize: 11, fontWeight: "700", color: COLORS.mid,
                   textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },

  card:          { backgroundColor: "#fff", borderRadius: 16, padding: 16,
                   marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  paidCard:      { borderColor: COLORS.success + "40", backgroundColor: "#F0FDF4" },
  cardRow:       { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  feeName:       { fontSize: 15, fontWeight: "700", color: COLORS.dark, marginBottom: 4 },
  metaTxt:       { fontSize: 12, color: COLORS.mid, marginTop: 2 },

  breakdownBox:  { marginTop: 8, backgroundColor: COLORS.bg, borderRadius: 8,
                   padding: 8, borderWidth: 1, borderColor: COLORS.border },
  breakdownRow:  { fontSize: 12, color: COLORS.mid, marginBottom: 2 },

  amountCol:     { alignItems: "flex-end", marginLeft: 12 },
  amount:        { fontSize: 20, fontWeight: "900", color: COLORS.dark },
  amountSub:     { fontSize: 10, color: COLORS.mid, marginTop: 1 },
  discountLine:  { fontSize: 12, color: COLORS.success, fontWeight: "700", marginTop: 2 },
  badge:         { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  badgeTxt:      { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },

  payBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center",
                   gap: 6, backgroundColor: COLORS.edu, borderRadius: 10, padding: 10 },
  payBtnTxt:     { color: "#fff", fontSize: 14, fontWeight: "700" },

  allClearCard:  { alignItems: "center", gap: 8, padding: 24, backgroundColor: "#F0FDF4",
                   borderRadius: 16, borderWidth: 1, borderColor: COLORS.success + "40", marginTop: 16 },
  allClearTxt:   { fontSize: 15, fontWeight: "700", color: COLORS.success },

  emptyCard:     { alignItems: "center", padding: 40, backgroundColor: "#fff",
                   borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 20, gap: 8 },
  emptyTxt:      { fontSize: 16, fontWeight: "700", color: COLORS.dark },
  emptySubTxt:   { fontSize: 13, color: COLORS.mid, textAlign: "center", lineHeight: 20 },
});
