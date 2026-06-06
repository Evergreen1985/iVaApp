import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { PDFDocument } from "pdf-lib";
import { supabase } from "./supabase";

export type Picked = { uri: string; name: string; mimeType: string; kind: "image" | "video" };

// Capture a single photo with the camera.
export async function takePhoto(): Promise<Picked | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") { Alert.alert("Camera permission needed", "Please allow camera access."); return null; }
  const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (r.canceled || !r.assets?.[0]) return null;
  const a: any = r.assets[0];
  const ext = (a.uri.split(".").pop() || "jpg").split("?")[0];
  return { uri: a.uri, name: a.fileName || `photo_${Date.now()}.${ext}`, mimeType: a.mimeType || `image/${ext}`, kind: "image" };
}

// Combine image URIs (in order) into a single PDF — returns the PDF bytes.
export async function imagesToPdf(uris: string[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (const uri of uris) {
    const bytes = new Uint8Array(await (await fetch(uri)).arrayBuffer());
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50; // PNG magic
    const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return await pdf.save();
}

// Upload raw bytes (e.g. a generated PDF) → public URL.
export async function uploadBytes(bucket: string, folder: string, bytes: Uint8Array, mimeType: string, ext: string): Promise<string | null> {
  try {
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: mimeType, upsert: false });
    if (error) { Alert.alert("Upload failed", error.message); return null; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  } catch (e: any) {
    Alert.alert("Upload failed", e?.message || "Could not upload the file.");
    return null;
  }
}

// Pick an image OR video from the library. (PDF/doc support needs expo-document-picker,
// which is a native module — added in the next app build.)
export async function pickImageOrVideo(): Promise<Picked | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission required", "Please allow access to your photos & videos.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All, // images + videos
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a: any = result.assets[0];
  const kind: "image" | "video" = a.type === "video" ? "video" : "image";
  const ext = (a.uri.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).split("?")[0];
  const name = a.fileName || `${kind}_${Date.now()}.${ext}`;
  const mimeType = a.mimeType || (kind === "video" ? `video/${ext}` : `image/${ext}`);
  return { uri: a.uri, name, mimeType, kind };
}

// Upload a picked file to a Supabase storage bucket; returns the public URL (or null).
export async function uploadToBucket(bucket: string, folder: string, picked: Picked): Promise<string | null> {
  try {
    const ext = (picked.uri.split(".").pop() || "bin").split("?")[0];
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const res = await fetch(picked.uri);
    const arrayBuffer = await res.arrayBuffer();
    const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, { contentType: picked.mimeType, upsert: false });
    if (error) { Alert.alert("Upload failed", error.message); return null; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  } catch (e: any) {
    Alert.alert("Upload failed", e?.message || "Could not upload the file.");
    return null;
  }
}

// Detect a file's kind from its URL (for rendering attachments).
export function fileKind(url?: string | null): "image" | "video" | "pdf" | "file" {
  if (!url) return "file";
  const u = url.toLowerCase().split("?")[0];
  if (/\.(jpg|jpeg|png|gif|webp|heic)$/.test(u)) return "image";
  if (/\.(mp4|mov|m4v|webm|3gp|avi|mkv)$/.test(u)) return "video";
  if (/\.pdf$/.test(u)) return "pdf";
  return "file";
}
