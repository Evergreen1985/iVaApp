import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
         TextInput, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../../src/lib/constants";
import { getAdminSettings, updateAdminSettings } from "../../src/lib/api";
import { useSession } from "../../src/store/session";

export default function AdminSettings() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.token || "";

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  // School info
  const [schoolName, setSchoolName]     = useState("");
  const [tagline, setTagline]           = useState("");
  const [phone, setPhone]               = useState("");
  const [email, setEmail]               = useState("");
  const [address, setAddress]           = useState("");
  const [website, setWebsite]           = useState("");

  // Toggles
  const [feeReminders, setFeeReminders] = useState(true);
  const [birthdayAlerts, setBirthdayAlerts] = useState(true);
  const [parentNotify, setParentNotify] = useState(true);
  const [referralEnabled, setReferralEnabled] = useState(true);
  const [testimonialEnabled, setTestimonialEnabled] = useState(true);

  // Academic
  const [academicYear, setAcademicYear] = useState("");
  const [currency, setCurrency]         = useState("INR");

  useEffect(() => {
    (async () => {
      try {
        const res = await getAdminSettings(token);
        const cfg = res?.config ?? res ?? {};
        setSchoolName(cfg.school_name || cfg.schoolName || "");
        setTagline(cfg.tagline || "");
        setPhone(cfg.phone || "");
        setEmail(cfg.email || "");
        setAddress(cfg.address || "");
        setWebsite(cfg.website || "");
        setAcademicYear(cfg.academic_year || cfg.academicYear || "");
        setCurrency(cfg.currency || "INR");
        setFeeReminders(cfg.fee_reminders ?? cfg.feeReminders ?? true);
        setBirthdayAlerts(cfg.birthday_alerts ?? cfg.birthdayAlerts ?? true);
        setParentNotify(cfg.parent_notifications ?? cfg.parentNotify ?? true);
        setReferralEnabled(cfg.referral_enabled ?? cfg.referralEnabled ?? true);
        setTestimonialEnabled(cfg.testimonial_enabled ?? cfg.testimonialEnabled ?? true);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await updateAdminSettings(token, {
        schoolName, tagline, phone, email, address, website,
        academicYear, currency,
        feeReminders, birthdayAlerts, parentNotify, referralEnabled, testimonialEnabled,
      });
      Alert.alert("Saved", "Settings updated successfully.");
    } catch { Alert.alert("Error", "Failed to save settings."); }
    setSaving(false);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={COLORS.dark} /></TouchableOpacity>
        <Text style={s.title}>Settings</Text>
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveTxt}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.section}>School Information</Text>
        <View style={s.card}>
          <Text style={s.label}>School Name</Text>
          <TextInput style={s.input} value={schoolName} onChangeText={setSchoolName} placeholder="Evergreen Preschool" placeholderTextColor={COLORS.mid} />
          <Text style={s.label}>Tagline</Text>
          <TextInput style={s.input} value={tagline} onChangeText={setTagline} placeholder="Growing together" placeholderTextColor={COLORS.mid} />
          <Text style={s.label}>Phone</Text>
          <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor={COLORS.mid} keyboardType="phone-pad" />
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="admin@school.com" placeholderTextColor={COLORS.mid} keyboardType="email-address" autoCapitalize="none" />
          <Text style={s.label}>Address</Text>
          <TextInput style={[s.input, { minHeight: 70, textAlignVertical: "top" }]} value={address} onChangeText={setAddress} placeholder="School address" placeholderTextColor={COLORS.mid} multiline />
          <Text style={s.label}>Website</Text>
          <TextInput style={s.input} value={website} onChangeText={setWebsite} placeholder="https://yourschool.com" placeholderTextColor={COLORS.mid} keyboardType="url" autoCapitalize="none" />
        </View>

        <Text style={s.section}>Academic</Text>
        <View style={s.card}>
          <Text style={s.label}>Academic Year</Text>
          <TextInput style={s.input} value={academicYear} onChangeText={setAcademicYear} placeholder="2025-26" placeholderTextColor={COLORS.mid} />
          <Text style={s.label}>Currency</Text>
          <TextInput style={s.input} value={currency} onChangeText={setCurrency} placeholder="INR" placeholderTextColor={COLORS.mid} />
        </View>

        <Text style={s.section}>Notifications & Features</Text>
        <View style={s.card}>
          {([
            { label: "Fee Reminders", desc: "Send automatic fee due reminders to parents", val: feeReminders, set: setFeeReminders },
            { label: "Birthday Alerts", desc: "Alert teachers about upcoming student birthdays", val: birthdayAlerts, set: setBirthdayAlerts },
            { label: "Parent Notifications", desc: "Enable push notifications to parent app", val: parentNotify, set: setParentNotify },
            { label: "Referral Program", desc: "Allow parents to refer other parents", val: referralEnabled, set: setReferralEnabled },
            { label: "Testimonials", desc: "Let parents submit testimonials", val: testimonialEnabled, set: setTestimonialEnabled },
          ] as const).map((item, i) => (
            <View key={i} style={[s.toggleRow, i > 0 && s.toggleBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>{item.label}</Text>
                <Text style={s.toggleDesc}>{item.desc}</Text>
              </View>
              <Switch value={item.val} onValueChange={item.set}
                trackColor={{ false: COLORS.border, true: COLORS.primary + "80" }}
                thumbColor={item.val ? COLORS.primary : "#fff"} />
            </View>
          ))}
        </View>
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
  saveBtn:     { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveTxt:     { color: "#fff", fontWeight: "700", fontSize: 13 },
  content:     { padding: 16, gap: 4, paddingBottom: 40 },
  section:     { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  card:        { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  label:       { fontSize: 11, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  input:       { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  toggleRow:   { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  toggleBorder:{ borderTopWidth: 1, borderTopColor: COLORS.border },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  toggleDesc:  { fontSize: 12, color: COLORS.mid, marginTop: 2 },
});
