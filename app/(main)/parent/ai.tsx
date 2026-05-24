import { useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  Alert, Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { callAITool, askKB } from "../../../src/lib/api";

// ── Tool definitions ──────────────────────────────────────────────────────────
type ToolId = "story" | "milestone" | "childqa" | "mealidea" | "kidstory" | "riddle" | "drawing" | "song";

interface ToolDef {
  id: ToolId;
  labelKey: string;
  icon: string;
  group: "parent" | "kids";
  fields: { key: string; placeholder: string }[];
}

const TOOLS: ToolDef[] = [
  // For Parents
  {
    id: "story", labelKey: "Story Generator", icon: "book-outline", group: "parent",
    fields: [
      { key: "childName", placeholder: "Child's name" },
      { key: "theme",     placeholder: "Story theme (e.g. dinosaurs, space)" },
    ],
  },
  {
    id: "milestone", labelKey: "Milestone Advisor", icon: "trending-up-outline", group: "parent",
    fields: [
      { key: "age",   placeholder: "Child's age (e.g. 3 years 2 months)" },
      { key: "skill", placeholder: "Skill to track (e.g. speech, motor)" },
    ],
  },
  {
    id: "childqa", labelKey: "Ask an Expert", icon: "help-circle-outline", group: "parent",
    fields: [
      { key: "question", placeholder: "Your parenting question…" },
    ],
  },
  {
    id: "mealidea", labelKey: "Healthy Meal Ideas", icon: "restaurant-outline", group: "parent",
    fields: [
      { key: "age",  placeholder: "Child's age" },
      { key: "pref", placeholder: "Preferences or allergies" },
    ],
  },
  // For Kids
  {
    id: "kidstory", labelKey: "Mini Story", icon: "sparkles-outline", group: "kids",
    fields: [
      { key: "hero",  placeholder: "Hero name (e.g. Arjun the rabbit)" },
      { key: "place", placeholder: "Magical place (e.g. candy forest)" },
    ],
  },
  {
    id: "riddle", labelKey: "Fun Riddles", icon: "bulb-outline", group: "kids",
    fields: [
      { key: "topic", placeholder: "Topic (e.g. animals, fruits)" },
    ],
  },
  {
    id: "drawing", labelKey: "Drawing Guide", icon: "brush-outline", group: "kids",
    fields: [
      { key: "subject", placeholder: "What to draw (e.g. a butterfly)" },
    ],
  },
  {
    id: "song", labelKey: "Song & Rhyme", icon: "musical-notes-outline", group: "kids",
    fields: [
      { key: "theme", placeholder: "Theme (e.g. rain, friendship)" },
    ],
  },
];

// ── Chat message type ─────────────────────────────────────────────────────────
interface Msg { role: "user" | "ai"; text: string }

const STARTERS = [
  "What are the school timings?",
  "How do I pay fees online?",
  "What is the holiday schedule?",
  "What documents are needed for admission?",
];

// ── Main component ────────────────────────────────────────────────────────────
export default function ParentAI() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"generate" | "ask">("generate");
  const [group, setGroup] = useState<"parent" | "kids">("parent");
  const [selectedTool, setSelectedTool] = useState<ToolDef>(TOOLS[0]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState("");
  const [generating, setGenerating] = useState(false);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const filteredTools = TOOLS.filter((t) => t.group === group);

  const handleSelectTool = (tool: ToolDef) => {
    setSelectedTool(tool);
    setParams({});
    setResult("");
  };

  const handleGenerate = async () => {
    for (const f of selectedTool.fields) {
      if (!params[f.key]?.trim()) {
        Alert.alert(t("fillAllFields")); return;
      }
    }
    setGenerating(true);
    setResult("");
    try {
      const text = await callAITool(selectedTool.id, params);
      setResult(text || t("noAnswer"));
    } catch { setResult(t("noAnswer")); }
    setGenerating(false);
  };

  const handleAsk = async (q: string) => {
    const question = q || input.trim();
    if (!question) return;
    setInput("");
    setMsgs((prev) => [...prev, { role: "user", text: question }]);
    setThinking(true);
    try {
      const res = await askKB(question, "parent");
      const answer = res?.answer || res?.response || t("noAnswer");
      setMsgs((prev) => [...prev, { role: "ai", text: answer }]);
    } catch {
      setMsgs((prev) => [...prev, { role: "ai", text: t("noAnswer") }]);
    }
    setThinking(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={s.root}>
      {/* Tab switcher */}
      <View style={s.tabBar}>
        {(["generate", "ask"] as const).map((tb) => (
          <TouchableOpacity
            key={tb}
            style={[s.tabBtn, tab === tb && s.tabBtnActive]}
            onPress={() => setTab(tb)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabTxt, tab === tb && s.tabTxtActive]}>
              {tb === "generate" ? t("aiTools") : t("askIva")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Generate Tab ── */}
      {tab === "generate" && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Group toggle */}
          <View style={s.groupRow}>
            {(["parent", "kids"] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[s.groupBtn, group === g && s.groupBtnActive]}
                onPress={() => { setGroup(g); handleSelectTool(TOOLS.find((t) => t.group === g)!); }}
                activeOpacity={0.7}
              >
                <Text style={[s.groupTxt, group === g && s.groupTxtActive]}>
                  {g === "parent" ? t("forParents") : t("forKids")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tool picker */}
          <Text style={s.sectionLabel}>{t("selectTool")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", gap: 10, paddingRight: 20 }}>
              {filteredTools.map((tool) => (
                <TouchableOpacity
                  key={tool.id}
                  style={[s.toolCard, selectedTool.id === tool.id && s.toolCardActive]}
                  onPress={() => handleSelectTool(tool)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={tool.icon as any} size={22} color={selectedTool.id === tool.id ? COLORS.edu : COLORS.mid} />
                  <Text style={[s.toolLbl, selectedTool.id === tool.id && s.toolLblActive]}>{tool.labelKey}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Fields */}
          <View style={s.formCard}>
            {selectedTool.fields.map((f) => (
              <TextInput
                key={f.key}
                style={s.input}
                placeholder={f.placeholder}
                placeholderTextColor={COLORS.mid}
                value={params[f.key] || ""}
                onChangeText={(v) => setParams((p) => ({ ...p, [f.key]: v }))}
              />
            ))}
            <TouchableOpacity style={s.generateBtn} onPress={handleGenerate} disabled={generating} activeOpacity={0.85}>
              {generating
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={s.generateTxt}>{t("generate")}</Text>
                  </>
              }
            </TouchableOpacity>
          </View>

          {/* Result */}
          {!!result && (
            <View style={s.resultCard}>
              <Text style={s.resultLabel}>{t("aiResult")}</Text>
              <Text style={s.resultTxt}>{result}</Text>
              <View style={s.resultActions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => { Share.share({ message: result }).catch(() => {}); }} activeOpacity={0.7}>
                  <Ionicons name="copy-outline" size={16} color={COLORS.edu} />
                  <Text style={s.actionTxt}>{t("copy")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => { setResult(""); setParams({}); }} activeOpacity={0.7}>
                  <Ionicons name="refresh-outline" size={16} color={COLORS.mid} />
                  <Text style={[s.actionTxt, { color: COLORS.mid }]}>{t("clearResult")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Ask iVa Tab ── */}
      {tab === "ask" && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
          {msgs.length === 0 && (
            <View style={s.startersBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={COLORS.edu} />
              <Text style={s.hiTxt}>{t("hiIva")}</Text>
              <Text style={s.askTxt}>{t("askAnything")}</Text>
              {STARTERS.map((q) => (
                <TouchableOpacity key={q} style={s.starterBtn} onPress={() => handleAsk(q)} activeOpacity={0.7}>
                  <Text style={s.starterTxt}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <FlatList
            ref={flatRef}
            data={msgs}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={s.chatContent}
            renderItem={({ item }) => (
              <View style={[s.bubble, item.role === "user" ? s.bubbleUser : s.bubbleAi]}>
                <Text style={[s.bubbleTxt, item.role === "user" ? s.bubbleTxtUser : s.bubbleTxtAi]}>
                  {item.text}
                </Text>
              </View>
            )}
            ListFooterComponent={
              thinking ? (
                <View style={s.bubbleAi}>
                  <ActivityIndicator size="small" color={COLORS.edu} />
                </View>
              ) : null
            }
          />
          <View style={s.inputRow}>
            <TextInput
              style={s.chatInput}
              placeholder={t("typePlaceholder")}
              placeholderTextColor={COLORS.mid}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleAsk("")}
              returnKeyType="send"
            />
            <TouchableOpacity style={s.sendBtn} onPress={() => handleAsk("")} activeOpacity={0.8}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: COLORS.bg },
  tabBar:         { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderColor: COLORS.border },
  tabBtn:         { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabBtnActive:   { borderBottomWidth: 2, borderBottomColor: COLORS.edu },
  tabTxt:         { fontSize: 13, fontWeight: "600", color: COLORS.mid },
  tabTxtActive:   { color: COLORS.edu },
  scroll:         { flex: 1 },
  scrollContent:  { padding: 16, paddingBottom: 40 },
  groupRow:       { flexDirection: "row", backgroundColor: "#F0F0F0", borderRadius: 12, padding: 4, marginBottom: 16 },
  groupBtn:       { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  groupBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  groupTxt:       { fontSize: 13, fontWeight: "600", color: COLORS.mid },
  groupTxtActive: { color: COLORS.edu },
  sectionLabel:   { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  toolCard:       { width: 100, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1.5, borderColor: COLORS.border },
  toolCardActive: { borderColor: COLORS.edu, backgroundColor: "#EEF8F6" },
  toolLbl:        { fontSize: 11, fontWeight: "600", color: COLORS.mid, textAlign: "center", marginTop: 6 },
  toolLblActive:  { color: COLORS.edu },
  formCard:       { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 16 },
  input:          { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  generateBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.edu, borderRadius: 12, padding: 14 },
  generateTxt:    { color: "#fff", fontWeight: "700", fontSize: 15 },
  resultCard:     { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  resultLabel:    { fontSize: 11, fontWeight: "700", color: COLORS.edu, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  resultTxt:      { fontSize: 14, color: COLORS.dark, lineHeight: 22 },
  resultActions:  { flexDirection: "row", gap: 12, marginTop: 14 },
  actionBtn:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF8F6", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  actionTxt:      { fontSize: 13, fontWeight: "600", color: COLORS.edu },
  // Chat
  startersBox:    { padding: 20, alignItems: "center", gap: 10 },
  hiTxt:          { fontSize: 18, fontWeight: "800", color: COLORS.dark, marginTop: 8 },
  askTxt:         { fontSize: 13, color: COLORS.mid, marginBottom: 4 },
  starterBtn:     { width: "100%", backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  starterTxt:     { fontSize: 13, color: COLORS.dark, fontWeight: "500" },
  chatContent:    { padding: 16, gap: 10, paddingBottom: 8 },
  bubble:         { maxWidth: "80%", borderRadius: 16, padding: 12, marginBottom: 2 },
  bubbleUser:     { alignSelf: "flex-end", backgroundColor: COLORS.edu },
  bubbleAi:       { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border },
  bubbleTxt:      { fontSize: 14, lineHeight: 20 },
  bubbleTxtUser:  { color: "#fff" },
  bubbleTxtAi:    { color: COLORS.dark },
  inputRow:       { flexDirection: "row", padding: 12, backgroundColor: "#fff", borderTopWidth: 1, borderColor: COLORS.border, gap: 10 },
  chatInput:      { flex: 1, backgroundColor: COLORS.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  sendBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.edu, alignItems: "center", justifyContent: "center" },
});
