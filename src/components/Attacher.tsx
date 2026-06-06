import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../lib/constants";
import { pickImageOrVideo, takePhoto, imagesToPdf, uploadToBucket, uploadBytes } from "../lib/uploads";

/**
 * Attach button → sheet offering: Take photo · Choose photo/video · Scan to PDF
 * (capture multiple photos in order → combined into a single PDF).
 * Calls onUploaded(url, kind) for each uploaded file. Tap again to add more.
 */
export default function Attacher({
  bucket, folder, label = "Attach", onUploaded,
}: {
  bucket: string;
  folder: string;
  label?: string;
  onUploaded: (url: string, kind: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const uploadPicked = async (picked: any) => {
    if (!picked) return;
    setBusy(true);
    const url = await uploadToBucket(bucket, folder, picked);
    setBusy(false);
    if (url) onUploaded(url, picked.kind);
  };

  const onTakePhoto = async () => { setOpen(false); await uploadPicked(await takePhoto()); };
  const onPick      = async () => { setOpen(false); await uploadPicked(await pickImageOrVideo()); };

  const onScan = async () => {
    setOpen(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Camera permission needed", "Please allow camera access."); return; }
    const uris: string[] = [];
    // capture pages one by one, in order
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      if (!r.canceled && r.assets?.[0]) uris.push(r.assets[0].uri);
      const again = await new Promise<boolean>((res) =>
        Alert.alert("Scan to PDF", `${uris.length} page(s) captured.`, [
          { text: "Finish", onPress: () => res(false) },
          { text: "Add page", onPress: () => res(true) },
        ]),
      );
      if (!again) break;
    }
    if (!uris.length) return;
    setBusy(true);
    try {
      const bytes = await imagesToPdf(uris);
      const url = await uploadBytes(bucket, folder, bytes, "application/pdf", "pdf");
      if (url) onUploaded(url, "pdf");
    } catch (e: any) {
      Alert.alert("Scan failed", e?.message || "Could not build the PDF.");
    }
    setBusy(false);
  };

  return (
    <>
      <TouchableOpacity style={s.btn} onPress={() => setOpen(true)} disabled={busy} activeOpacity={0.8}>
        {busy ? <ActivityIndicator size="small" color={COLORS.edu} /> : <Ionicons name="attach-outline" size={16} color={COLORS.edu} />}
        <Text style={s.btnTxt}>{busy ? "Uploading…" : label}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Add attachment</Text>
            <TouchableOpacity style={s.opt} onPress={onTakePhoto}>
              <Ionicons name="camera-outline" size={20} color={COLORS.edu} /><Text style={s.optTxt}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.opt} onPress={onPick}>
              <Ionicons name="images-outline" size={20} color={COLORS.edu} /><Text style={s.optTxt}>Choose photo / video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.opt} onPress={onScan}>
              <Ionicons name="scan-outline" size={20} color={COLORS.edu} /><Text style={s.optTxt}>Scan to PDF (multi-page)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.opt, s.cancel]} onPress={() => setOpen(false)}>
              <Text style={[s.optTxt, { color: COLORS.mid }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  btn:    { flexDirection: "row", alignItems: "center", gap: 5 },
  btnTxt: { fontSize: 12, fontWeight: "700", color: COLORS.edu },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "flex-end" },
  sheet:  { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 28, gap: 4 },
  sheetTitle: { fontSize: 13, fontWeight: "800", color: COLORS.dark, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  opt:    { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 10 },
  optTxt: { fontSize: 15, fontWeight: "600", color: COLORS.dark },
  cancel: { justifyContent: "center", marginTop: 4, borderTopWidth: 1, borderTopColor: COLORS.border },
});
