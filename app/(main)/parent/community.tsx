import { useEffect, useState, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator,
  Pressable, BackHandler, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "../../../src/store/session";
import { supabase } from "../../../src/lib/supabase";
import { COLORS, EDU_API } from "../../../src/lib/constants";

const BLOCKED_KEY = "community_blocked";

const EMOJIS = ["❤️","😂","😮","😢","👏","🔥","🎉","👍","✅","😍","🙏","✨"];

function slugIcon(slug: string): string {
  if (slug.includes("parent"))   return "people";
  if (slug.includes("announce")) return "megaphone";
  if (slug.includes("event"))    return "calendar";
  if (slug.includes("photo"))    return "images-outline";
  if (slug.includes("learn"))    return "book-outline";
  return "chatbubbles-outline";
}

function timeLabel(iso: string) {
  const d = new Date(iso), now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000)  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 172_800_000) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type Channel = { id: string; name: string; slug: string; description: string; message_count: number };
type Message  = {
  id: string; member_id: string; display_name: string; avatar_emoji: string;
  content: string; created_at: string; reactions: Record<string, number>;
};

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { session, activeChild: activeChildFromStore } = useSession();

  const [channels, setChannels]           = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [memberId, setMemberId]           = useState<string | null>(null);
  const [text, setText]                   = useState("");
  const [sending, setSending]             = useState(false);
  const [chatLoading, setChatLoading]     = useState(false);
  const [listLoading, setListLoading]     = useState(true);
  const [reactingTo, setReactingTo]       = useState<string | null>(null);
  const [blocked, setBlocked]             = useState<Set<string>>(new Set());

  const childPhoto = activeChildFromStore?.photo_url ?? null;

  const subRef  = useRef<any>(null);
  const listRef = useRef<FlatList>(null);
  const activeChanRef = useRef<Channel | null>(null);

  useEffect(() => { activeChanRef.current = activeChannel; }, [activeChannel]);

  useEffect(() => {
    fetch(`${EDU_API}/api/community/channels`)
      .then(r => r.json())
      .then(d => setChannels(d.channels || []))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (activeChanRef.current) { leaveChat(); return true; }
      return false;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => () => cleanupSub(), []);

  // Load the device's blocked-users list
  useEffect(() => {
    AsyncStorage.getItem(BLOCKED_KEY)
      .then(v => { if (v) setBlocked(new Set(JSON.parse(v))); })
      .catch(() => {});
  }, []);

  const cleanupSub = () => {
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }
  };

  const leaveChat = () => {
    cleanupSub();
    setActiveChannel(null);
    setMessages([]);
    setMemberId(null);
    setReactingTo(null);
    setText("");
  };

  const openChannel = async (ch: Channel) => {
    cleanupSub();
    setActiveChannel(ch);
    setMessages([]);
    setChatLoading(true);

    try {
      const [joinRes, msgRes] = await Promise.all([
        fetch(`${EDU_API}/api/community/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel_id:   ch.id,
            user_type:    "parent",
            user_ref:     session?.phone || "",
            display_name: session?.name  || "Parent",
            avatar_emoji: "😊",
          }),
        }),
        fetch(`${EDU_API}/api/community/messages?channel_id=${ch.id}`),
      ]);
      const [joinData, msgData] = await Promise.all([joinRes.json(), msgRes.json()]);
      setMemberId(joinData.member?.id || null);
      setMessages(msgData.messages || []);
    } catch {}

    setChatLoading(false);

    const sub = supabase
      .channel(`chat-${ch.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "community_messages", filter: `channel_id=eq.${ch.id}`,
      }, ({ new: msg }) => {
        setMessages(prev =>
          prev.find(m => m.id === (msg as any).id)
            ? prev
            : [...prev, { ...(msg as any), reactions: {} }]
        );
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
      })
      .subscribe();
    subRef.current = sub;
  };

  const sendMessage = async () => {
    if (!text.trim() || !activeChannel || !memberId || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      const res = await fetch(`${EDU_API}/api/community/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id:   activeChannel.id,
          member_id:    memberId,
          display_name: session?.name || "Parent",
          user_type:    "parent",
          avatar_emoji: "😊",
          content,
          msg_type:     "text",
        }),
      });
      const { message } = await res.json();
      if (message) {
        setMessages(prev =>
          prev.find(m => m.id === message.id) ? prev : [...prev, { ...message, reactions: {} }]
        );
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
      }
    } catch {}
    setSending(false);
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!memberId) return;
    setReactingTo(null);
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const r = { ...m.reactions };
      if (r[emoji]) { r[emoji]--; if (!r[emoji]) delete r[emoji]; } else { r[emoji] = 1; }
      return { ...m, reactions: r };
    }));
    fetch(`${EDU_API}/api/community/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: msgId, member_id: memberId, emoji }),
    }).catch(() => {});
  };

  // ── Moderation: block (device-side) + report (to school admin) ───────────
  const persistBlocked = async (nx: Set<string>) => {
    setBlocked(nx);
    try { await AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify([...nx])); } catch {}
  };

  const blockUser = (memberId: string, name: string) => {
    setReactingTo(null);
    Alert.alert(
      `Block ${name}?`,
      "You will no longer see messages from this person in the community. You can unblock them later.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Block", style: "destructive", onPress: () => {
            const nx = new Set(blocked); nx.add(memberId); persistBlocked(nx);
          } },
      ],
    );
  };

  const unblockAll = () => {
    Alert.alert("Unblock everyone?", "Show messages from all blocked people again?", [
      { text: "Cancel", style: "cancel" },
      { text: "Unblock all", onPress: () => persistBlocked(new Set()) },
    ]);
  };

  const reportMessage = (msg: Message) => {
    setReactingTo(null);
    Alert.alert(
      "Report message",
      "Report this message to the school admin for review?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Report", style: "destructive", onPress: async () => {
            try {
              await supabase.from("community_reports").insert({
                message_id:         msg.id,
                channel_id:         activeChannel?.id ?? null,
                reported_member_id: msg.member_id,
                reported_name:      msg.display_name,
                reported_content:   msg.content,
                reporter_type:      "parent",
                reporter_ref:       session?.phone || "",
                reporter_name:      session?.name  || "Parent",
              });
            } catch {}
            Alert.alert("Reported", "Thank you. This message has been sent to the school admin for review.");
          } },
      ],
    );
  };

  const renderMessage = ({ item: msg }: { item: Message }) => {
    const mine       = msg.member_id === memberId;
    const showPicker = reactingTo === msg.id;
    return (
      <View style={{ marginBottom: 8 }}>
        <Pressable
          onLongPress={() => setReactingTo(showPicker ? null : msg.id)}
          style={[s.msgRow, mine && s.msgRowMine]}
        >
          {!mine ? (
            <View style={s.avt}><Text style={s.avtEmoji}>{msg.avatar_emoji || "😊"}</Text></View>
          ) : childPhoto ? (
            <Image source={{ uri: childPhoto }} style={s.avtImg} />
          ) : (
            <View style={[s.avt, s.avtMine]}>
              <Text style={s.avtInit}>{(session?.name || "P")[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={[s.bubble, mine && s.bubbleMine]}>
            {!mine && <Text style={s.senderName}>{msg.display_name}</Text>}
            <Text style={[s.msgTxt, mine && s.msgTxtMine]}>{msg.content}</Text>
            <Text style={[s.msgTime, mine && s.msgTimeMine]}>{timeLabel(msg.created_at)}</Text>
            {Object.keys(msg.reactions).length > 0 && (
              <View style={s.reactionRow}>
                {Object.entries(msg.reactions).filter(([, c]) => c > 0).map(([e, c]) => (
                  <TouchableOpacity key={e} style={s.reactionPill} onPress={() => handleReact(msg.id, e)}>
                    <Text style={s.reactionE}>{e}</Text>
                    {c > 1 && <Text style={s.reactionC}>{c}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Pressable>
        {showPicker && (
          <View style={[s.emojiPicker, mine && s.emojiPickerMine]}>
            {EMOJIS.map(e => (
              <TouchableOpacity key={e} onPress={() => handleReact(msg.id, e)} style={s.emojiBtn}>
                <Text style={s.emojiTxt}>{e}</Text>
              </TouchableOpacity>
            ))}
            {!mine && (
              <View style={s.modRow}>
                <TouchableOpacity style={s.modBtn} onPress={() => reportMessage(msg)}>
                  <Ionicons name="flag-outline" size={14} color={COLORS.error} />
                  <Text style={s.modBtnTxt}>Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.modBtn} onPress={() => blockUser(msg.member_id, msg.display_name)}>
                  <Ionicons name="ban-outline" size={14} color={COLORS.error} />
                  <Text style={s.modBtnTxt}>Block</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (!activeChannel) {
    return (
      <View style={s.root}>
        <View style={[s.hdr, { paddingTop: insets.top + 14 }]}>
          <Ionicons name="people" size={22} color={COLORS.edu} />
          <View style={{ flex: 1 }}>
            <Text style={s.hdrTitle}>Community</Text>
            <Text style={s.hdrSub}>Connect with your school family</Text>
          </View>
        </View>
        {listLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>
        ) : channels.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.mid} />
            <Text style={[s.emptyTxt, { marginTop: 12 }]}>No channels yet</Text>
          </View>
        ) : (
          <FlatList
            data={channels}
            keyExtractor={c => c.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item: ch }) => (
              <TouchableOpacity style={s.chCard} onPress={() => openChannel(ch)} activeOpacity={0.8}>
                <View style={s.chIconBox}>
                  <Ionicons name={slugIcon(ch.slug) as any} size={22} color={COLORS.edu} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.chName}>{ch.name}</Text>
                  {!!ch.description && <Text style={s.chDesc} numberOfLines={1}>{ch.description}</Text>}
                </View>
                {ch.message_count > 0 && (
                  <View style={s.chBadge}>
                    <Text style={s.chBadgeTxt}>{ch.message_count > 99 ? "99+" : ch.message_count}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={COLORS.mid} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[s.hdr, { paddingTop: insets.top + 14, flexDirection: "row", alignItems: "center", gap: 12 }]}>
        <TouchableOpacity onPress={leaveChat} style={{ padding: 2 }}>
          <Ionicons name="arrow-back" size={22} color={COLORS.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.hdrTitle}>{activeChannel.name}</Text>
          {!!activeChannel.description && <Text style={s.hdrSub} numberOfLines={1}>{activeChannel.description}</Text>}
        </View>
        {blocked.size > 0 && (
          <TouchableOpacity onPress={unblockAll} style={s.unblockBtn}>
            <Ionicons name="ban" size={12} color={COLORS.error} />
            <Text style={s.unblockTxt}>Unblock {blocked.size}</Text>
          </TouchableOpacity>
        )}
        <View style={[s.chIconBox, { width: 38, height: 38, borderRadius: 12 }]}>
          <Ionicons name={slugIcon(activeChannel.slug) as any} size={18} color={COLORS.edu} />
        </View>
      </View>
      {chatLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages.filter(m => !blocked.has(m.member_id))}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 20 }}
          renderItem={renderMessage}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="chatbubbles-outline" size={52} color={COLORS.mid} />
              <Text style={[s.emptyTxt, { marginTop: 14 }]}>{"No messages yet\nSay hello! 👋"}</Text>
            </View>
          }
        />
      )}
      <View style={[s.composer, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
        <TextInput
          style={s.compInput}
          placeholder="Type a message…"
          placeholderTextColor={COLORS.mid}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && s.sendDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hdr:      { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 18, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  hdrTitle: { fontSize: 18, fontWeight: "800", color: COLORS.dark },
  hdrSub:   { fontSize: 12, color: COLORS.mid, marginTop: 1 },
  chCard:    { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  chIconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#EEF8F6", alignItems: "center", justifyContent: "center" },
  chName:    { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  chDesc:    { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  chBadge:   { backgroundColor: COLORS.edu, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2 },
  chBadgeTxt:{ fontSize: 10, fontWeight: "800", color: "#fff" },
  msgRow:      { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRowMine:  { justifyContent: "flex-end" },
  avt:         { width: 34, height: 34, borderRadius: 17, backgroundColor: "#EEF8F6", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avtMine:     { backgroundColor: "#7C3AED18" },
  avtImg:      { width: 34, height: 34, borderRadius: 17, flexShrink: 0 },
  avtEmoji:    { fontSize: 18 },
  avtInit:     { fontSize: 14, fontWeight: "700", color: "#7C3AED" },
  bubble:      { maxWidth: "72%", backgroundColor: "#fff", borderRadius: 18, borderBottomLeftRadius: 4, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  bubbleMine:  { backgroundColor: COLORS.edu, borderBottomLeftRadius: 18, borderBottomRightRadius: 4, borderColor: "transparent" },
  senderName:  { fontSize: 11, fontWeight: "700", color: COLORS.edu, marginBottom: 3 },
  msgTxt:      { fontSize: 14, color: COLORS.dark, lineHeight: 20 },
  msgTxtMine:  { color: "#fff" },
  msgTime:     { fontSize: 10, color: COLORS.mid, marginTop: 4, alignSelf: "flex-end" },
  msgTimeMine: { color: "rgba(255,255,255,0.65)" },
  reactionRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  reactionPill:{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.07)", borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, gap: 2 },
  reactionE:   { fontSize: 13 },
  reactionC:   { fontSize: 11, fontWeight: "700", color: COLORS.dark },
  emojiPicker:     { flexDirection: "row", flexWrap: "wrap", gap: 4, backgroundColor: "#fff", borderRadius: 16, padding: 8, borderWidth: 1, borderColor: COLORS.border, marginTop: 4, marginLeft: 42, alignSelf: "flex-start", elevation: 5 },
  emojiPickerMine: { marginLeft: 0, marginRight: 42, alignSelf: "flex-end" },
  emojiBtn:        { padding: 5 },
  emojiTxt:        { fontSize: 20 },
  modRow:          { flexDirection: "row", gap: 8, width: "100%", marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  modBtn:          { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: COLORS.error + "55", backgroundColor: COLORS.error + "10" },
  modBtnTxt:       { fontSize: 12, fontWeight: "700", color: COLORS.error },
  unblockBtn:      { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, backgroundColor: COLORS.error + "12" },
  unblockTxt:      { fontSize: 11, fontWeight: "700", color: COLORS.error },
  emptyTxt: { fontSize: 14, color: COLORS.mid, textAlign: "center", lineHeight: 22 },
  composer:    { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 10, gap: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: COLORS.border },
  compInput:   { flex: 1, backgroundColor: COLORS.bg, borderRadius: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 14, color: COLORS.dark, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.edu, alignItems: "center", justifyContent: "center" },
  sendDisabled:{ backgroundColor: "#C8D0DA" },
});
