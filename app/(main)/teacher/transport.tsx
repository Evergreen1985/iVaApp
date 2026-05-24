import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { getTransportOptIns, getRideLogs, markRideStatus } from "../../../src/lib/api";

const ROUTES = [
  { id: "route_morning",   label: "Morning", icon: "sunny-outline" },
  { id: "route_afternoon", label: "Afternoon", icon: "moon-outline" },
];

const STATUS_OPTS = [
  { key: "boarded", label: "Boarded", color: COLORS.edu },
  { key: "dropped", label: "Dropped", color: COLORS.primary },
  { key: "absent",  label: "Absent",  color: COLORS.error },
];

export default function TeacherTransport() {
  const { t } = useTranslation();
  const { session } = useSession();

  const today = new Date().toISOString().slice(0, 10);
  const [routeId, setRouteId]   = useState("route_morning");
  const [optIns, setOptIns]     = useState<any[]>([]);
  const [rideLogs, setRideLogs] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [saving, setSaving]     = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const [oData, rData] = await Promise.all([
        getTransportOptIns(today),
        getRideLogs(today, routeId),
      ]);
      setOptIns(oData.opt_ins || []);
      setRideLogs(rData.ride_logs || []);
    } catch {
      setOptIns([]); setRideLogs([]);
    }
    if (isRefresh) setRefresh(false); else setLoading(false);
  }, [routeId, today]);

  useEffect(() => { load(); }, [load]);

  const rideMap: Record<string, any> = Object.fromEntries(
    rideLogs.map((r) => [r.child_id, r])
  );

  const handleMark = async (child: any, status: string) => {
    setSaving(child.child_id);
    try {
      await markRideStatus({
        child_id:    child.child_id,
        child_name:  child.child_name,
        date:        today,
        route_id:    routeId,
        status,
        checked_by:  session?.name,
        checkin_time: status === "boarded" ? new Date().toTimeString().slice(0, 5) : undefined,
        checkout_time: status === "dropped" ? new Date().toTimeString().slice(0, 5) : undefined,
      });
      setRideLogs((prev) => {
        const exists = prev.find((r) => r.child_id === child.child_id);
        if (exists) return prev.map((r) => r.child_id === child.child_id ? { ...r, status } : r);
        return [...prev, { child_id: child.child_id, status }];
      });
    } catch {}
    setSaving(null);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
    >
      <Text style={s.pageTitle}>{t("transport")}</Text>
      <Text style={s.dateLabel}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</Text>

      {/* Route toggle */}
      <View style={s.routeRow}>
        {ROUTES.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[s.routeBtn, routeId === r.id && s.routeBtnActive]}
            onPress={() => setRouteId(r.id)}
            activeOpacity={0.7}
          >
            <Ionicons name={r.icon as any} size={16} color={routeId === r.id ? "#fff" : COLORS.mid} />
            <Text style={[s.routeTxt, routeId === r.id && s.routeTxtActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statVal}>{optIns.length}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statVal, { color: COLORS.edu }]}>
            {rideLogs.filter((r) => r.status === "boarded").length}
          </Text>
          <Text style={s.statLabel}>Boarded</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statVal, { color: COLORS.primary }]}>
            {rideLogs.filter((r) => r.status === "dropped").length}
          </Text>
          <Text style={s.statLabel}>Dropped</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statVal, { color: COLORS.error }]}>
            {rideLogs.filter((r) => r.status === "absent").length}
          </Text>
          <Text style={s.statLabel}>Absent</Text>
        </View>
      </View>

      {/* Roster */}
      {optIns.length === 0
        ? (
          <View style={s.emptyBox}>
            <Ionicons name="bus-outline" size={48} color={COLORS.mid} />
            <Text style={s.emptyTxt}>No students opted in for today</Text>
          </View>
        )
        : optIns.map((child: any) => {
            const log    = rideMap[child.child_id];
            const status = log?.status;
            return (
              <View key={child.child_id} style={s.childCard}>
                <View style={s.childInfo}>
                  <View style={s.avatar}>
                    <Text style={s.avatarTxt}>{(child.child_name || "?")[0].toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={s.childName}>{child.child_name}</Text>
                    <Text style={s.childMeta}>
                      {routeId === "route_morning"
                        ? `Stop: ${child.pickup_stop || "—"}`
                        : `Stop: ${child.drop_stop || "—"}`}
                    </Text>
                  </View>
                </View>
                <View style={s.statusBtns}>
                  {STATUS_OPTS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[s.statusBtn, status === opt.key && { backgroundColor: opt.color, borderColor: opt.color }]}
                      onPress={() => handleMark(child, opt.key)}
                      disabled={saving === child.child_id}
                      activeOpacity={0.7}
                    >
                      {saving === child.child_id
                        ? <ActivityIndicator size="small" color={status === opt.key ? "#fff" : COLORS.mid} />
                        : <Text style={[s.statusTxt, status === opt.key && { color: "#fff" }]}>{opt.label}</Text>
                      }
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  content:       { padding: 16, paddingBottom: 50 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:     { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  dateLabel:     { fontSize: 12, color: COLORS.mid, marginTop: 2, marginBottom: 16 },
  routeRow:      { flexDirection: "row", gap: 10, marginBottom: 16 },
  routeBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, padding: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: COLORS.border },
  routeBtnActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  routeTxt:      { fontSize: 13, fontWeight: "700", color: COLORS.mid },
  routeTxtActive:{ color: "#fff" },
  statsRow:      { flexDirection: "row", gap: 8, marginBottom: 16 },
  stat:          { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  statVal:       { fontSize: 22, fontWeight: "900", color: COLORS.dark },
  statLabel:     { fontSize: 10, color: COLORS.mid, fontWeight: "600" },
  emptyBox:      { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyTxt:      { fontSize: 14, color: COLORS.mid },
  childCard:     { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  childInfo:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar:        { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarTxt:     { fontSize: 16, fontWeight: "800", color: "#fff" },
  childName:     { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  childMeta:     { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  statusBtns:    { flexDirection: "row", gap: 8 },
  statusBtn:     { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 10, paddingVertical: 8, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: "#fff" },
  statusTxt:     { fontSize: 11, fontWeight: "700", color: COLORS.mid },
});
