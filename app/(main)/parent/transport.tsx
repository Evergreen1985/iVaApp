import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS, EDU_API } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { supabase } from "../../../src/lib/supabase";
import { getChildTransportOptIn, getChildRideLogs } from "../../../src/lib/api";

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  boarded: { label: "Boarded",  color: COLORS.edu,     icon: "checkmark-circle" },
  dropped:  { label: "Dropped",  color: COLORS.primary, icon: "flag"            },
  absent:   { label: "Absent",   color: COLORS.error,   icon: "close-circle"    },
};

interface BusLocation {
  lat:       number;
  lng:       number;
  route:     string;
  sharedBy:  string;
  updatedAt: string;
}

function buildLeafletHtml(lat: number, lng: number) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  body,html{margin:0;padding:0;height:100%;width:100%;}
  #map{height:100%;width:100%;}
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${lat}, ${lng}], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  var icon = L.divIcon({ html: '<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚌</div>', iconSize:[40,40], iconAnchor:[20,20], className:'' });
  var marker = L.marker([${lat}, ${lng}], { icon: icon }).addTo(map);
  window.updateBus = function(lat, lng) {
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], 15);
  };
</script>
</body>
</html>`;
}

export default function ParentTransport() {
  const { t } = useTranslation();
  const { session } = useSession();
  const phone = session?.phone || "";

  const today = new Date().toISOString().slice(0, 10);

  const [children, setChildren]     = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [optIn, setOptIn]           = useState<any>(null);
  const [rideLogs, setRideLogs]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refresh, setRefresh]       = useState(false);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);

  const webViewRef = useRef<WebView>(null);
  const prevBus    = useRef<BusLocation | null>(null);

  const child   = children[selectedIdx] || null;
  const childId = child?.id || "";

  // Load children by phone number directly (session.children is never populated)
  const loadChildren = useCallback(async () => {
    if (!phone) return;
    const digits  = phone.replace(/\D/g, "");
    const phone10  = digits.slice(-10);
    const phone12  = `91${phone10}`;
    const phoneP12 = `+91${phone10}`;
    try {
      const { data } = await supabase
        .from("enquiries")
        .select("id,child_name,section_id,section_name")
        .or(`phone.eq.${phone10},phone.eq.${phone12},phone.eq.${phoneP12}`)
        .order("created_at", { ascending: false });
      setChildren(data || []);
    } catch { setChildren([]); }
  }, [phone]);

  const loadLocation = useCallback(async () => {
    try {
      const res  = await fetch(`${EDU_API}/api/transport/location`);
      const data = await res.json();
      const active = (data.locations || []).find((l: any) => l.latitude && l.latitude !== 0);
      if (active) {
        const loc: BusLocation = {
          lat:       active.latitude,
          lng:       active.longitude,
          route:     active.route_id === "route_afternoon" ? "Afternoon" : "Morning",
          sharedBy:  active.shared_by || "",
          updatedAt: active.updated_at || "",
        };
        setBusLocation(loc);
        if (prevBus.current && webViewRef.current) {
          webViewRef.current.injectJavaScript(`updateBus(${loc.lat}, ${loc.lng}); true;`);
        }
        prevBus.current = loc;
      } else {
        setBusLocation(null);
        prevBus.current = null;
      }
    } catch { setBusLocation(null); }
  }, []);

  const loadChildData = useCallback(async (id: string, isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefresh(true);
    try {
      const [oData, rData] = await Promise.all([
        getChildTransportOptIn(id),
        getChildRideLogs(today, id),
      ]);
      setOptIn(oData.opt_in || null);
      setRideLogs(rData.ride_logs || []);
    } catch {
      setOptIn(null); setRideLogs([]);
    }
    if (isRefresh) setRefresh(false);
  }, [today]);

  useEffect(() => {
    (async () => {
      await loadChildren();
      setLoading(false);
    })();
  }, [loadChildren]);

  useEffect(() => {
    if (childId) loadChildData(childId);
    else { setOptIn(null); setRideLogs([]); }
  }, [childId, loadChildData]);

  useEffect(() => {
    loadLocation();
    const interval = setInterval(loadLocation, 5000);
    return () => clearInterval(interval);
  }, [loadLocation]);

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

  const morningLog   = rideLogs.find((r) => r.route_id === "route_morning");
  const afternoonLog = rideLogs.find((r) => r.route_id === "route_afternoon");

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refresh}
          onRefresh={async () => {
            setRefresh(true);
            await Promise.all([loadChildren(), loadLocation()]);
            if (childId) await loadChildData(childId);
            setRefresh(false);
          }}
          tintColor={COLORS.edu}
        />
      }
    >
      <Text style={s.pageTitle}>{t("transport")}</Text>
      <Text style={s.dateLabel}>
        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      </Text>

      {/* ── Live bus map — always visible ── */}
      {busLocation ? (
        <View style={s.mapCard}>
          <View style={s.mapHeader}>
            <View style={s.liveDot} />
            <Text style={s.liveTitle}>Bus Location Live</Text>
            <Text style={s.liveRoute}>{busLocation.route} route</Text>
            {busLocation.sharedBy ? (
              <View style={s.sharedByBadge}>
                <Text style={s.sharedByTxt}>📡 {busLocation.sharedBy}</Text>
              </View>
            ) : null}
          </View>
          <WebView
            ref={webViewRef}
            source={{ html: buildLeafletHtml(busLocation.lat, busLocation.lng) }}
            style={s.map}
            scrollEnabled={false}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
          />
          <TouchableOpacity
            style={s.gmapsBtn}
            onPress={() => Linking.openURL(`https://www.google.com/maps?q=${busLocation.lat},${busLocation.lng}`)}
            activeOpacity={0.8}
          >
            <Text style={s.gmapsTxt}>Open in Google Maps ↗</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.noMapCard}>
          <Ionicons name="bus-outline" size={28} color={COLORS.mid} />
          <Text style={s.noMapTxt}>Bus is not currently sharing location</Text>
        </View>
      )}

      {/* ── No children found ── */}
      {children.length === 0 ? (
        <View style={s.noChildCard}>
          <Ionicons name="person-outline" size={24} color={COLORS.mid} />
          <Text style={s.noChildTxt}>No child linked to your account. Contact the school to link your child.</Text>
        </View>
      ) : (
        <>
          {/* Child selector for multi-child families */}
          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {children.map((c, i) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.childPill, selectedIdx === i && s.childPillActive]}
                    onPress={() => setSelectedIdx(i)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.childPillTxt, selectedIdx === i && s.childPillTxtActive]}>
                      {c.child_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Enrollment status */}
          <View style={[s.enrollCard, optIn ? s.enrollCardActive : s.enrollCardInactive]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.enrollTitle, { color: optIn ? COLORS.edu : COLORS.mid }]}>
                {optIn ? "Enrolled in Transport" : "Not Enrolled"}
              </Text>
              {optIn ? (
                <>
                  {optIn.pickup_stop && <Text style={s.enrollDetail}>Pickup: {optIn.pickup_stop}</Text>}
                  {optIn.drop_stop   && <Text style={s.enrollDetail}>Drop: {optIn.drop_stop}</Text>}
                  {optIn.van_number  && <Text style={s.enrollDetail}>Van: {optIn.van_number}</Text>}
                </>
              ) : (
                <Text style={s.enrollDetail}>
                  {child?.child_name || "Your child"} is not currently using school transport
                </Text>
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
                { label: "Morning Pickup",  log: morningLog,   icon: "sunny-outline" },
                { label: "Afternoon Drop",  log: afternoonLog, icon: "moon-outline"  },
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
        </>
      )}

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
  mapCard:            { borderRadius: 18, overflow: "hidden", marginBottom: 16, borderWidth: 1.5, borderColor: "rgba(23,143,120,0.4)" },
  mapHeader:          { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EEF8F6", padding: 12 },
  liveDot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.edu },
  liveTitle:          { fontSize: 13, fontWeight: "800", color: COLORS.edu },
  liveRoute:          { fontSize: 12, color: COLORS.mid },
  sharedByBadge:      { marginLeft: "auto" as any, backgroundColor: "rgba(23,143,120,0.12)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  sharedByTxt:        { fontSize: 11, fontWeight: "700", color: COLORS.edu },
  map:                { width: "100%", height: 240 },
  gmapsBtn:           { backgroundColor: "#FAFAF8", borderTopWidth: 1, borderTopColor: COLORS.border, padding: 10, alignItems: "flex-end" },
  gmapsTxt:           { fontSize: 12, fontWeight: "700", color: COLORS.edu },
  noMapCard:          { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  noMapTxt:           { fontSize: 13, color: COLORS.mid },
  noChildCard:        { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  noChildTxt:         { flex: 1, fontSize: 13, color: COLORS.mid, lineHeight: 20 },
  childPill:          { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderWidth: 1.5, borderColor: COLORS.border },
  childPillActive:    { backgroundColor: COLORS.edu, borderColor: COLORS.edu },
  childPillTxt:       { fontSize: 13, fontWeight: "700", color: COLORS.dark },
  childPillTxtActive: { color: "#fff" },
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
});
