import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         RefreshControl, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getOwnerMessages, replyOwnerMessage } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function OwnerMessages() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refresh, setRefresh]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const res = await getOwnerMessages(token);
      const data = res?.messages ?? res;
      setMessages(Array.isArray(data) ? data : []);
    } catch { setMessages([]); }
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sendReply = async (msg: any) => {
    if (!replyText.trim()) return;
    setReplying(true);
    await replyOwnerMessage(token, msg.id, replyText.trim());
    setReplying(false);
    setReplyText("");
    setExpanded(null);
    load(true);
  };

  const unreadCount = messages.filter(m => !m.read).length;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#0891B2" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Staff Messages</Text>
        {unreadCount > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{unreadCount}</Text></View>}
      </View>

      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor="#0891B2" />}>
        {messages.length === 0 ? (
          <View style={s.empty}><Ionicons name="chatbubbles-outline" size={40} color={COLORS.mid} /><Text style={s.emptyTxt}>No messages</Text></View>
        ) : messages.map((msg, i) => {
          const isExpanded = expanded === msg.id;
          return (
            <TouchableOpacity key={msg.id || i} style={[s.card, !msg.read && s.unread]}
              onPress={() => setExpanded(isExpanded ? null : msg.id)} activeOpacity={0.8}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.subject}>{msg.subject || "Message"}</Text>
                  <Text style={s.sender}>{msg.sender_name || msg.name || "Staff"} · {msg.section || ""}</Text>
                </View>
                <View style={s.rightCol}>
                  {!msg.read && <View style={s.unreadDot} />}
                  <Text style={s.date}>{msg.created_at ? new Date(msg.created_at).toLocaleDateString("en-IN") : ""}</Text>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.mid} />
                </View>
              </View>

              {isExpanded && <>
                <Text style={s.body}>{msg.message || msg.body}</Text>

                {Array.isArray(msg.replies) && msg.replies.length > 0 && (
                  <View style={s.repliesBox}>
                    <Text style={s.repliesLabel}>Your replies</Text>
                    {msg.replies.map((r: any, ri: number) => (
                      <View key={ri} style={s.replyBubble}>
                        <Text style={s.replyTxt}>{r.text || r.reply}</Text>
                        <Text style={s.replyDate}>{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : ""}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TextInput style={s.replyInput} placeholder="Type a reply..." placeholderTextColor={COLORS.mid}
                  value={replyText} onChangeText={setReplyText} multiline />
                <TouchableOpacity style={[s.sendBtn, replying && { opacity: 0.6 }]} onPress={() => sendReply(msg)} disabled={replying}>
                  {replying ? <ActivityIndicator color="#fff" size="small" /> :
                    <><Ionicons name="send" size={14} color="#fff" style={{ marginRight: 6 }} /><Text style={s.sendTxt}>Send Reply</Text></>}
                </TouchableOpacity>
              </>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  header:      { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 56, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:        { marginRight: 12 },
  title:       { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.dark },
  badge:       { backgroundColor: "#0891B2", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt:    { fontSize: 11, color: "#fff", fontWeight: "700" },
  content:     { padding: 16, gap: 10, paddingBottom: 40 },
  empty:       { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt:    { fontSize: 14, color: COLORS.mid },
  card:        { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  unread:      { borderColor: "#0891B2", borderWidth: 2 },
  cardTop:     { flexDirection: "row", alignItems: "flex-start" },
  subject:     { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  sender:      { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  rightCol:    { alignItems: "flex-end", gap: 4 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: "#0891B2" },
  date:        { fontSize: 11, color: COLORS.mid },
  body:        { fontSize: 13, color: COLORS.dark, lineHeight: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  repliesBox:  { marginTop: 12 },
  repliesLabel:{ fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", marginBottom: 6 },
  replyBubble: { backgroundColor: COLORS.primary + "12", borderRadius: 10, padding: 10, marginBottom: 6 },
  replyTxt:    { fontSize: 13, color: COLORS.dark },
  replyDate:   { fontSize: 10, color: COLORS.mid, marginTop: 4 },
  replyInput:  { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, fontSize: 13, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginTop: 12, minHeight: 60, textAlignVertical: "top" },
  sendBtn:     { backgroundColor: "#0891B2", borderRadius: 10, padding: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", marginTop: 8 },
  sendTxt:     { color: "#fff", fontWeight: "700", fontSize: 13 },
});
