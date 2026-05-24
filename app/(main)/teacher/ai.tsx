import { useState, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { callAITool, askKB } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";

type Section = "generate" | "ask" | "training";

const GEN_TOOLS = [
  { id: "activity",    label: "Activity Planner",   desc: "Fun classroom activity",       icon: "📅", color: "#178F78" },
  { id: "report",      label: "Progress Report",     desc: "End-of-term report",           icon: "📄", color: "#8957E5" },
  { id: "lessonplan",  label: "Lesson Plan",         desc: "Structured lesson guide",      icon: "📚", color: "#E8694A" },
  { id: "observation", label: "Observation Notes",   desc: "Developmental record",         icon: "👁️", color: "#0F766E" },
  { id: "parentmsg",   label: "Parent Message",      desc: "WhatsApp / email message",     icon: "💬", color: "#F5B829" },
];

const AGE_GROUPS = ["2–3 years", "3–4 years", "4–5 years", "5–6 years", "6–8 years"];
const SKILLS     = ["Language & Communication", "Fine Motor Skills", "Gross Motor Skills", "Social Skills", "Creativity & Arts", "Numeracy", "Literacy", "Emotional Intelligence"];
const DURATIONS  = ["15 minutes", "30 minutes", "45 minutes", "1 hour"];

interface Message { role: "user" | "assistant"; text: string; }

export default function TeacherAI() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [section, setSection] = useState<Section>("generate");

  // Generate state
  const [toolId, setToolId]   = useState("activity");
  const [result, setResult]   = useState("");
  const [busy, setBusy]       = useState(false);
  const [copied, setCopied]   = useState(false);

  // Form fields
  const [age, setAge]             = useState(AGE_GROUPS[1]);
  const [skill, setSkill]         = useState(SKILLS[0]);
  const [duration, setDuration]   = useState(DURATIONS[1]);
  const [materials, setMaterials] = useState("");
  const [childName, setChildName] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprov] = useState("");
  const [topic, setTopic]         = useState("");
  const [observation, setObs]     = useState("");
  const [setting, setSetting]     = useState("classroom");
  const [msgTopic, setMsgTopic]   = useState("");

  // Ask iVa / Training chat
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [chatBusy, setChatBusy]   = useState(false);
  const chatRole: "parent" | "staff" = "staff";
  const scrollRef = useRef<ScrollView>(null);

  const tool = GEN_TOOLS.find(t => t.id === toolId) ?? GEN_TOOLS[0];

  const buildParams = (): Record<string, string> => {
    switch (toolId) {
      case "activity":    return { age, skill, duration, materials };
      case "report":      return { childName, age, strengths, improvements };
      case "lessonplan":  return { topic, age, duration };
      case "observation": return { childName, age, setting, observation };
      case "parentmsg":   return { childName, topic: msgTopic };
      default:            return {};
    }
  };

  const handleGenerate = async () => {
    const params = buildParams();
    const empty = Object.values(params).some((v, i) => {
      const required = toolId === "activity" ? ["age","skill","duration"]
        : toolId === "report" ? ["childName","age","strengths"]
        : toolId === "lessonplan" ? ["topic","age"]
        : toolId === "observation" ? ["childName","observation"]
        : toolId === "parentmsg" ? ["msgTopic"] : [];
      return false;
    });

    setBusy(true);
    setResult("");
    try {
      const text = await callAITool(toolId, params);
      setResult(text);
    } catch {
      Alert.alert("Error", "Could not reach AI. Check your connection.");
    }
    setBusy(false);
  };

  const handleCopy = () => {
    Share.share({ message: result }).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendChat = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || chatBusy) return;
    setInput("");
    const next: Message[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setChatBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    const res = await askKB(q, chatRole);
    const answer = res?.answer || res?.response || "Sorry, I couldn't find an answer. Please contact the school directly.";
    setMessages([...next, { role: "assistant", text: answer }]);
    setChatBusy(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={s.root}>
      {/* Section toggle */}
      <View style={s.toggleRow}>
        {([
          { key: "generate", icon: "sparkles-outline", label: "Generate" },
          { key: "ask",      icon: "chatbubble-outline",  label: "Ask iVa" },
          { key: "training", icon: "school-outline",   label: "Training" },
        ] as { key: Section; icon: any; label: string }[]).map(item => (
          <TouchableOpacity
            key={item.key}
            style={[s.toggleBtn, section === item.key && s.toggleActive]}
            onPress={() => setSection(item.key)}
          >
            <Ionicons name={item.icon} size={16} color={section === item.key ? "#fff" : COLORS.mid} />
            <Text style={[s.toggleTxt, section === item.key && s.toggleTxtActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── GENERATE ── */}
      {section === "generate" && (
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {/* RAG Activity Planner banner */}
          <View style={s.ragBanner}>
            <Text style={s.ragIcon}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.ragTitle}>RAG Activity Planner</Text>
              <Text style={s.ragSub}>Grounded in NCF-FS &amp; your school curriculum</Text>
            </View>
            <View style={s.ragBadge}><Text style={s.ragBadgeTxt}>NEW</Text></View>
          </View>

          {/* Tool picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.toolScroll}>
            {GEN_TOOLS.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[s.toolCard, toolId === t.id && { borderColor: t.color, borderWidth: 2 }]}
                onPress={() => { setToolId(t.id); setResult(""); }}
              >
                <Text style={s.toolIcon}>{t.icon}</Text>
                <Text style={[s.toolLabel, toolId === t.id && { color: t.color }]}>{t.label}</Text>
                <Text style={s.toolDesc}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Form */}
          <View style={s.form}>
            <Text style={s.formTitle}>{tool.icon} {tool.label}</Text>

            {/* Age group */}
            <Text style={s.label}>Age Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
              {AGE_GROUPS.map(a => (
                <TouchableOpacity key={a} style={[s.chip, age === a && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]} onPress={() => setAge(a)}>
                  <Text style={[s.chipTxt, age === a && { color: "#fff" }]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tool-specific fields */}
            {toolId === "activity" && (
              <>
                <Text style={s.label}>Skill Focus</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
                  {SKILLS.map(sk => (
                    <TouchableOpacity key={sk} style={[s.chip, skill === sk && { backgroundColor: COLORS.edu, borderColor: COLORS.edu }]} onPress={() => setSkill(sk)}>
                      <Text style={[s.chipTxt, skill === sk && { color: "#fff" }]}>{sk}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={s.label}>Duration</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
                  {DURATIONS.map(d => (
                    <TouchableOpacity key={d} style={[s.chip, duration === d && { backgroundColor: COLORS.edu, borderColor: COLORS.edu }]} onPress={() => setDuration(d)}>
                      <Text style={[s.chipTxt, duration === d && { color: "#fff" }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={s.label}>Materials (optional)</Text>
                <TextInput style={s.input} placeholder="e.g. paper, crayons, blocks" placeholderTextColor={COLORS.mid} value={materials} onChangeText={setMaterials} />
              </>
            )}

            {(toolId === "report" || toolId === "observation" || toolId === "parentmsg") && (
              <>
                <Text style={s.label}>Child Name</Text>
                <TextInput style={s.input} placeholder="Child's name" placeholderTextColor={COLORS.mid} value={childName} onChangeText={setChildName} />
              </>
            )}

            {toolId === "report" && (
              <>
                <Text style={s.label}>Strengths</Text>
                <TextInput style={[s.input, s.textarea]} placeholder="Describe the child's strengths..." placeholderTextColor={COLORS.mid} value={strengths} onChangeText={setStrengths} multiline />
                <Text style={s.label}>Areas to Improve</Text>
                <TextInput style={[s.input, s.textarea]} placeholder="Areas for growth..." placeholderTextColor={COLORS.mid} value={improvements} onChangeText={setImprov} multiline />
              </>
            )}

            {toolId === "lessonplan" && (
              <>
                <Text style={s.label}>Topic / Theme</Text>
                <TextInput style={s.input} placeholder="e.g. Animals, Numbers, Colours" placeholderTextColor={COLORS.mid} value={topic} onChangeText={setTopic} />
                <Text style={s.label}>Duration</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
                  {DURATIONS.map(d => (
                    <TouchableOpacity key={d} style={[s.chip, duration === d && { backgroundColor: COLORS.edu, borderColor: COLORS.edu }]} onPress={() => setDuration(d)}>
                      <Text style={[s.chipTxt, duration === d && { color: "#fff" }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {toolId === "observation" && (
              <>
                <Text style={s.label}>Setting</Text>
                <TextInput style={s.input} placeholder="e.g. classroom, outdoor, art corner" placeholderTextColor={COLORS.mid} value={setting} onChangeText={setSetting} />
                <Text style={s.label}>What was observed</Text>
                <TextInput style={[s.input, s.textarea]} placeholder="Describe what you observed..." placeholderTextColor={COLORS.mid} value={observation} onChangeText={setObs} multiline />
              </>
            )}

            {toolId === "parentmsg" && (
              <>
                <Text style={s.label}>Message Topic / Reason</Text>
                <TextInput style={[s.input, s.textarea]} placeholder="e.g. child showed excellent focus today, upcoming event reminder..." placeholderTextColor={COLORS.mid} value={msgTopic} onChangeText={setMsgTopic} multiline />
              </>
            )}

            <TouchableOpacity style={[s.generateBtn, busy && s.btnDisabled]} onPress={handleGenerate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={s.generateTxt}>Generate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Result */}
          {result !== "" && (
            <View style={s.resultCard}>
              <View style={s.resultHeader}>
                <Text style={s.resultTitle}>✨ Result</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity style={s.resultBtn} onPress={handleCopy}>
                    <Ionicons name={copied ? "checkmark" : "copy-outline"} size={14} color={COLORS.edu} />
                    <Text style={s.resultBtnTxt}>{copied ? "Copied!" : "Copy"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.resultBtn} onPress={() => setResult("")}>
                    <Ionicons name="refresh-outline" size={14} color={COLORS.mid} />
                    <Text style={[s.resultBtnTxt, { color: COLORS.mid }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={s.resultText}>{result}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── ASK iVa (Staff) ── */}
      {(section === "ask" || section === "training") && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={120}>
          <View style={{ flex: 1 }}>
            <View style={s.chatHeader}>
              <View style={s.chatAvatar}>
                <Ionicons name={section === "training" ? "school" : "sparkles"} size={18} color="#fff" />
              </View>
              <View>
                <Text style={s.chatTitle}>{section === "training" ? "Staff Training Hub" : "Ask iVa — Staff"}</Text>
                <Text style={s.chatSub}>{section === "training" ? "Quiz, flashcards, training material" : "Ask anything about curriculum, policies, students"}</Text>
              </View>
            </View>

            <ScrollView ref={scrollRef} style={s.chatMessages} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              {messages.length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.dark }}>
                    {section === "training" ? "👋 Staff Training Hub" : "👋 Hello! I'm iVa"}
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.mid, marginTop: 6, textAlign: "center" }}>
                    {section === "training"
                      ? "Ask me anything about school policies, teaching techniques, or request a quiz!"
                      : "Ask me about school policies, student care guidelines, or curriculum support."
                    }
                  </Text>
                  <View style={{ marginTop: 16, gap: 8, width: "100%" }}>
                    {(section === "training"
                      ? ["Give me a quiz on classroom safety", "What are the school's discipline guidelines?", "Explain the NEP 2020 foundational stage"]
                      : ["What is the school's policy on allergies?", "How do I handle a child's injury?", "What curriculum framework do we follow?"]
                    ).map(q => (
                      <TouchableOpacity key={q} style={s.starterBtn} onPress={() => sendChat(q)}>
                        <Text style={s.starterTxt}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {messages.map((m, i) => (
                <View key={i} style={[s.bubble, m.role === "user" ? s.userBubble : s.aiBubble]}>
                  <Text style={[s.bubbleTxt, m.role === "user" ? s.userTxt : s.aiTxt]}>{m.text}</Text>
                </View>
              ))}
              {chatBusy && (
                <View style={[s.bubble, s.aiBubble, { flexDirection: "row", alignItems: "center" }]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={[s.aiTxt, { marginLeft: 8, fontSize: 13 }]}>Thinking…</Text>
                </View>
              )}
            </ScrollView>

            <View style={s.inputRow}>
              <TextInput
                style={s.chatInput}
                placeholder="Ask a question…"
                placeholderTextColor={COLORS.mid}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => sendChat()}
                returnKeyType="send"
                multiline
              />
              <TouchableOpacity
                style={[s.sendBtn, (!input.trim() || chatBusy) && { opacity: 0.4 }]}
                onPress={() => sendChat()}
                disabled={!input.trim() || chatBusy}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: COLORS.bg },
  toggleRow:      { flexDirection: "row", backgroundColor: "#fff", padding: 8, gap: 6, borderBottomWidth: 1, borderColor: COLORS.border },
  toggleBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 10, paddingVertical: 8, backgroundColor: COLORS.bg },
  toggleActive:   { backgroundColor: COLORS.primary },
  toggleTxt:      { fontSize: 11, fontWeight: "700", color: COLORS.mid },
  toggleTxtActive:{ color: "#fff" },
  content:        { padding: 16, paddingBottom: 40 },
  toolScroll:     { marginBottom: 16 },
  toolCard:       { width: 120, backgroundColor: "#fff", borderRadius: 14, padding: 12, marginRight: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  toolIcon:       { fontSize: 22, marginBottom: 4 },
  toolLabel:      { fontSize: 11, fontWeight: "800", color: COLORS.dark, textAlign: "center" },
  toolDesc:       { fontSize: 9, color: COLORS.mid, textAlign: "center", marginTop: 3 },
  form:           { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  formTitle:      { fontSize: 16, fontWeight: "800", color: COLORS.dark, marginBottom: 14 },
  label:          { fontSize: 10, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  chipRow:        { marginBottom: 4 },
  chip:           { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8, backgroundColor: "#fff" },
  chipTxt:        { fontSize: 11, fontWeight: "700", color: COLORS.dark },
  input:          { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginTop: 4 },
  textarea:       { minHeight: 80, textAlignVertical: "top" },
  generateBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, marginTop: 16 },
  btnDisabled:    { opacity: 0.6 },
  generateTxt:    { color: "#fff", fontSize: 15, fontWeight: "700" },
  resultCard:     { backgroundColor: "#fff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  resultHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  resultTitle:    { fontSize: 14, fontWeight: "800", color: COLORS.dark },
  resultBtn:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.border },
  resultBtnTxt:   { fontSize: 11, fontWeight: "700", color: COLORS.edu },
  resultText:     { fontSize: 13, color: COLORS.dark, lineHeight: 21 },
  chatHeader:     { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: COLORS.border },
  chatAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  chatTitle:      { fontSize: 14, fontWeight: "800", color: COLORS.dark },
  chatSub:        { fontSize: 10, color: COLORS.mid },
  chatMessages:   { flex: 1 },
  starterBtn:     { backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  starterTxt:     { fontSize: 13, color: COLORS.primary, fontWeight: "600" },
  bubble:         { maxWidth: "82%", borderRadius: 16, padding: 12, marginBottom: 8 },
  userBubble:     { backgroundColor: COLORS.primary, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  aiBubble:       { backgroundColor: "#fff", alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  bubbleTxt:      { fontSize: 14, lineHeight: 21 },
  userTxt:        { color: "#fff" },
  aiTxt:          { color: COLORS.dark },
  inputRow:       { flexDirection: "row", padding: 10, gap: 8, backgroundColor: "#fff", borderTopWidth: 1, borderColor: COLORS.border, alignItems: "flex-end" },
  chatInput:      { flex: 1, backgroundColor: COLORS.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.dark, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  ragBanner:      { flexDirection: "row", alignItems: "center", backgroundColor: "#EEF8F6", borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "rgba(23,143,120,0.25)", gap: 10 },
  ragIcon:        { fontSize: 20 },
  ragTitle:       { fontSize: 12, fontWeight: "800", color: COLORS.edu },
  ragSub:         { fontSize: 10, color: COLORS.mid, marginTop: 2 },
  ragBadge:       { backgroundColor: COLORS.edu, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  ragBadgeTxt:    { fontSize: 9, fontWeight: "800", color: "#fff" },
});
