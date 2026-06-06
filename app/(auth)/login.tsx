import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../src/lib/constants";
import { parentLogin, parentFirstLogin, sendResetOTP, resetPassword, teacherLogin, adminLogin, ownerLogin } from "../../src/lib/api";
import { useSession } from "../../src/store/session";
import LanguageSwitcher from "../../src/components/LanguageSwitcher";

type Mode =
  | "choose"
  | "parent_phone"
  | "parent_password"
  | "parent_first"
  | "parent_forgot"
  | "parent_otp"
  | "teacher"
  | "admin"
  | "owner";

export default function LoginScreen() {
  const router = useRouter();
  const { t }  = useTranslation();
  const { setSession } = useSession();

  const [mode, setMode]     = useState<Mode>("choose");
  const [phone, setPhone]   = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob]       = useState("");
  const [last4, setLast4]   = useState("");
  const [otp, setOtp]       = useState("");
  const [newPass, setNewPass] = useState("");
  const [user, setUser]     = useState("");
  const [pass, setPass]     = useState("");
  const [busy, setBusy]     = useState(false);

  const cleanPhone = () => phone.replace(/\s/g, "");

  // ── Parent: phone → password ────────────────────────────────────────────
  const handleContinuePhone = () => {
    if (cleanPhone().length < 10) { Alert.alert(t("enterValidPhone")); return; }
    setPassword("");
    setMode("parent_password");
  };

  // ── Parent: password login ──────────────────────────────────────────────
  const handleParentLogin = async () => {
    if (!password) { Alert.alert(t("fillAllFields")); return; }
    setBusy(true);
    const data = await parentLogin(cleanPhone(), password);
    setBusy(false);
    if (data.needsSetup) {
      setDob(""); setLast4("");
      setMode("parent_first");
      return;
    }
    if (data.error) { Alert.alert(t("loginFailed"), data.error); return; }
    await setSession({
      role: "parent", phone: cleanPhone(),
      name: data.childName || "", children: [],
      loginTime: Date.now(),
    });
    router.replace("/(main)/parent/home");
  };

  // ── Parent: first-time setup ────────────────────────────────────────────
  const handleFirstLogin = async () => {
    if (!dob || !last4) { Alert.alert(t("fillAllFields")); return; }
    setBusy(true);
    const data = await parentFirstLogin(cleanPhone(), dob, last4);
    setBusy(false);
    if (data.error) { Alert.alert("Error", data.error); return; }
    const msg = data.autoPass
      ? `Account setup complete!\n\n🔑 Your password: ${data.autoPass}\n\n📱 Save this password — you'll need it every time you log in.\n\nThis was also sent to your WhatsApp.`
      : "Account setup complete! Check WhatsApp for your login password.";
    Alert.alert("✅ Setup Complete", msg, [
      {
        text: "Continue →",
        onPress: async () => {
          await setSession({
            role: "parent", phone: cleanPhone(),
            name: data.childName || "", children: [],
            loginTime: Date.now(),
          });
          router.replace("/(main)/parent/home");
        },
      },
    ]);
  };

  // ── Parent: send reset OTP ──────────────────────────────────────────────
  const handleSendResetOTP = async () => {
    if (cleanPhone().length < 10) { Alert.alert(t("enterValidPhone")); return; }
    setBusy(true);
    const data = await sendResetOTP(cleanPhone());
    setBusy(false);
    if (data.error) { Alert.alert("Error", data.error); return; }
    setOtp(""); setNewPass("");
    setMode("parent_otp");
  };

  // ── Parent: reset password + auto-login ────────────────────────────────
  const handleResetPassword = async () => {
    if (otp.length < 6 || newPass.length < 8) { Alert.alert(t("fillAllFields")); return; }
    setBusy(true);
    const data = await resetPassword(cleanPhone(), otp, newPass);
    if (data.error) { setBusy(false); Alert.alert("Error", data.error); return; }
    const login = await parentLogin(cleanPhone(), newPass);
    setBusy(false);
    if (login.error) {
      setPassword(""); setMode("parent_password"); return;
    }
    await setSession({
      role: "parent", phone: cleanPhone(),
      name: login.childName || "", children: [],
      loginTime: Date.now(),
    });
    router.replace("/(main)/parent/home");
  };

  // ── Teacher login ───────────────────────────────────────────────────────
  const handleTeacherLogin = async () => {
    if (!user || !pass) { Alert.alert(t("fillAllFields")); return; }
    setBusy(true);
    const data = await teacherLogin(user, pass);
    setBusy(false);
    if (data.error) { Alert.alert(t("loginFailed"), data.error); return; }
    await setSession({
      role: "teacher", name: data.name || user,
      token: data.token, sectionId: data.sectionId, sectionName: data.sectionName,
      staffRole: data.role,
      loginTime: Date.now(),
    });
    // Transport staff (drivers/helpers) use the app to share the bus location daily —
    // send them straight to the Transport screen instead of the teacher dashboard.
    const transportStaff = ["Driver", "Helper"].includes(String(data.role || ""));
    router.replace(transportStaff ? "/(main)/teacher/transport" : "/(main)/teacher/home");
  };

  // ── Owner login ─────────────────────────────────────────────────────────
  const handleOwnerLogin = async () => {
    if (!user || !pass) { Alert.alert(t("fillAllFields")); return; }
    setBusy(true);
    const data = await ownerLogin(user, pass);
    setBusy(false);
    if (data.error) { Alert.alert(t("loginFailed"), data.error); return; }
    await setSession({
      role: "owner", name: data.name || user,
      username: user, token: data.token,
      loginTime: Date.now(),
    });
    router.replace("/(owner)/home");
  };

  // ── Admin login ─────────────────────────────────────────────────────────
  const handleAdminLogin = async () => {
    if (!user || !pass) { Alert.alert(t("fillAllFields")); return; }
    setBusy(true);
    const data = await adminLogin(user, pass);
    setBusy(false);
    if (data.error) { Alert.alert(t("loginFailed"), data.error); return; }
    await setSession({
      role: "admin", name: data.name || user,
      username: user, token: data.token,
      loginTime: Date.now(),
    });
    router.replace("/(admin)/home");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <Text style={s.logo}>iVa</Text>
          <Text style={s.tagline}>by IntelliVerify</Text>
          <View style={{ marginTop: 12 }}>
            <LanguageSwitcher />
          </View>
        </View>

        {/* Choose role */}
        {mode === "choose" && (
          <View style={s.card}>
            <Text style={s.title}>{t("whoAreYou")}</Text>
            <Text style={s.sub}>{t("selectRole")}</Text>
            <TouchableOpacity style={[s.roleBtn, { backgroundColor: COLORS.edu }]} onPress={() => { setPhone(""); setMode("parent_phone"); }}>
              <Text style={s.roleIcon}>👨‍👩‍👧</Text>
              <View>
                <Text style={s.roleName}>{t("parent")}</Text>
                <Text style={s.roleDesc}>{t("parentDesc")}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.roleBtn, { backgroundColor: COLORS.dark }]} onPress={() => { setUser(""); setPass(""); setMode("teacher"); }}>
              <Text style={s.roleIcon}>👩‍🏫</Text>
              <View>
                <Text style={s.roleName}>{t("teacherStaff")}</Text>
                <Text style={s.roleDesc}>{t("teacherDesc")}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.roleBtn, { backgroundColor: COLORS.orange }]} onPress={() => { setUser(""); setPass(""); setMode("admin"); }}>
              <Text style={s.roleIcon}>🏫</Text>
              <View>
                <Text style={s.roleName}>Admin</Text>
                <Text style={s.roleDesc}>School administrator portal</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.roleBtn, { backgroundColor: "#7C3AED" }]} onPress={() => { setUser(""); setPass(""); setMode("owner"); }}>
              <Text style={s.roleIcon}>👑</Text>
              <View>
                <Text style={s.roleName}>Owner</Text>
                <Text style={s.roleDesc}>School owner dashboard</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Parent: enter phone */}
        {mode === "parent_phone" && (
          <View style={s.card}>
            <TouchableOpacity onPress={() => setMode("choose")} style={s.back}>
              <Text style={s.backTxt}>{t("back")}</Text>
            </TouchableOpacity>
            <Text style={s.title}>{t("parentLogin")}</Text>
            <Text style={s.sub}>{t("enterWhatsApp")}</Text>
            <View style={s.phoneRow}>
              <View style={s.countryCode}><Text style={s.ccTxt}>🇮🇳 +91</Text></View>
              <TextInput
                style={s.phoneInput}
                placeholder="10-digit mobile number"
                placeholderTextColor={COLORS.mid}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <TouchableOpacity style={s.btn} onPress={handleContinuePhone}>
              <Text style={s.btnTxt}>{t("continueBtn")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Parent: enter password */}
        {mode === "parent_password" && (
          <View style={s.card}>
            <TouchableOpacity onPress={() => setMode("parent_phone")} style={s.back}>
              <Text style={s.backTxt}>{t("changeNumber")}</Text>
            </TouchableOpacity>
            <Text style={s.title}>{t("parentLogin")}</Text>
            <Text style={s.sub}>{t("enterPassword")}</Text>
            <TextInput
              style={s.input}
              placeholder={t("password")}
              placeholderTextColor={COLORS.mid}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={[s.btn, busy && s.btnDisabled]} onPress={handleParentLogin} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{t("loginBtn")}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setMode("parent_forgot"); }} style={s.linkRow}>
              <Text style={s.linkTxt}>{t("forgotPassword")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setDob(""); setLast4(""); setMode("parent_first"); }} style={s.linkRow}>
              <Text style={[s.linkTxt, { color: COLORS.mid, fontSize: 12 }]}>{t("firstTimeUser")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Parent: first-time setup (DOB + last4) */}
        {mode === "parent_first" && (
          <View style={s.card}>
            <TouchableOpacity onPress={() => setMode("parent_password")} style={s.back}>
              <Text style={s.backTxt}>{t("back")}</Text>
            </TouchableOpacity>
            <Text style={s.title}>{t("firstTimeSetup")}</Text>
            <Text style={s.sub}>{t("firstTimeDesc")}</Text>

            {/* DOB hint box */}
            <View style={s.hintBox}>
              <Text style={s.hintText}>
                📅 Enter child's date of birth{"\n"}
                Format: <Text style={{ fontWeight: "800" }}>DD/MM/YYYY</Text>
                {"  "}e.g. <Text style={{ fontWeight: "700" }}>25/12/2020</Text>
              </Text>
            </View>

            <TextInput
              style={s.input}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={COLORS.mid}
              keyboardType="numbers-and-punctuation"
              value={dob}
              onChangeText={setDob}
            />
            <TextInput
              style={s.input}
              placeholder={t("last4Label")}
              placeholderTextColor={COLORS.mid}
              keyboardType="number-pad"
              maxLength={4}
              value={last4}
              onChangeText={setLast4}
            />
            <TouchableOpacity style={[s.btn, busy && s.btnDisabled]} onPress={handleFirstLogin} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{t("verifySetup")}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Parent: forgot password — send OTP */}
        {mode === "parent_forgot" && (
          <View style={s.card}>
            <TouchableOpacity onPress={() => setMode("parent_password")} style={s.back}>
              <Text style={s.backTxt}>{t("back")}</Text>
            </TouchableOpacity>
            <Text style={s.title}>{t("resetPassword")}</Text>
            <Text style={s.sub}>{t("resetDesc")}</Text>
            <View style={s.phoneRow}>
              <View style={s.countryCode}><Text style={s.ccTxt}>🇮🇳 +91</Text></View>
              <TextInput
                style={s.phoneInput}
                placeholder="10-digit mobile number"
                placeholderTextColor={COLORS.mid}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <TouchableOpacity style={[s.btn, busy && s.btnDisabled]} onPress={handleSendResetOTP} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{t("sendOtp")}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Parent: enter OTP + new password */}
        {mode === "parent_otp" && (
          <View style={s.card}>
            <TouchableOpacity onPress={() => setMode("parent_forgot")} style={s.back}>
              <Text style={s.backTxt}>{t("back")}</Text>
            </TouchableOpacity>
            <Text style={s.title}>{t("resetPassword")}</Text>
            <Text style={s.sub}>{t("otpSentTo", { phone: cleanPhone() })}</Text>
            <TextInput
              style={[s.input, { letterSpacing: 8, fontSize: 22, textAlign: "center" }]}
              placeholder="• • • • • •"
              placeholderTextColor={COLORS.mid}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
            <TextInput
              style={s.input}
              placeholder={t("newPassPlaceholder")}
              placeholderTextColor={COLORS.mid}
              secureTextEntry
              value={newPass}
              onChangeText={setNewPass}
            />
            <TouchableOpacity style={[s.btn, busy && s.btnDisabled]} onPress={handleResetPassword} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{t("resetLogin")}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Admin */}
        {mode === "admin" && (
          <View style={s.card}>
            <TouchableOpacity onPress={() => setMode("choose")} style={s.back}>
              <Text style={s.backTxt}>{t("back")}</Text>
            </TouchableOpacity>
            <Text style={s.title}>Admin Login</Text>
            <Text style={s.sub}>School administrator credentials</Text>
            <TextInput
              style={s.input}
              placeholder={t("username")}
              placeholderTextColor={COLORS.mid}
              autoCapitalize="none"
              value={user}
              onChangeText={setUser}
            />
            <TextInput
              style={s.input}
              placeholder={t("password")}
              placeholderTextColor={COLORS.mid}
              secureTextEntry
              value={pass}
              onChangeText={setPass}
            />
            <TouchableOpacity style={[s.btn, { backgroundColor: COLORS.orange }, busy && s.btnDisabled]} onPress={handleAdminLogin} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Login as Admin</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Owner */}
        {mode === "owner" && (
          <View style={s.card}>
            <TouchableOpacity onPress={() => setMode("choose")} style={s.back}>
              <Text style={s.backTxt}>{t("back")}</Text>
            </TouchableOpacity>
            <Text style={s.title}>Owner Login</Text>
            <Text style={s.sub}>School owner credentials</Text>
            <TextInput
              style={s.input}
              placeholder={t("username")}
              placeholderTextColor={COLORS.mid}
              autoCapitalize="none"
              value={user}
              onChangeText={setUser}
            />
            <TextInput
              style={s.input}
              placeholder={t("password")}
              placeholderTextColor={COLORS.mid}
              secureTextEntry
              value={pass}
              onChangeText={setPass}
            />
            <TouchableOpacity style={[s.btn, { backgroundColor: "#7C3AED" }, busy && s.btnDisabled]} onPress={handleOwnerLogin} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Login as Owner</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Teacher */}
        {mode === "teacher" && (
          <View style={s.card}>
            <TouchableOpacity onPress={() => setMode("choose")} style={s.back}>
              <Text style={s.backTxt}>{t("back")}</Text>
            </TouchableOpacity>
            <Text style={s.title}>{t("staffLogin")}</Text>
            <Text style={s.sub}>{t("schoolCredentials")}</Text>
            <TextInput
              style={s.input}
              placeholder={t("username")}
              placeholderTextColor={COLORS.mid}
              autoCapitalize="none"
              value={user}
              onChangeText={setUser}
            />
            <TextInput
              style={s.input}
              placeholder={t("password")}
              placeholderTextColor={COLORS.mid}
              secureTextEntry
              value={pass}
              onChangeText={setPass}
            />
            <TouchableOpacity style={[s.btn, { backgroundColor: COLORS.dark }, busy && s.btnDisabled]} onPress={handleTeacherLogin} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{t("loginBtn")}</Text>}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:    { flexGrow: 1, backgroundColor: COLORS.primary, alignItems: "center", padding: 20, paddingTop: 60, paddingBottom: 40 },
  header:       { alignItems: "center", marginBottom: 32 },
  logo:         { fontSize: 48, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  tagline:      { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  card:         { width: "100%", backgroundColor: "#fff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  title:        { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginBottom: 6 },
  sub:          { fontSize: 13, color: COLORS.mid, marginBottom: 24 },
  roleBtn:      { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, padding: 16, marginBottom: 12 },
  roleIcon:     { fontSize: 28 },
  roleName:     { fontSize: 16, fontWeight: "700", color: "#fff" },
  roleDesc:     { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  back:         { marginBottom: 16 },
  backTxt:      { color: COLORS.edu, fontWeight: "600", fontSize: 13 },
  phoneRow:     { flexDirection: "row", gap: 8, marginBottom: 20 },
  countryCode:  { backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  ccTxt:        { fontSize: 14, color: COLORS.dark, fontWeight: "600" },
  phoneInput:   { flex: 1, backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border },
  input:        { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  btn:          { backgroundColor: COLORS.edu, borderRadius: 14, padding: 16, alignItems: "center" },
  btnDisabled:  { opacity: 0.6 },
  btnTxt:       { color: "#fff", fontSize: 16, fontWeight: "700" },
  linkRow:      { marginTop: 14, alignItems: "center" },
  linkTxt:      { color: COLORS.edu, fontWeight: "600", fontSize: 13 },
  hintBox:      { backgroundColor: "#FFF8E1", borderRadius: 10, padding: 12, marginBottom: 12,
                  borderWidth: 1, borderColor: "#FFE082" },
  hintText:     { fontSize: 13, color: "#795548", lineHeight: 20 },
});
