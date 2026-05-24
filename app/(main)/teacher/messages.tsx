import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import {
  clockAction, getClockRecord,
  sendTeacherMessage, getTeacherMessages,
} from "../../../src/lib/api";

export default function TeacherMessages() {
  const { t } = useTranslation();
  const { session } = useSession();

  const [clockStatus, setClockStatus] = useState<"in" | "out" | null>(null);
  const [clockTime, setClockTime]     = useState<string | null>(null);
  const [clockLoading, setClockLoading] = useState(false);

  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [sending, setSending]   = useState(false);

  const [msgs, setMsgs]       = useState<any[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(true);

  const staffName = session?.name || "";

  const loadClock = async () => {
    if (!staffName) return;
    try {
      const rec = await getClockRecord(staffName);
      if (rec?.clockIn) {
        setClockStatus("in");
        setClockTime(new Date(rec.clockIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      } else {
        setClockStatus("out");
        setClockTime(null);
      }
    } catch { setClockStatus("out"); }
  };

  const loadMsgs = async () => {
    if (!staffName) return;
    setMsgsLoading(true);
    try {
      const res = await getTeacherMessages(staffName);
      setMsgs(Array.isArray(res) ? res : []);
    } catch { setMsgs([]); }
    setMsgsLoading(false);
  };

  useEffect(() => { loadClock(); loadMsgs(); }, []);

  const handleClock = async () => {
    if (!staffName) return;
    const action = clockStatus === "in" ? "out" : "in";
    setClockLoading(true);
    try {
      const res = await clockAction(action, { staffName });
      if (!res?.error) {
        setClockStatus(action);
        if (action === "in") {
          setClockTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
        } else {
          setClockTime(null);
        }
        Alert.alert(action === "in" ? t("clockedIn") : t("clockedOut"), "");
      } else {
        Alert.alert("Error", res.error);
      }
    } catch { Alert.alert("Error", "Failed"); }
    setClockLoading(false);
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert(t("fillAllFields")); return;
    }
    setSending(true);
    try {
      const res = await sendTeacherMessage({ teacherName: staffName, subject: subject.trim(), message: message.trim() });
      if (!res?.error) {
        setSubject(""); setMessage("");
        Alert.alert(t("success"), "Message sent!");
        loadMsgs();
      } else {
        Alert.alert("Error", res.error);
      }
    } catch { Alert.alert("Error", "Failed"); }
    setSending(false);
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Header */}
      <Text style={s.pageTitle}>{t("messages")}</Text>

      {/* Clock card */}
      <View style={s.clockCard}>
        <View style={s.clockInfo}>
          <Ionicons name="time-outline" size={28} color={clockStatus === "in" ? COLORS.success : COLORS.mid} />
          <View style={{ marginLeft: 12 }}>
            <Text style={s.clockTitle}>{t("staffAttendance")}</Text>
            <Text style={s.clockSub}>
              {clockStatus === "in"
                ? `${t("clockedIn")} at ${clockTime}`
                : t("notClockedIn")}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.clockBtn, clockStatus === "in" && s.clockBtnOut]}
          onPress={handleClock}
          disabled={clockLoading}
          activeOpacity={0.8}
        >
          {clockLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.clockBtnTxt}>{clockStatus === "in" ? t("clockOut") : t("clockIn")}</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Send message */}
      <Text style={s.sectionLabel}>{t("sendToOwner")}</Text>
      <View style={s.formCard}>
        <TextInput
          style={s.input}
          placeholder={t("subject")}
          placeholderTextColor={COLORS.mid}
          value={subject}
          onChangeText={setSubject}
        />
        <TextInput
          style={[s.input, s.textArea]}
          placeholder={t("message")}
          placeholderTextColor={COLORS.mid}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={sending} activeOpacity={0.85}>
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text style={s.sendTxt}>{t("save")}</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* Sent messages */}
      <Text style={[s.sectionLabel, { marginTop: 20 }]}>{t("sentMessages")}</Text>
      {msgsLoading
        ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        : msgs.length === 0
          ? <Text style={s.empty}>{t("noData")}</Text>
          : msgs.map((m, i) => (
              <View key={i} style={s.msgCard}>
                <Text style={s.msgSubject}>{m.subject}</Text>
                <Text style={s.msgBody}>{m.message}</Text>
                {m.reply && (
                  <View style={s.replyBox}>
                    <Text style={s.replyLabel}>{t("ownerReplied")}</Text>
                    <Text style={s.replyTxt}>{m.reply}</Text>
                  </View>
                )}
                <Text style={s.msgDate}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN") : ""}</Text>
              </View>
            ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.bg },
  content:      { padding: 20, paddingBottom: 50 },
  pageTitle:    { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 20 },
  clockCard:    { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  clockInfo:    { flexDirection: "row", alignItems: "center", flex: 1 },
  clockTitle:   { fontSize: 13, fontWeight: "700", color: COLORS.dark },
  clockSub:     { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  clockBtn:     { backgroundColor: COLORS.success, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  clockBtnOut:  { backgroundColor: COLORS.error },
  clockBtnTxt:  { color: "#fff", fontWeight: "700", fontSize: 13 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  formCard:     { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  input:        { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  textArea:     { minHeight: 100 },
  sendBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, padding: 14 },
  sendTxt:      { color: "#fff", fontWeight: "700", fontSize: 15 },
  empty:        { textAlign: "center", color: COLORS.mid, marginTop: 20, fontSize: 14 },
  msgCard:      { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  msgSubject:   { fontSize: 14, fontWeight: "700", color: COLORS.dark, marginBottom: 4 },
  msgBody:      { fontSize: 13, color: COLORS.mid, lineHeight: 20 },
  replyBox:     { backgroundColor: "#EEF8F6", borderRadius: 10, padding: 12, marginTop: 10 },
  replyLabel:   { fontSize: 11, fontWeight: "700", color: COLORS.edu, marginBottom: 4 },
  replyTxt:     { fontSize: 13, color: COLORS.dark },
  msgDate:      { fontSize: 11, color: COLORS.mid, marginTop: 8, textAlign: "right" },
});
