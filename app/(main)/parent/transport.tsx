import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { getChildTransportOptIn, getChildRideLogs, enrollTransport } from "../../../src/lib/api";

const ROUTES = [
  { id: "route_morning",   label: "Morning",   icon: "sunny-outline"  },
  { id: "route_afternoon", label: "Afternoon", icon: "moon-outline"   },
];

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  boarded: { label: "Boarded",  color: COLORS.edu,   icon: "checkmark-circle" },
  dropped:  { label: "Dropped",  color: COLORS.primary, icon: "flag"          },
  absent:   { label: "Absent",   color: COLORS.error,   icon: "close-circle"  },
};

export default function ParentTransport() {
  const { t } = useTranslation();
  const { session } = useSession();
  const child = session?.children?.[0];
  const childId = child?.id || child?.enquiry_id || "";

  const today = new Date().toISOString().slice(0, 10);
  const [routeId, setRouteId]   = useState("route_morning");
  const [optIn, setOptIn]       = useState<any>(null);
  const [rideLogs, setRideLogs] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!childId) { setLoading(false); return; }
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const [oData, rData] = await Promise.all([
        getChildTransportOptIn(childId),
        getChildRideLogs(today, childId),
      ]);
      setOptIn(oData.opt_in || null);
      setRideLogs(rData.ride_logs || []);
    } catch {
      setOptIn(null); setRideLogs([]);
    }
    if (isRefresh) setRefresh(false); else setLoading(false);
  }, [childId, today]);

  useEffect(() => { load(); }, [load]);

  const handleEnroll = () => {
    Alert.alert(
      "Enroll in Transport",
      "To enroll your child in the school transport service, please contact the school office. Staff will set up your pickup and drop stops.",
      [{ text: "OK" }]
    );
  };

  const handleUnenroll = () => {
    Alert.alert(
      "Unenroll from Transport",
      "To unenroll from transport, please contact the school office.",
      [{ text: "OK" }]
    );
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;
  }

  if (!childId) {
    return (
      <View style={s.center}>
        <Ionicons name="bus-outline" size={48} color={COLORS.mid} />
        <Text style={s.emptyTxt}>No child linked to your account</Text>
      </View>
    );
  }

  const morningLog   = rideLogs.find((r) => r.route_id === "route_morning");
  const afternoonLog = rideLogs.find((r) => r.route_id === "route_afternoon");

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}
    >
      <Text style={s.pageTitle}>{t("transport")}</Text>
      <Text style={s.dateLabel}>
        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      </Text>

      {/* Enrollment status */}
      <View style={[s.enrollCard, optIn ? s.enrollCardActive : s.enrollCardInactive]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.enrollTitle, { color: optIn ? COLORS.edu : COLORS.mid }]}>
            {optIn ? "Enrolled in Transport" : "Not Enrolled"}
          </Text>
          {optIn ? (
            <>
              {optIn.pickup_stop  && <Text style={s.enrollDetail}>Pickup: {optIn.pickup_stop}</Text>}
              {optIn.drop_stop    && <Text style={s.enrollDetail}>Drop: {optIn.drop_stop}</Text>}
              {optIn.van_number   && <Text style={s.enrollDetail}>Van: {optIn.van_number}</Text>}
            </>
          ) : (
            <Text style={s.enrollDetail}>Your child is not currently using school transport</Text>
          )}
        </View>
        <Ionicons
          name={optIn ? "bus" : "bus-outline"}
          size={32}
          color={optIn ? COLORS.edu : COLORS.mid}
        />
      </View>

      {optIn
        ? (
          <TouchableOpacity style={s.unenrollBtn} onPress={handleUnenroll} activeOpacity={0.7}>
            <Text style={s.unenrollTxt}>Contact school to unenroll</Text>
          </TouchableOpacity>
        )
        : (
          <TouchableOpacity style={s.enrollBtn} onPress={handleEnroll} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={s.enrollBtnTxt}>Enroll in Transport</Text>
          </TouchableOpacity>
        )
      }

      {/* Today's ride status */}
      {optIn && (
        <>
          <Text style={s.sectionLabel}>TODAY'S RIDE STATUS</Text>
          {[
            { label: "Morning Pickup",    log: morningLog,   icon: "sunny-outline"  },
            { label: "Afternoon Drop",    log: afternoonLog, icon: "moon-outline"   },
          ].map(({ label, log, icon }) => {
            const meta = log?.status ? STATUS_META[log.status] : null;
            return (
              <View key={label} style={s.rideCard}>
                <View style={s.rideLeft}>
                  <Ionicons name={icon as any} size={20} color={COLORS.edu} />
                  <View>
                    <Text style={s.rideLabel}>{label}</Text>
                    {log?.checkin_time  && <Text style={s.rideTime}>Time: {log.checkin_time}</Text>}
                    {log?.checkout_time && <Text style={s.rideTime}>Time: {log.checkout_time}</Text>}
                  </View>
                </View>
                {meta
                  ? (
                    <View style={[s.statusBadge, { backgroundColor: meta.color + "20", borderColor: meta.color + "40" }]}>
                      <Ionicons name={meta.icon as any} size={14} color={meta.color} />
                      <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  )
                  : (
                    <View style={s.pendingBadge}>
                      <Text style={s.pendingTxt}>Pending</Text>
                    </View>
                  )
                }
              </View>
            );
          })}
        </>
      )}

      {/* Info note */}
      <View style={s.noteCard}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.mid} />
        <Text style={s.noteTxt}>
          Ride status is updated by staff in real time. Pull down to refresh for the latest.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: COLORS.bg },
  content:            { padding: 16, paddingBottom: 50 },
  center:             { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg, gap: 12 },
  pageTitle:          { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  dateLabel:          { fontSize: 12, color: COLORS.mid, marginTop: 2, marginBottom: 20 },
  enrollCard:         { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1.5 },
  enrollCardActive:   { backgroundColor: "#EEF8F6", borderColor: "rgba(23,143,120,0.3)" },
  enrollCardInactive: { backgroundColor: "#fff", borderColor: COLORS.border },
  enrollTitle:        { fontSize: 15, fontWeight: "800", marginBottom: 6 },
  enrollDetail:       { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  enrollBtn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.edu, borderRadius: 14, padding: 14, marginBottom: 24 },
  enrollBtnTxt:       { fontSize: 14, fontWeight: "700", color: "#fff" },
  unenrollBtn:        { alignItems: "center", marginBottom: 24 },
  unenrollTxt:        { fontSize: 12, color: COLORS.mid, textDecorationLine: "underline" },
  sectionLabel:       { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  rideCard:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  rideLeft:           { flexDirection: "row", alignItems: "center", gap: 12 },
  rideLabel:          { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  rideTime:           { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  statusBadge:        { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  statusTxt:          { fontSize: 12, fontWeight: "700" },
  pendingBadge:       { backgroundColor: "#F5F5F5", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.border },
  pendingTxt:         { fontSize: 12, color: COLORS.mid, fontWeight: "600" },
  noteCard:           { flexDirection: "row", gap: 8, backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginTop: 8 },
  noteTxt:            { flex: 1, fontSize: 12, color: COLORS.mid, lineHeight: 18 },
  emptyTxt:           { fontSize: 14, color: COLORS.mid },
});
