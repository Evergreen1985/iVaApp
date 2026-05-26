import { useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  Alert, Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS, EDU_API } from "../../../src/lib/constants";
import { callAITool, askKB } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";

const INTERESTS = [
  { label: "Art & Craft",        emoji: "🎨" },
  { label: "Music",              emoji: "🎵" },
  { label: "Outdoor Play",       emoji: "🌳" },
  { label: "Sensory Play",       emoji: "🌊" },
  { label: "Language & Stories", emoji: "📚" },
  { label: "Math & Puzzles",     emoji: "🔢" },
  { label: "Science & Nature",   emoji: "🔬" },
  { label: "Movement & Dance",   emoji: "💃" },
];
const DURATIONS = [15, 30, 45];

function ageLabel(months: number) {
  const y = Math.floor(months / 12), m = months % 12;
  if (y === 0) return `${m} months`;
  if (m === 0) return `${y} yr${y > 1 ? "s" : ""}`;
  return `${y} yr ${m} mo`;
}

const GOAL_COLORS: Record<string, string> = {
  "Fine Motor":       "#8957E5",
  "Language":         "#3B82F6",
  "Cognitive":        "#B08000",
  "Social-Emotional": "#E8694A",
  "Physical":         COLORS.edu,
};

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
  const { activeChild } = useSession();
  const [tab, setTab] = useState<"generate" | "activities" | "ask">("generate");
  const [group, setGroup] = useState<"parent" | "kids">("parent");
  const [selectedTool, setSelectedTool] = useState<ToolDef>(TOOLS[0]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState("");
  const [generating, setGenerating] = useState(false);

  // Activity Planner state
  const [actInterests, setActInterests] = useState<string[]>([]);
  const [actDuration, setActDuration]   = useState(30);
  const [actResult, setActResult]       = useState<any>(null);
  const [actLoading, setActLoading]     = useState(false);
  const [actError, setActError]         = useState("");

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const handlePlanActivities = async () => {
    if (actInterests.length === 0) { setActError("Please select at least one interest area."); return; }
    setActError(""); setActResult(null); setActLoading(true);
    try {
      const ageMonths = activeChild?.child_age_months || 36;
      const res = await fetch(`${EDU_API}/api/ai/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ageMonths, interests: actInterests, duration: actDuration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setActResult(data);
    } catch { setActError("Could not generate activities. Please try again."); }
    setActLoading(false);
  };

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
        {([
          { id: "generate",   label: t("aiTools") },
          { id: "activities", label: "RAG Activities" },
          { id: "ask",        label: t("askIva") },
        ] as const).map((tb) => (
          <TouchableOpacity
            key={tb.id}
            style={[s.tabBtn, tab === tb.id && s.tabBtnActive]}
            onPress={() => setTab(tb.id)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabTxt, tab === tb.id && s.tabTxtActive]}>{tb.label}</Text>
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

      {/* ── Activities Tab ── */}
      {tab === "activities" && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Child age banner */}
          <View style={s.ageBanner}>
            <Ionicons name="leaf-outline" size={20} color={COLORS.edu} />
            <View style={{ flex: 1 }}>
              <Text style={s.ageBannerName}>{activeChild?.child_name || activeChild?.name || "Your Child"}</Text>
              <Text style={s.ageBannerAge}>
                {activeChild?.child_age_months ? ageLabel(activeChild.child_age_months) : "Age not available"}
              </Text>
            </View>
            <View style={s.agePill}>
              <Text style={s.agePillTxt}>
                {activeChild?.child_age_months ? ageLabel(activeChild.child_age_months) : "—"}
              </Text>
            </View>
          </View>

          {/* Interest chips */}
          <Text style={s.sectionLabel}>Interest Areas</Text>
          <View style={s.interestGrid}>
            {INTERESTS.map(opt => {
              const active = actInterests.includes(opt.label);
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[s.interestChip, active && s.interestChipActive]}
                  onPress={() => setActInterests(prev =>
                    prev.includes(opt.label) ? prev.filter(i => i !== opt.label) : [...prev, opt.label]
                  )}
                  activeOpacity={0.75}
                >
                  <Text style={s.interestEmoji}>{opt.emoji}</Text>
                  <Text style={[s.interestLbl, active && s.interestLblActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Duration */}
          <Text style={[s.sectionLabel, { marginTop: 16 }]}>Session Duration</Text>
          <View style={s.durationRow}>
            {DURATIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[s.durBtn, actDuration === d && s.durBtnActive]}
                onPress={() => setActDuration(d)}
                activeOpacity={0.8}
              >
                <Text style={[s.durTxt, actDuration === d && s.durTxtActive]}>{d} min</Text>
              </TouchableOpacity>
            ))}
          </View>

          {actError ? (
            <View style={s.errorBox}>
              <Text style={s.errorTxt}>⚠️ {actError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.planBtn, actLoading && { opacity: 0.6 }]}
            onPress={handlePlanActivities}
            disabled={actLoading}
            activeOpacity={0.85}
          >
            {actLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={s.planBtnTxt}>Plan Activities</Text>
                </>
            }
          </TouchableOpacity>

          {/* RAG explanation card — always visible */}
          <View style={s.ragCard}>
            <View style={s.ragCardHead}>
              <Text style={s.ragEmoji}>🧠</Text>
              <View>
                <Text style={s.ragTitle}>Why RAG Activities?</Text>
                <Text style={s.ragSub}>Retrieval-Augmented Generation</Text>
              </View>
            </View>
            <View style={s.ragRow}>
              <View style={[s.ragBox, { borderLeftColor: COLORS.error }]}>
                <Text style={[s.ragBoxLabel, { color: COLORS.error }]}>PLAIN AI</Text>
                <Text style={s.ragBoxTxt}>
                  "Generate activities for a 3-year-old" → generic answer from training data only
                </Text>
              </View>
              <View style={[s.ragBox, { borderLeftColor: COLORS.edu }]}>
                <Text style={[s.ragBoxLabel, { color: COLORS.edu }]}>RAG (THIS PLANNER)</Text>
                <Text style={s.ragBoxTxt}>
                  Same request + retrieved NCF curriculum docs + your school's activity library → specific, curriculum-aligned, age-accurate response
                </Text>
              </View>
            </View>
          </View>

          {/* Activity results */}
          {actResult && (
            <View style={{ marginTop: 20 }}>
              <Text style={s.sectionLabel}>
                {actResult.activities?.length} Activities · {actDuration} min
              </Text>
              {actResult.age_note ? (
                <View style={s.ageNoteBox}>
                  <Text style={s.ageNoteTxt}>💡 {actResult.age_note}</Text>
                </View>
              ) : null}
              {(actResult.activities || []).map((act: any, idx: number) => {
                const activeGoals = act.goals
                  ? Object.entries(act.goals).filter(([, v]) => v).map(([k]) => k)
                  : act.goals_array || [];
                return (
                  <View key={idx} style={s.actCard}>
                    {/* Card header */}
                    <View style={s.actCardHead}>
                      <Text style={s.actEmoji}>{act.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.actName}>{act.name}</Text>
                        <Text style={s.actAge}>Suitable for {act.age_suitability || ageLabel(activeChild?.child_age_months || 36)}</Text>
                      </View>
                      <View style={s.actDurPill}>
                        <Text style={s.actDurTxt}>{actDuration} min</Text>
                      </View>
                    </View>

                    {/* Materials */}
                    {act.materials?.length > 0 && (
                      <View style={s.actSection}>
                        <Text style={[s.actSectionLabel, { color: COLORS.orange }]}>Materials Needed</Text>
                        {act.materials.map((m: string, i: number) => (
                          <Text key={i} style={s.actListItem}>• {m}</Text>
                        ))}
                      </View>
                    )}

                    {/* Steps */}
                    {act.steps?.length > 0 && (
                      <View style={s.actSection}>
                        <Text style={[s.actSectionLabel, { color: "#3B82F6" }]}>Instructions</Text>
                        {act.steps.map((step: string, i: number) => (
                          <Text key={i} style={s.actListItem}>{i + 1}. {step}</Text>
                        ))}
                      </View>
                    )}

                    {/* Learning goals */}
                    {activeGoals.length > 0 && (
                      <View style={s.actSection}>
                        <Text style={[s.actSectionLabel, { color: "#8957E5" }]}>Learning Goals</Text>
                        <View style={s.goalsRow}>
                          {activeGoals.map((g: string) => (
                            <View key={g} style={[s.goalPill, { backgroundColor: (GOAL_COLORS[g] || COLORS.edu) + "18" }]}>
                              <Text style={[s.goalTxt, { color: GOAL_COLORS[g] || COLORS.edu }]}>{g}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* NCF alignment */}
                    {act.ncf_alignment && (
                      <Text style={s.actSource}>📎 {act.ncf_alignment}</Text>
                    )}
                  </View>
                );
              })}
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
  // Activity Planner
  ageBanner:       { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.eduLight, borderRadius: 14, padding: 14, marginBottom: 20, gap: 12, borderWidth: 1, borderColor: COLORS.edu + "40" },
  ageBannerName:   { fontSize: 14, fontWeight: "800", color: COLORS.dark },
  ageBannerAge:    { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  agePill:         { backgroundColor: COLORS.edu, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  agePillTxt:      { fontSize: 12, fontWeight: "800", color: "#fff" },
  interestGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  interestChip:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1.5, borderColor: COLORS.border },
  interestChipActive: { borderColor: COLORS.edu, backgroundColor: COLORS.eduLight },
  interestEmoji:   { fontSize: 16 },
  interestLbl:     { fontSize: 12, fontWeight: "600", color: COLORS.mid },
  interestLblActive:{ color: COLORS.edu, fontWeight: "700" },
  durationRow:     { flexDirection: "row", gap: 10, marginBottom: 20 },
  durBtn:          { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center" },
  durBtnActive:    { borderColor: COLORS.edu, backgroundColor: COLORS.eduLight },
  durTxt:          { fontSize: 14, fontWeight: "600", color: COLORS.mid },
  durTxtActive:    { color: COLORS.edu, fontWeight: "800" },
  errorBox:        { backgroundColor: "rgba(220,38,38,0.07)", borderRadius: 10, padding: 10, marginBottom: 12 },
  errorTxt:        { fontSize: 13, color: COLORS.error },
  planBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.edu, borderRadius: 14, padding: 16, marginBottom: 4 },
  planBtnTxt:      { color: "#fff", fontWeight: "800", fontSize: 16 },
  ageNoteBox:      { backgroundColor: "#FEF9EC", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "#F5B82940" },
  ageNoteTxt:      { fontSize: 13, color: "#92700A", lineHeight: 19 },
  actCard:         { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  actCardHead:     { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  actEmoji:        { fontSize: 32 },
  actName:         { fontSize: 15, fontWeight: "800", color: COLORS.dark },
  actAge:          { fontSize: 11, color: COLORS.mid, marginTop: 3 },
  actDurPill:      { backgroundColor: COLORS.eduLight, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  actDurTxt:       { fontSize: 11, fontWeight: "700", color: COLORS.edu },
  actSection:      { marginBottom: 12 },
  actSectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  actListItem:     { fontSize: 13, color: COLORS.dark, lineHeight: 20, marginBottom: 3 },
  goalsRow:        { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  goalPill:        { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  goalTxt:         { fontSize: 12, fontWeight: "700" },
  actSource:       { fontSize: 11, color: COLORS.mid, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4 },

  // RAG info card
  ragCard:       { backgroundColor: "#EEF8F6", borderRadius: 18, padding: 16, marginTop: 20, marginBottom: 4, borderWidth: 1.5, borderColor: COLORS.edu + "30" },
  ragCardHead:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  ragEmoji:      { fontSize: 24 },
  ragTitle:      { fontSize: 15, fontWeight: "800", color: COLORS.dark },
  ragSub:        { fontSize: 11, color: COLORS.mid, marginTop: 1 },
  ragRow:        { gap: 10 },
  ragBox:        { backgroundColor: "#fff", borderRadius: 12, padding: 12, borderLeftWidth: 3 },
  ragBoxLabel:   { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, marginBottom: 6 },
  ragBoxTxt:     { fontSize: 12, color: COLORS.dark, lineHeight: 18 },

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
