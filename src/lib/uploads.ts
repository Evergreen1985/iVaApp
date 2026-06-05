import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { supabase } from "./supabase";

export type Picked = { uri: string; name: string; mimeType: string; kind: "image" | "video" };

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
