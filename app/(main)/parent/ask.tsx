import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { askKB } from "../../../src/lib/api";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function ParentAsk() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [busy, setBusy]         = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || busy) return;
    setInput("");
    const next: Message[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    const res = await askKB(q, "parent");
    const answer = res?.answer || res?.response || t("noAnswer");
    setMessages([...next, { role: "assistant", text: answer }]);
    setBusy(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <View style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.avatarCircle}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <View>
            <Text style={s.headerTitle}>{t("askIva")}</Text>
            <Text style={s.headerSub}>{t("aiAssistant")}</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={s.messages}
          contentContainerStyle={s.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={s.welcome}>
              <Text style={s.welcomeTitle}>{t("hiIva")}</Text>
              <Text style={s.welcomeSub}>{t("askAnything")}</Text>
              <View style={s.starters}>
                {[t("q1"), t("q2"), t("q3"), t("q4")].map((q) => (
                  <TouchableOpacity key={q} style={s.starterBtn} onPress={() => send(q)}>
                    <Text style={s.starterTxt}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
            <View key={i} style={[s.bubble, m.role === "user" ? s.userBubble : s.aiBubble]}>
              <Text style={[s.bubbleTxt, m.role === "user" ? s.userTxt : s.aiTxt]}>
                {m.text}
              </Text>
            </View>
          ))}

          {busy && (
            <View style={[s.bubble, s.aiBubble, s.typingBubble]}>
              <ActivityIndicator size="small" color={COLORS.edu} />
              <Text style={[s.aiTxt, { marginLeft: 8, fontSize: 13 }]}>{t("thinking")}</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder={t("typePlaceholder")}
            placeholderTextColor={COLORS.mid}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || busy) && s.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || busy}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  header:        { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, paddingBottom: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: COLORS.border },
  avatarCircle:  { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.edu, alignItems: "center", justifyContent: "center" },
  headerTitle:   { fontSize: 16, fontWeight: "800", color: COLORS.dark },
  headerSub:     { fontSize: 11, color: COLORS.mid },
  messages:      { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  welcome:       { alignItems: "center", paddingVertical: 20 },
  welcomeTitle:  { fontSize: 20, fontWeight: "800", color: COLORS.dark },
  welcomeSub:    { fontSize: 13, color: COLORS.mid, marginTop: 4 },
  starters:      { marginTop: 20, width: "100%", gap: 10 },
  starterBtn:    { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  starterTxt:    { fontSize: 13, color: COLORS.edu, fontWeight: "600" },
  bubble:        { maxWidth: "80%", borderRadius: 18, padding: 12, marginBottom: 10 },
  userBubble:    { backgroundColor: COLORS.edu, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  aiBubble:      { backgroundColor: "#fff", alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  typingBubble:  { flexDirection: "row", alignItems: "center" },
  bubbleTxt:     { fontSize: 14, lineHeight: 21 },
  userTxt:       { color: "#fff" },
  aiTxt:         { color: COLORS.dark },
  inputRow:      { flexDirection: "row", padding: 12, gap: 10, backgroundColor: "#fff", borderTopWidth: 1, borderColor: COLORS.border, alignItems: "flex-end" },
  input:         { flex: 1, backgroundColor: COLORS.bg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.dark, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.edu, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },
});
