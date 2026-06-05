import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { COLORS } from "../lib/constants";
import { supabase } from "../lib/supabase";
import { pickImageOrVideo, uploadToBucket, fileKind } from "../lib/uploads";
import AudioButton from "./AudioButton";

const KIND_ICON: Record<string, string> = { image: "image-outline", video: "videocam-outline", pdf: "document-text-outline", file: "document-outline" };

function Attachment({ url, label }: { url: string; label?: string }) {
  const k = fileKind(url);
  return (
    <TouchableOpacity style={s.attChip} onPress={() => WebBrowser.openBrowserAsync(url)} activeOpacity={0.8}>
      <Ionicons name={KIND_ICON[k] as any} size={14} color={COLORS.edu} />
      <Text style={s.attTxt} numberOfLines={1}>{label || k}</Text>
    </TouchableOpacity>
  );
}

export default function ParentHomeworkCard({
  hw, statusRow, childId, childName, onChanged,
}: {
  hw: any;
  statusRow: any | null;
  childId: string;
  childName: string;
  onChanged: () => void;
}) {
  const [busy, setBusy]       = useState(false);
  const [doubt, setDoubt]     = useState(statusRow?.parent_doubt || "");
  const [doubtFile, setDoubtFile] = useState<string | null>(statusRow?.doubt_file_url || null);

  const done = statusRow?.status === "done";

  // teacher attachments: new jsonb array + legacy single file_url
  const teacherFiles: string[] = [
    ...(Array.isArray(hw.attachments) ? hw.attachments.map((a: any) => a?.url).filter(Boolean) : []),
    ...(hw.file_url ? [hw.file_url] : []),
  ];

  const upsert = async (patch: any) => {
    setBusy(true);
    const { error } = await supabase.from("homework_status").upsert(
      { homework_id: hw.id, enquiry_id: childId, child_name: childName, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "homework_id,enquiry_id" },
    );
    setBusy(false);
    if (error) Alert.alert("Error", error.message); else onChanged();
  };

  const toggleDone = () => upsert({ status: done ? "pending" : "done" });

  const attachProof = async () => {
    const picked = await pickImageOrVideo();
    if (!picked) return;
    setBusy(true);
    const url = await uploadToBucket("homework-files", `proof/${hw.id}`, picked);
    setBusy(false);
    if (url) upsert({ proof_file_url: url, status: "done" });
  };

  const attachDoubtFile = async () => {
    const picked = await pickImageOrVideo();
    if (!picked) return;
    setBusy(true);
    const url = await uploadToBucket("homework-files", `doubt/${hw.id}`, picked);
    setBusy(false);
    if (url) setDoubtFile(url);
  };

  const sendDoubt = () => {
    if (!doubt.trim() && !doubtFile) { Alert.alert("Type your question", "Enter a doubt or attach a file first."); return; }
    upsert({ parent_doubt: doubt.trim() || null, doubt_file_url: doubtFile });
  };

  return (
    <View style={[s.card, done && s.cardDone]}>
      {/* top row */}
      <View style={s.top}>
        <View style={s.subjectPill}><Text style={s.subjectTxt}>{hw.subject || "General"}</Text></View>
        {(hw.due_date) && (
          <Text style={s.due}>Due {new Date(hw.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
        )}
      </View>
      <Text style={s.title}>{hw.title || hw.description}</Text>
      {hw.description && hw.title ? <Text style={s.desc}>{hw.description}</Text> : null}

      {/* teacher attachments */}
      {teacherFiles.length > 0 && (
        <View style={s.attRow}>
          {teacherFiles.map((u, i) => <Attachment key={i} url={u} label={`Attachment ${i + 1}`} />)}
        </View>
      )}

      {/* Listen (audio) */}
      {hw.id && (
        <View style={{ marginTop: 10 }}>
          <AudioButton
            sourceType="custom" sourceId={String(hw.id)}
            title={hw.subject || hw.title || "Homework"}
            content={`${hw.title || hw.subject || ""}. ${hw.description || ""}`.trim()}
            keepEnglish={hw.audio_keywords || hw.keywords}
          />
        </View>
      )}

      {/* status + proof */}
      <View style={s.actionRow}>
        <TouchableOpacity style={[s.statusBtn, done && s.statusBtnDone]} onPress={toggleDone} disabled={busy} activeOpacity={0.85}>
          <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={18} color={done ? "#fff" : COLORS.edu} />
          <Text style={[s.statusTxt, done && { color: "#fff" }]}>{done ? "Done" : "Mark as done"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.proofBtn} onPress={attachProof} disabled={busy} activeOpacity={0.8}>
          <Ionicons name="cloud-upload-outline" size={15} color={COLORS.mid} />
          <Text style={s.proofTxt}>{statusRow?.proof_file_url ? "Replace proof" : "Attach proof"}</Text>
        </TouchableOpacity>
      </View>
      {statusRow?.proof_file_url && (
        <View style={s.attRow}><Text style={s.metaLbl}>Proof: </Text><Attachment url={statusRow.proof_file_url} label="Your proof" /></View>
      )}

      {/* doubt / question */}
      <View style={s.doubtBox}>
        <Text style={s.doubtLbl}>Ask a doubt</Text>
        <TextInput
          style={s.doubtInput}
          placeholder="Type a question for the teacher…"
          placeholderTextColor={COLORS.mid}
          value={doubt}
          onChangeText={setDoubt}
          multiline
        />
        <View style={s.doubtActions}>
          <TouchableOpacity style={s.attachBtn} onPress={attachDoubtFile} disabled={busy}>
            <Ionicons name="attach-outline" size={16} color={COLORS.edu} />
            <Text style={s.attachTxt}>{doubtFile ? "Attached ✓" : "Attach"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.sendBtn} onPress={sendDoubt} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sendTxt}>Send</Text>}
          </TouchableOpacity>
        </View>
        {statusRow?.teacher_reply ? (
          <View style={s.reply}>
            <Ionicons name="chatbubble-ellipses" size={14} color={COLORS.edu} />
            <Text style={s.replyTxt}><Text style={{ fontWeight: "800" }}>Teacher: </Text>{statusRow.teacher_reply}</Text>
          </View>
        ) : (statusRow?.parent_doubt ? <Text style={s.pending}>Sent — waiting for the teacher's reply.</Text> : null)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card:      { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardDone:  { borderColor: COLORS.success + "55", backgroundColor: "#F6FBF7" },
  top:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  subjectPill: { backgroundColor: COLORS.eduLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  subjectTxt:  { fontSize: 12, fontWeight: "700", color: COLORS.edu },
  due:       { fontSize: 12, color: COLORS.orange, fontWeight: "600" },
  title:     { fontSize: 15, fontWeight: "700", color: COLORS.dark, lineHeight: 22 },
  desc:      { fontSize: 13, color: COLORS.mid, marginTop: 6, lineHeight: 19 },

  attRow:    { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 },
  attChip:   { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.eduLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.edu + "22", maxWidth: 160 },
  attTxt:    { fontSize: 11, fontWeight: "600", color: COLORS.edu },
  metaLbl:   { fontSize: 12, color: COLORS.mid, fontWeight: "600" },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  statusBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: COLORS.edu },
  statusBtnDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  statusTxt: { fontSize: 13, fontWeight: "700", color: COLORS.edu },
  proofBtn:  { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 9 },
  proofTxt:  { fontSize: 12, fontWeight: "600", color: COLORS.mid },

  doubtBox:  { marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  doubtLbl:  { fontSize: 12, fontWeight: "700", color: COLORS.dark, marginBottom: 6 },
  doubtInput:{ backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, fontSize: 13, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, minHeight: 44, textAlignVertical: "top" },
  doubtActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  attachBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  attachTxt: { fontSize: 12, fontWeight: "700", color: COLORS.edu },
  sendBtn:   { backgroundColor: COLORS.edu, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8, minWidth: 64, alignItems: "center" },
  sendTxt:   { color: "#fff", fontSize: 13, fontWeight: "700" },
  reply:     { flexDirection: "row", gap: 6, marginTop: 10, backgroundColor: COLORS.eduLight, borderRadius: 10, padding: 10 },
  replyTxt:  { flex: 1, fontSize: 12, color: COLORS.dark, lineHeight: 18 },
  pending:   { fontSize: 11, color: COLORS.mid, marginTop: 8, fontStyle: "italic" },
});
