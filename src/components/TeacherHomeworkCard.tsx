import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { COLORS } from "../lib/constants";
import { supabase } from "../lib/supabase";

export default function TeacherHomeworkCard({
  hw, statuses, onReplied,
}: {
  hw: any;
  statuses: any[];
  onReplied: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [drafts, setDrafts]     = useState<Record<string, string>>({});
  const [busy, setBusy]         = useState(false);

  const done   = statuses.filter((st) => st.status === "done").length;
  const doubts = statuses.filter((st) => st.parent_doubt);
  const teacherFiles: string[] = [
    ...(Array.isArray(hw.attachments) ? hw.attachments.map((a: any) => a?.url).filter(Boolean) : []),
    ...(hw.file_url ? [hw.file_url] : []),
  ];

  const reply = async (row: any) => {
    const text = (drafts[row.id] || "").trim();
    if (!text) return;
    setBusy(true);
    const { error } = await supabase.from("homework_status")
      .update({ teacher_reply: text, replied_at: new Date().toISOString() })
      .eq("id", row.id);
    setBusy(false);
    if (error) Alert.alert("Error", error.message);
    else { setDrafts((d) => ({ ...d, [row.id]: "" })); onReplied(); }
  };

  return (
    <View style={s.card}>
      <View style={s.top}>
        <View style={s.badge}><Text style={s.badgeTxt}>{hw.subject || "General"}</Text></View>
        {hw.due_date && <Text style={s.due}>Due {new Date(hw.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>}
      </View>
      <Text style={s.title}>{hw.title}</Text>
      {hw.description ? <Text style={s.desc}>{hw.description}</Text> : null}

      {teacherFiles.length > 0 && (
        <View style={s.attRow}>
          {teacherFiles.map((u, i) => (
            <TouchableOpacity key={i} style={s.chip} onPress={() => WebBrowser.openBrowserAsync(u)}>
              <Ionicons name="document-attach-outline" size={13} color={COLORS.edu} />
              <Text style={s.chipTxt}>File {i + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={s.summary} onPress={() => setExpanded((e) => !e)} activeOpacity={0.8}>
        <Text style={s.summaryTxt}>✓ {done} done · {doubts.length} doubt{doubts.length === 1 ? "" : "s"}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.mid} />
      </TouchableOpacity>

      {expanded && (
        <View style={s.responses}>
          {statuses.length === 0 ? (
            <Text style={s.none}>No parent responses yet.</Text>
          ) : statuses.map((st) => (
            <View key={st.id} style={s.resp}>
              <View style={s.respHead}>
                <Text style={s.respName}>{st.child_name || "Child"}</Text>
                <View style={[s.stTag, st.status === "done" && s.stDone]}>
                  <Text style={[s.stTagTxt, st.status === "done" && { color: "#fff" }]}>{st.status === "done" ? "Done" : "Pending"}</Text>
                </View>
              </View>
              {st.proof_file_url && (
                <TouchableOpacity style={s.chip} onPress={() => WebBrowser.openBrowserAsync(st.proof_file_url)}>
                  <Ionicons name="image-outline" size={13} color={COLORS.edu} /><Text style={s.chipTxt}>View proof</Text>
                </TouchableOpacity>
              )}
              {st.parent_doubt ? (
                <View style={s.doubtBlock}>
                  <Text style={s.doubtTxt}>❓ {st.parent_doubt}</Text>
                  {st.doubt_file_url && (
                    <TouchableOpacity style={s.chip} onPress={() => WebBrowser.openBrowserAsync(st.doubt_file_url)}>
                      <Ionicons name="attach-outline" size={13} color={COLORS.edu} /><Text style={s.chipTxt}>Attachment</Text>
                    </TouchableOpacity>
                  )}
                  {st.teacher_reply ? (
                    <Text style={s.replied}>↳ You: {st.teacher_reply}</Text>
                  ) : (
                    <View style={s.replyRow}>
                      <TextInput style={s.replyInput} placeholder="Reply to parent…" placeholderTextColor={COLORS.mid}
                        value={drafts[st.id] || ""} onChangeText={(t) => setDrafts((d) => ({ ...d, [st.id]: t }))} />
                      <TouchableOpacity style={s.replyBtn} onPress={() => reply(st)} disabled={busy}>
                        <Text style={s.replyBtnTxt}>Send</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card:   { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  top:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  badge:  { backgroundColor: "#EDE9FE", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  due:    { fontSize: 12, color: COLORS.orange, fontWeight: "600" },
  title:  { fontSize: 15, fontWeight: "700", color: COLORS.dark, lineHeight: 22 },
  desc:   { fontSize: 13, color: COLORS.mid, marginTop: 4, lineHeight: 19 },
  attRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip:   { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.eduLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, alignSelf: "flex-start", marginTop: 6 },
  chipTxt:{ fontSize: 11, fontWeight: "600", color: COLORS.edu },
  summary:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  summaryTxt: { fontSize: 13, fontWeight: "700", color: COLORS.dark },
  responses: { marginTop: 10, gap: 10 },
  none:   { fontSize: 12, color: COLORS.mid, fontStyle: "italic" },
  resp:   { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10 },
  respHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  respName: { fontSize: 13, fontWeight: "700", color: COLORS.dark },
  stTag:  { backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  stDone: { backgroundColor: COLORS.success },
  stTagTxt: { fontSize: 10, fontWeight: "800", color: "#92400E" },
  doubtBlock: { marginTop: 8 },
  doubtTxt: { fontSize: 13, color: COLORS.dark, lineHeight: 19 },
  replied: { fontSize: 12, color: COLORS.edu, marginTop: 6, fontWeight: "600" },
  replyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  replyInput: { flex: 1, backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  replyBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  replyBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
