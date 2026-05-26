import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS, EDU_API } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { getTransportOptIns, getRideLogs, markRideStatus } from "../../../src/lib/api";

const ROUTES = [
  { id: "route_morning",   label: "Morning",   icon: "sunny-outline" },
  { id: "route_afternoon", label: "Afternoon", icon: "moon-outline"  },
];

const STATUS_OPTS = [
  { key: "boarded", label: "Boarded", color: COLORS.edu },
  { key: "dropped", label: "Dropped", color: COLORS.primary },
  { key: "absent",  label: "Absent",  color: COLORS.error },
];

function buildLeafletHtml(lat: number, lng: number) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body,html{margin:0;padding:0;height:100%;width:100%;}#map{height:100%;width:100%;}</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:true,attributionControl:false}).setView([${lat},${lng}],15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  var icon = L.divIcon({html:'<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚌</div>',iconSize:[40,40],iconAnchor:[20,20],className:''});
  var marker = L.marker([${lat},${lng}],{icon:icon}).addTo(map);
  window.updateBus = function(lat,lng){marker.setLatLng([lat,lng]);map.setView([lat,lng],15);};
</script>
</body>
</html>`;
}

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

  // Location sharing state
  const [activeLocation, setActiveLocation] = useState<{ route_id: string; shared_by?: string; latitude: number; longitude: number } | null>(null);
  const [sharing, setSharing]   = useState(false); // this teacher is currently sharing
  const [shareRoute, setShareRoute] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const pushInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPos = useRef<{ latitude: number; longitude: number } | null>(null);
  const stoppedRef = useRef(false); // guards against in-flight pushGps completing after stop
  const webViewRef = useRef<WebView>(null);
  const mapInitLat = useRef<number | null>(null);

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

  const pollFailCount = useRef(0);

  // Poll active location every 15 seconds
  const pollLocation = useCallback(async () => {
    try {
      const [mRes, aRes] = await Promise.all([
        fetch(`${EDU_API}/api/transport/location?route_id=route_morning`),
        fetch(`${EDU_API}/api/transport/location?route_id=route_afternoon`),
      ]);
      const [mData, aData] = await Promise.all([mRes.json(), aRes.json()]);
      const active = [...(mData.locations || []), ...(aData.locations || [])].find(
        (l: any) => l.latitude !== 0
      );
      pollFailCount.current = 0;
      setActiveLocation(active || null);
      if (active && mapInitLat.current !== null && webViewRef.current) {
        webViewRef.current.injectJavaScript(`updateBus(${active.latitude},${active.longitude}); true;`);
      }
    } catch {
      pollFailCount.current += 1;
      // After 2 consecutive failures, clear stale state so button reappears
      if (pollFailCount.current >= 2) setActiveLocation(null);
    }
  }, []);

  useEffect(() => {
    pollLocation();
    const interval = setInterval(pollLocation, 15000);
    return () => clearInterval(interval);
  }, [pollLocation]);

  // Push GPS to server every 10 seconds while sharing
  const pushGps = useCallback(async (routeIdToPush: string) => {
    if (!latestPos.current || stoppedRef.current) return;
    try {
      await fetch(`${EDU_API}/api/transport/location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_id:  routeIdToPush,
          latitude:  latestPos.current.latitude,
          longitude: latestPos.current.longitude,
          shared_by: session?.name || "Teacher",
        }),
      });
      pollLocation();
      if (latestPos.current && mapInitLat.current !== null && webViewRef.current) {
        webViewRef.current.injectJavaScript(`updateBus(${latestPos.current.latitude},${latestPos.current.longitude}); true;`);
      }
    } catch { }
  }, [session?.name, pollLocation]);

  const startSharing = async () => {
    stoppedRef.current = false;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow location access to share the bus position.");
      return;
    }

    setSharing(true);
    setShareRoute(routeId);

    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      (loc) => { latestPos.current = loc.coords; }
    );

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    latestPos.current = pos.coords;
    pushGps(routeId);

    pushInterval.current = setInterval(() => pushGps(routeId), 10000);
  };

  const stopSharing = async () => {
    stoppedRef.current = true; // block any in-flight pushGps from re-inserting after DELETE
    if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    if (pushInterval.current) { clearInterval(pushInterval.current); pushInterval.current = null; }
    latestPos.current = null;

    const routeToStop = shareRoute;

    // Clear UI immediately — do NOT re-poll (poll would find stale other-route rows)
    setSharing(false);
    setShareRoute(null);
    setActiveLocation(null);

    if (routeToStop) {
      try {
        // DELETE removes the row entirely — more reliable than PUT latitude=0
        await fetch(`${EDU_API}/api/transport/location?route_id=${routeToStop}`, { method: "DELETE" });
      } catch { }
    }
  };

  // Clean up on unmount
  useEffect(() => () => {
    if (watchRef.current) watchRef.current.remove();
    if (pushInterval.current) clearInterval(pushInterval.current);
  }, []);

  const rideMap: Record<string, any> = Object.fromEntries(
    rideLogs.map((r) => [r.child_id, r])
  );

  const handleMark = async (child: any, status: string) => {
    setSaving(child.child_id);
    try {
      await markRideStatus({
        child_id:     child.child_id,
        child_name:   child.child_name,
        date:         today,
        route_id:     routeId,
        status,
        checked_by:   session?.name,
        checkin_time:  status === "boarded" ? new Date().toTimeString().slice(0, 5) : undefined,
        checkout_time: status === "dropped" ? new Date().toTimeString().slice(0, 5) : undefined,
      });
      setRideLogs((prev) => {
        const exists = prev.find((r) => r.child_id === child.child_id);
        if (exists) return prev.map((r) => r.child_id === child.child_id ? { ...r, status } : r);
        return [...prev, { child_id: child.child_id, status }];
      });
    } catch { }
    setSaving(null);
  };

  // Derive sharing state from activeLocation
  const iAmSharing  = sharing;
  const elseSharing = !iAmSharing && !!activeLocation;
  const sharerName  = activeLocation?.shared_by;
  const sharingRoute = activeLocation?.route_id;

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

      {/* ── Location map card ── */}
      {(iAmSharing || elseSharing) && (() => {
        const mapLat = iAmSharing
          ? (latestPos.current?.latitude  ?? activeLocation?.latitude  ?? 0)
          : (activeLocation?.latitude  ?? 0);
        const mapLng = iAmSharing
          ? (latestPos.current?.longitude ?? activeLocation?.longitude ?? 0)
          : (activeLocation?.longitude ?? 0);
        if (!mapLat) return null;
        if (mapInitLat.current === null) mapInitLat.current = mapLat;
        return (
          <View style={s.mapCard}>
            <View style={[s.mapHeader, iAmSharing ? s.mapHeaderSharing : s.mapHeaderOther]}>
              <View style={[s.liveDot, { backgroundColor: iAmSharing ? COLORS.edu : COLORS.orange }]} />
              <Text style={[s.mapHeaderTxt, { color: iAmSharing ? COLORS.edu : COLORS.orange }]}>
                {iAmSharing
                  ? `Sharing • ${ROUTES.find((r) => r.id === shareRoute)?.label || shareRoute} route`
                  : `${sharerName || "Someone"} is sharing • ${ROUTES.find((r) => r.id === sharingRoute)?.label || sharingRoute} route`
                }
              </Text>
              {iAmSharing && (
                <TouchableOpacity style={s.stopBtnInline} onPress={stopSharing} activeOpacity={0.8}>
                  <Ionicons name="stop-circle" size={14} color="#fff" />
                  <Text style={s.stopBtnTxt}>Stop</Text>
                </TouchableOpacity>
              )}
            </View>
            <WebView
              ref={webViewRef}
              source={{ html: buildLeafletHtml(mapLat, mapLng) }}
              style={s.map}
              scrollEnabled={false}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={["*"]}
            />
            <TouchableOpacity
              style={s.gmapsBtn}
              onPress={() => Linking.openURL(`https://www.google.com/maps?q=${mapLat},${mapLng}`)}
              activeOpacity={0.8}
            >
              <Text style={s.gmapsTxt}>Open in Google Maps ↗</Text>
            </TouchableOpacity>
          </View>
        );
      })()}
      {!iAmSharing && !elseSharing && (
        <View style={s.sharePromptCard}>
          <Ionicons name="location-outline" size={20} color={COLORS.mid} />
          <View style={{ flex: 1 }}>
            <Text style={s.sharePromptTxt}>No one is sharing bus location</Text>
            <Text style={s.sharePromptSub}>Share your GPS so parents can track the bus</Text>
          </View>
        </View>
      )}

      {/* Share / take-over button */}
      {!iAmSharing && (
        <TouchableOpacity
          style={elseSharing ? s.takeoverBtn : s.shareBtn}
          onPress={async () => {
            // If someone else appears to be sharing, DELETE their row first to clear it
            if (elseSharing && activeLocation?.route_id) {
              try {
                await fetch(`${EDU_API}/api/transport/location?route_id=${activeLocation.route_id}`, { method: "DELETE" });
              } catch { }
              setActiveLocation(null);
            }
            startSharing();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="location" size={16} color="#fff" />
          <Text style={s.shareBtnTxt}>{elseSharing ? "Take over & Share My Location" : "Start Sharing Location"}</Text>
        </TouchableOpacity>
      )}

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
          <Text style={[s.statVal, { color: COLORS.edu }]}>{rideLogs.filter((r) => r.status === "boarded").length}</Text>
          <Text style={s.statLabel}>Boarded</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statVal, { color: COLORS.primary }]}>{rideLogs.filter((r) => r.status === "dropped").length}</Text>
          <Text style={s.statLabel}>Dropped</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statVal, { color: COLORS.error }]}>{rideLogs.filter((r) => r.status === "absent").length}</Text>
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
                      {routeId === "route_morning" ? `Pickup: ${child.pickup_stop || "—"}` : `Drop: ${child.drop_stop || "—"}`}
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
  root:              { flex: 1, backgroundColor: COLORS.bg },
  content:           { padding: 16, paddingBottom: 50 },
  center:            { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:         { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  dateLabel:         { fontSize: 12, color: COLORS.mid, marginTop: 2, marginBottom: 16 },
  // Location sharing
  mapCard:           { borderRadius: 18, overflow: "hidden", marginBottom: 12, borderWidth: 1.5, borderColor: "rgba(23,143,120,0.4)" },
  mapHeader:         { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  mapHeaderSharing:  { backgroundColor: "#EEF8F6" },
  mapHeaderOther:    { backgroundColor: "#FEF3C7" },
  liveDot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.edu },
  mapHeaderTxt:      { flex: 1, fontSize: 13, fontWeight: "700" },
  stopBtnInline:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.error, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  stopBtnTxt:        { fontSize: 12, fontWeight: "700", color: "#fff" },
  map:               { width: "100%", height: 220 },
  gmapsBtn:          { backgroundColor: "#FAFAF8", borderTopWidth: 1, borderTopColor: COLORS.border, padding: 10, alignItems: "flex-end" },
  gmapsTxt:          { fontSize: 12, fontWeight: "700", color: COLORS.edu },
  sharePromptCard:   { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  sharePromptTxt:    { fontSize: 13, fontWeight: "700", color: COLORS.dark },
  sharePromptSub:    { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  shareBtn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, padding: 13, marginBottom: 16 },
  takeoverBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.orange, borderRadius: 12, padding: 13, marginBottom: 16 },
  shareBtnTxt:       { fontSize: 14, fontWeight: "700", color: "#fff" },
  // Route toggle
  routeRow:          { flexDirection: "row", gap: 10, marginBottom: 16 },
  routeBtn:          { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, padding: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: COLORS.border },
  routeBtnActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  routeTxt:          { fontSize: 13, fontWeight: "700", color: COLORS.mid },
  routeTxtActive:    { color: "#fff" },
  // Stats
  statsRow:          { flexDirection: "row", gap: 8, marginBottom: 16 },
  stat:              { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  statVal:           { fontSize: 22, fontWeight: "900", color: COLORS.dark },
  statLabel:         { fontSize: 10, color: COLORS.mid, fontWeight: "600" },
  emptyBox:          { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyTxt:          { fontSize: 14, color: COLORS.mid },
  // Roster
  childCard:         { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  childInfo:         { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar:            { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarTxt:         { fontSize: 16, fontWeight: "800", color: "#fff" },
  childName:         { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  childMeta:         { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  statusBtns:        { flexDirection: "row", gap: 8 },
  statusBtn:         { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 10, paddingVertical: 8, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: "#fff" },
  statusTxt:         { fontSize: 11, fontWeight: "700", color: COLORS.mid },
});
