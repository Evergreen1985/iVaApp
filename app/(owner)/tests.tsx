import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { useSession } from "../../src/store/session";

const EDU_API = "https://evergreenprepschools.com";

const TEST_SUITES = [
  { key: "api",        label: "API Health",       icon: "server-outline",        color: COLORS.primary },
  { key: "auth",       label: "Auth Flow",         icon: "lock-closed-outline",   color: "#7C3AED" },
  { key: "fees",       label: "Fee Calculations",  icon: "card-outline",          color: COLORS.orange },
  { key: "attendance", label: "Attendance Logic",  icon: "checkmark-circle-outline", color: COLORS.edu },
  { key: "notify",     label: "Notifications",     icon: "notifications-outline", color: "#0891B2" },
];

type TestResult = { suite: string; status: "pass"|"fail"|"skip"; message: string; duration: number };

export default function OwnerTests() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [running, setRunning]   = useState(false);
  const [results, setResults]   = useState<TestResult[]>([]);
  const [activeSuite, setActiveSuite] = useState<string|null>(null);

  const runSuite = async (suite: string) => {
    setActiveSuite(suite);
    setRunning(true);
    const start = Date.now();
    try {
      const res = await fetch(`${EDU_API}/api/owner/tests?suite=${suite}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      const duration = Date.now() - start;
      const newResults: TestResult[] = Array.isArray(data?.results)
        ? data.results.map((r: any) => ({ suite, status: r.status || "pass", message: r.message || r.test, duration }))
        : [{ suite, status: res.ok ? "pass" : "fail", message: data?.message || "Completed", duration }];
      setResults(prev => [...prev.filter(r => r.suite !== suite), ...newResults]);
    } catch (e: any) {
      setResults(prev => [...prev.filter(r => r.suite !== suite),
        { suite, status: "fail", message: e.message || "Network error", duration: Date.now() - start }]);
    }
    setActiveSuite(null);
    setRunning(false);
  };

  const runAll = async () => {
    setResults([]);
    for (const suite of TEST_SUITES) await runSuite(suite.key);
  };

  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail").length;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Test Runner</Text>
        <TouchableOpacity style={[s.runAllBtn, running && { opacity: 0.6 }]} onPress={runAll} disabled={running}>
          <Text style={s.runAllTxt}>Run All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {results.length > 0 && (
          <View style={s.summaryRow}>
            <View style={[s.sumCard, { borderColor: COLORS.success }]}>
              <Text style={[s.sumVal, { color: COLORS.success }]}>{passed}</Text>
              <Text style={s.sumLabel}>Passed</Text>
            </View>
            <View style={[s.sumCard, { borderColor: COLORS.error }]}>
              <Text style={[s.sumVal, { color: COLORS.error }]}>{failed}</Text>
              <Text style={s.sumLabel}>Failed</Text>
            </View>
            <View style={[s.sumCard, { borderColor: COLORS.mid }]}>
              <Text style={[s.sumVal, { color: COLORS.mid }]}>{TEST_SUITES.length - passed - failed}</Text>
              <Text style={s.sumLabel}>Pending</Text>
            </View>
          </View>
        )}

        {TEST_SUITES.map(suite => {
          const suiteResults = results.filter(r => r.suite === suite.key);
          const isRunning    = activeSuite === suite.key;
          const allPass      = suiteResults.length > 0 && suiteResults.every(r => r.status === "pass");
          const anyFail      = suiteResults.some(r => r.status === "fail");
          return (
            <View key={suite.key} style={s.suiteCard}>
              <View style={s.suiteHeader}>
                <View style={[s.suiteIcon, { backgroundColor: suite.color + "18" }]}>
                  <Ionicons name={suite.icon as any} size={20} color={suite.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.suiteName}>{suite.label}</Text>
                  {suiteResults.length > 0 && !isRunning && (
                    <Text style={[s.suiteStatus, { color: anyFail ? COLORS.error : COLORS.success }]}>
                      {anyFail ? `${suiteResults.filter(r=>r.status==="fail").length} failed` : `${suiteResults.length} passed`} · {suiteResults[0]?.duration}ms
                    </Text>
                  )}
                </View>
                {isRunning ? <ActivityIndicator color={suite.color} /> : (
                  <TouchableOpacity style={[s.runBtn, { borderColor: suite.color }]}
                    onPress={() => runSuite(suite.key)} disabled={running}>
                    <Ionicons name="play" size={14} color={suite.color} />
                  </TouchableOpacity>
                )}
                {!isRunning && suiteResults.length > 0 && (
                  <Ionicons name={allPass ? "checkmark-circle" : "close-circle"} size={22}
                    color={allPass ? COLORS.success : COLORS.error} style={{ marginLeft: 8 }} />
                )}
              </View>
              {suiteResults.map((r, i) => (
                <View key={i} style={s.testRow}>
                  <Ionicons name={r.status === "pass" ? "checkmark" : "close"} size={14}
                    color={r.status === "pass" ? COLORS.success : COLORS.error} />
                  <Text style={s.testMsg}>{r.message}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  header:      { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:        { marginRight: 12 },
  title:       { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  runAllBtn:   { backgroundColor: COLORS.mid, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  runAllTxt:   { color: "#fff", fontWeight: "700", fontSize: 12 },
  content:     { padding: 16, gap: 12, paddingBottom: 40 },
  summaryRow:  { flexDirection: "row", gap: 10 },
  sumCard:     { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 2 },
  sumVal:      { fontSize: 20, fontWeight: "900" },
  sumLabel:    { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  suiteCard:   { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  suiteHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  suiteIcon:   { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  suiteName:   { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  suiteStatus: { fontSize: 12, marginTop: 2 },
  runBtn:      { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  testRow:     { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  testMsg:     { fontSize: 12, color: COLORS.mid, flex: 1 },
});
