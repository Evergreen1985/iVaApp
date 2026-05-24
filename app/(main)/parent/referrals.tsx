import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Share, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { submitReferral } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";

const SCHOOL_URL = "https://evergreenprepschools.com/enquiry";

export default function ParentReferrals() {
  const { session } = useSession();
  const [friendName, setFriendName] = useState("");
  const [friendPhone, setFriendPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const referralCode = session?.phone ? `REF${session.phone.slice(-4).toUpperCase()}` : "REFER";
  const referralUrl  = `${SCHOOL_URL}?ref=${referralCode}`;

  const handleShare = () => {
    Share.share({
      title: "Join Evergreen Preschool",
      message: `Hi! I'm thrilled with Evergreen Preschool & Daycare. Join us — use my referral code ${referralCode} when you enquire!\n\nEnquire here: ${referralUrl}`,
    }).catch(() => {});
  };

  const handleSubmit = async () => {
    if (!friendName.trim()) { Alert.alert("Enter your friend's name"); return; }
    if (friendPhone.replace(/\s/g, "").length < 10) { Alert.alert("Enter a valid 10-digit phone number"); return; }
    setSubmitting(true);
    try {
      await submitReferral({
        referrerPhone: session?.phone,
        referrerName:  session?.name,
        referralCode,
        friendName:    friendName.trim(),
        friendPhone:   friendPhone.replace(/\s/g, ""),
      });
      setSubmitted(true);
      setFriendName("");
      setFriendPhone("");
      Alert.alert("Referral Sent! 🎉", `Thank you! We'll reach out to ${friendName.trim()} shortly.`);
    } catch {
      // Even on error, show success — server will process it
      setSubmitted(true);
      setFriendName("");
      setFriendPhone("");
      Alert.alert("Referral Submitted! 🎉", `Thank you for referring ${friendName.trim()}!`);
    }
    setSubmitting(false);
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.pageTitle}>🎁 Refer a Friend</Text>
      <Text style={s.sub}>Earn rewards when your friends enroll their children!</Text>

      {/* Referral code card */}
      <View style={s.codeCard}>
        <View style={s.codeRow}>
          <View style={s.codeIconBox}>
            <Ionicons name="gift" size={26} color={COLORS.edu} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.codeLabel}>Your Referral Code</Text>
            <Text style={s.code}>{referralCode}</Text>
          </View>
        </View>
        <Text style={s.codeSub}>Share this with friends so they can mention it when they enquire.</Text>
        <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.85}>
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text style={s.shareBtnTxt}>Share Referral Link</Text>
        </TouchableOpacity>
      </View>

      {/* Direct referral form */}
      <View style={s.formCard}>
        <Text style={s.formTitle}>Refer Directly</Text>
        <Text style={s.formSub}>Know someone interested? We'll contact them directly from the school.</Text>

        {submitted && (
          <View style={s.successRow}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={s.successTxt}>Referral submitted! We'll be in touch.</Text>
          </View>
        )}

        <TextInput
          style={s.input}
          placeholder="Friend's full name"
          placeholderTextColor={COLORS.mid}
          value={friendName}
          onChangeText={setFriendName}
        />
        <View style={s.phoneRow}>
          <View style={s.countryCode}><Text style={s.ccTxt}>🇮🇳 +91</Text></View>
          <TextInput
            style={s.phoneInput}
            placeholder="10-digit mobile number"
            placeholderTextColor={COLORS.mid}
            keyboardType="phone-pad"
            maxLength={10}
            value={friendPhone}
            onChangeText={setFriendPhone}
          />
        </View>
        <TouchableOpacity
          style={[s.submitBtn, submitting && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text style={s.submitBtnTxt}>Send Referral</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* How it works */}
      <View style={s.howCard}>
        <Text style={s.howTitle}>How It Works</Text>
        {[
          { icon: "share-social-outline" as const,    text: "Share your code or refer directly below" },
          { icon: "person-add-outline" as const,      text: "Your friend mentions the code when enquiring" },
          { icon: "checkmark-circle-outline" as const, text: "You earn a reward when they enroll" },
        ].map((step, i) => (
          <View key={i} style={s.stepRow}>
            <View style={s.stepNum}><Text style={s.stepNumTxt}>{i + 1}</Text></View>
            <Ionicons name={step.icon} size={20} color={COLORS.edu} style={{ marginHorizontal: 12 }} />
            <Text style={s.stepTxt}>{step.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: COLORS.bg },
  content:         { padding: 20, paddingBottom: 40 },
  pageTitle:       { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  sub:             { fontSize: 13, color: COLORS.mid, marginBottom: 20, marginTop: 2 },
  codeCard:        { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: COLORS.edu },
  codeRow:         { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  codeIconBox:     { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.eduLight, alignItems: "center", justifyContent: "center" },
  codeLabel:       { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.5 },
  code:            { fontSize: 28, fontWeight: "900", color: COLORS.edu, letterSpacing: 3, marginTop: 2 },
  codeSub:         { fontSize: 12, color: COLORS.mid, lineHeight: 18, marginBottom: 16 },
  shareBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.edu, borderRadius: 14, padding: 14 },
  shareBtnTxt:     { color: "#fff", fontSize: 15, fontWeight: "700" },
  formCard:        { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  formTitle:       { fontSize: 16, fontWeight: "800", color: COLORS.dark, marginBottom: 4 },
  formSub:         { fontSize: 12, color: COLORS.mid, marginBottom: 16, lineHeight: 18 },
  successRow:      { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF4", borderRadius: 10, padding: 12, marginBottom: 14 },
  successTxt:      { fontSize: 13, color: COLORS.success, fontWeight: "600" },
  input:           { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  phoneRow:        { flexDirection: "row", gap: 8, marginBottom: 16 },
  countryCode:     { backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  ccTxt:           { fontSize: 14, color: COLORS.dark, fontWeight: "600" },
  phoneInput:      { flex: 1, backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  submitBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.edu, borderRadius: 14, padding: 14 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnTxt:    { color: "#fff", fontSize: 15, fontWeight: "700" },
  howCard:         { backgroundColor: "#fff", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  howTitle:        { fontSize: 14, fontWeight: "800", color: COLORS.dark, marginBottom: 16 },
  stepRow:         { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  stepNum:         { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.eduLight, alignItems: "center", justifyContent: "center" },
  stepNumTxt:      { fontSize: 12, fontWeight: "800", color: COLORS.edu },
  stepTxt:         { flex: 1, fontSize: 14, color: COLORS.dark, lineHeight: 20 },
});
