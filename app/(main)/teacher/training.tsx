import { useState, useRef } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, EDU_API } from "../../../src/lib/constants";

type Msg = { role: "user" | "ai"; text: string; sources?: any[] };

// Staff Training — parity with the web StaffTrainingChat. KB-grounded Q&A for teachers
// (SOPs, child-safety, NEP, milestones). Calls /api/kb/query with target:"staff".
export default function TeacherTraining() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi! Ask me about SOPs, child-safety protocols, NEP Foundational Stage guidelines, developmental milestones, or school procedures." },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const send = async () => {
    const q = text.trim();
    if (!q || busy) return;
    setText("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await fetch(`${EDU_API}/api/kb/query`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, target: "staff" }),
      });
      const d = await res.json();
      setMessages((m) => [...m, { role: "ai", text: d.answer || d.error || "Sorry, I couldn't find an answer.", sources: d.sources }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Network error — please try again." }]);
    }
    setBusy(false);
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.header}>
        <Ionicons name="school" size={20} color={COLORS.primary} />
        <Text style={s.headerTxt}>Staff Training</Text>
      </View>
      <ScrollView ref={scroller} contentContainerStyle={{ padding: 16, gap: 10 }}>
        {messages.map((m, i) => (
          <View key={i} style={[s.bubble, m.role === "user" ? s.user : s.ai]}>
            <Text style={[s.msgTxt, m.role === "user" && { color: "#fff" }]}>{m.text}</Text>
            {m.sources && m.sources.length > 0 && (
              <Text style={[s.src, m.role === "user" && { color: "#E5E7EB" }]}>📄 {m.sources.length} source(s)</Text>
            )}
          </View>
        ))}
        {busy && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />}
      </ScrollView>
      <View style={s.inputRow}>
        <TextInput style={s.input} value={text} onChangeText={setText} placeholder="Ask about SOPs, safety, NEP…" placeholderTextColor={COLORS.mid} multiline />
        <TouchableOpacity style={s.sendBtn} onPress={send} disabled={busy}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, paddingBottom: 8 },
  headerTxt: { fontSize: 18, fontWeight: "800", color: COLORS.dark },
  bubble:    { maxWidth: "85%", borderRadius: 16, padding: 12 },
  user:      { alignSelf: "flex-end", backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  ai:        { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  msgTxt:    { fontSize: 14, color: COLORS.dark, lineHeight: 20 },
  src:       { fontSize: 11, color: COLORS.mid, marginTop: 6 },
  inputRow:  { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: "#fff" },
  input:     { flex: 1, maxHeight: 110, backgroundColor: COLORS.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  sendBtn:   { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
});
