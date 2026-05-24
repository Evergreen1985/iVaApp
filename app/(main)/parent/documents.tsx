import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  TouchableOpacity, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../../../src/lib/constants";
import { getDocuments, uploadDocument } from "../../../src/lib/api";
import { useSession } from "../../../src/store/session";

const REQUIRED_DOCS = [
  "Birth Certificate",
  "Immunization Record",
  "Address Proof",
  "Parent / Guardian ID",
  "Previous School Report Card",
];

export default function ParentDocuments() {
  const { session } = useSession();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const child = session?.children?.[0];

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      if (child?.id) {
        const res = await getDocuments(child.id);
        setDocs(Array.isArray(res) ? res : res?.documents || []);
      }
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (docType: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photos to upload documents.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(docType);
    try {
      const asset = result.assets[0];
      const data = await uploadDocument({
        enquiryId: child?.id,
        docType,
        fileName: asset.fileName || `${docType.replace(/\s/g, "_")}.jpg`,
        base64: asset.base64,
        mimeType: asset.mimeType || "image/jpeg",
        uploadedBy: session?.phone || "parent",
      });
      if (data.error) {
        Alert.alert("Upload Failed", data.error);
      } else {
        Alert.alert("Uploaded ✓", `${docType} uploaded. School staff will verify it shortly.`);
        load();
      }
    } catch {
      Alert.alert("Error", "Upload failed. Please check your connection and try again.");
    }
    setUploading(null);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.edu} /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.edu} />}
    >
      <Text style={s.pageTitle}>📁 Documents</Text>
      {child && <Text style={s.sub}>For {child.child_name || child.name}</Text>}

      {/* Uploaded docs */}
      {docs.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Uploaded Documents</Text>
          {docs.map((doc: any, i: number) => (
            <View key={doc.id || i} style={s.docCard}>
              <View style={s.docIconBox}>
                <Ionicons name="document-text" size={22} color={COLORS.edu} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.docName}>{doc.doc_type || doc.file_name || "Document"}</Text>
                <Text style={s.docDate}>
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </Text>
              </View>
              <View style={[s.statusBadge,
                { backgroundColor: doc.status === "approved" ? "#DCFCE7" : "#FEF9C3" }
              ]}>
                <Text style={[s.statusTxt,
                  { color: doc.status === "approved" ? COLORS.success : "#92400E" }
                ]}>
                  {doc.status === "approved" ? "Approved" : "Pending"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Required docs upload */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Required Documents</Text>
        <Text style={s.sectionSub}>Tap to upload from your gallery. Accepted formats: JPG, PNG, PDF (via camera roll).</Text>
        {REQUIRED_DOCS.map((docType) => {
          const uploaded = docs.find((d: any) =>
            (d.doc_type || "").toLowerCase().includes(docType.toLowerCase().split(" ")[0])
          );
          const isBusy = uploading === docType;
          return (
            <TouchableOpacity
              key={docType}
              style={[s.uploadRow, uploaded && s.uploadRowDone]}
              onPress={() => uploaded
                ? Alert.alert("Already Uploaded", `${docType} is already uploaded. Contact school to replace it.`)
                : handleUpload(docType)
              }
              disabled={!!uploading}
              activeOpacity={0.7}
            >
              <View style={[s.uploadIconBox, { backgroundColor: uploaded ? "#DCFCE7" : COLORS.eduLight }]}>
                <Ionicons
                  name={isBusy ? "cloud-upload" : uploaded ? "checkmark-circle" : "cloud-upload-outline"}
                  size={20}
                  color={uploaded ? COLORS.success : COLORS.edu}
                />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[s.uploadLabel, uploaded && s.uploadLabelDone]}>{docType}</Text>
                {uploaded && <Text style={s.uploadedNote}>Submitted · {uploaded.status || "pending review"}</Text>}
              </View>
              {isBusy
                ? <ActivityIndicator size="small" color={COLORS.edu} />
                : uploaded
                  ? <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  : <Ionicons name="add-circle-outline" size={20} color={COLORS.edu} />
              }
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  content:       { padding: 20, paddingBottom: 40 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageTitle:     { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  sub:           { fontSize: 13, color: COLORS.mid, marginBottom: 20, marginTop: 2 },
  section:       { marginBottom: 24 },
  sectionTitle:  { fontSize: 13, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  sectionSub:    { fontSize: 12, color: COLORS.mid, marginBottom: 14, lineHeight: 18 },
  docCard:       { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  docIconBox:    { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.eduLight, alignItems: "center", justifyContent: "center" },
  docName:       { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  docDate:       { fontSize: 11, color: COLORS.mid, marginTop: 2 },
  statusBadge:   { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt:     { fontSize: 10, fontWeight: "700" },
  uploadRow:     { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: COLORS.edu },
  uploadRowDone: { borderColor: COLORS.success, backgroundColor: "#F0FDF4" },
  uploadIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  uploadLabel:   { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  uploadLabelDone: { color: COLORS.mid },
  uploadedNote:  { fontSize: 11, color: COLORS.success, marginTop: 2, textTransform: "capitalize" },
});
