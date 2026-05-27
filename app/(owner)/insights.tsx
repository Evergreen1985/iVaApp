import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getOwnerInsights } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function OwnerInsights() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [insights, setInsights] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>("");
  const [loading, setLoading]   = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await getOwnerInsights(token);
      setInsights(res?.insights || res?.text || res?.analysis || JSON.stringify(res));
      setTimestamp(new Date().toLocaleString("en-IN"));
      setGenerated(true);
    } catch { setInsights("Failed to generate insights. Please try again."); setGenerated(true); }
    setLoading(false);
  };

  const paragraphs = insights.split("\n").filter(l => l.trim());

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>AI Insights</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroBanner}>
          <View style={s.heroIcon}>
            <Ionicons name="sparkles" size={32} color="#7C3AED" />
          </View>
          <Text style={s.heroTitle}>School Intelligence Report</Text>
          <Text style={s.heroDesc}>Powered by Claude AI — analyzes admissions, fees, attendance, expenses and staff data to generate actionable recommendations for your school.</Text>
          {!generated && (
            <TouchableOpacity style={[s.generateBtn, loading && { opacity: 0.6 }]} onPress={generate} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <>
                <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.generateTxt}>Generate Insights</Text>
              </>}
            </TouchableOpacity>
          )}
        </View>

        {loading && (
          <View style={s.loadingBox}>
            <ActivityIndicator color="#7C3AED" size="large" />
            <Text style={s.loadingTxt}>Claude AI is analyzing your school data...</Text>
            <Text style={s.loadingDesc}>This may take 10-20 seconds</Text>
          </View>
        )}

        {generated && !loading && (
          <View style={s.insightsBox}>
            <View style={s.insightsMeta}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={s.insightsTimestamp}>Generated at {timestamp}</Text>
              <TouchableOpacity onPress={generate} style={s.regenerateBtn}>
                <Ionicons name="refresh" size={14} color="#7C3AED" />
                <Text style={s.regenerateTxt}>Regenerate</Text>
              </TouchableOpacity>
            </View>
            {paragraphs.map((para, i) => {
              const isHeader = para.startsWith("##") || para.startsWith("**") || (para.length < 60 && para.endsWith(":"));
              return (
                <Text key={i} style={isHeader ? s.paraHeader : s.para}>{para.replace(/^##\s*/, "").replace(/\*\*/g, "")}</Text>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  header:        { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:          { marginRight: 12 },
  title:         { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  content:       { padding: 16, gap: 16, paddingBottom: 40 },
  heroBanner:    { backgroundColor: "#7C3AED12", borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#7C3AED30" },
  heroIcon:      { width: 64, height: 64, borderRadius: 20, backgroundColor: "#7C3AED18", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heroTitle:     { fontSize: 18, fontWeight: "800", color: COLORS.dark, textAlign: "center", marginBottom: 8 },
  heroDesc:      { fontSize: 13, color: COLORS.mid, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  generateBtn:   { backgroundColor: "#7C3AED", borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, flexDirection: "row", alignItems: "center" },
  generateTxt:   { color: "#fff", fontSize: 16, fontWeight: "700" },
  loadingBox:    { backgroundColor: "#fff", borderRadius: 16, padding: 32, alignItems: "center", gap: 12, borderWidth: 1, borderColor: COLORS.border },
  loadingTxt:    { fontSize: 14, fontWeight: "700", color: COLORS.dark, textAlign: "center" },
  loadingDesc:   { fontSize: 12, color: COLORS.mid },
  insightsBox:   { backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  insightsMeta:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  insightsTimestamp: { flex: 1, fontSize: 12, color: COLORS.mid },
  regenerateBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  regenerateTxt: { fontSize: 12, color: "#7C3AED", fontWeight: "600" },
  paraHeader:    { fontSize: 14, fontWeight: "800", color: COLORS.dark, marginTop: 12, marginBottom: 4 },
  para:          { fontSize: 13, color: COLORS.dark, lineHeight: 22, marginBottom: 4 },
});
