import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, EDU_API } from "../lib/constants";

type Child = { id: string; child_name: string; photo_url?: string | null };

const FACEAPI = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.js";
const MODEL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model";

function parseTags(v: any): any[] {
  try { return v ? (typeof v === "string" ? JSON.parse(v) : v) : []; } catch { return []; }
}

// Runs the SAME face-api.js matching the web uses, inside a WebView.
function buildHtml(photoUrl: string, children: Child[]) {
  const kids = JSON.stringify((children || []).filter(c => c.photo_url).map(c => ({ name: c.child_name, url: c.photo_url })));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#fff">
<script src="${FACEAPI}"></script>
<script>
var RN=window.ReactNativeWebView;
function log(m){RN&&RN.postMessage(JSON.stringify({type:'log',msg:m}))}
function done(f){RN&&RN.postMessage(JSON.stringify({type:'result',faces:f}))}
function fail(e){RN&&RN.postMessage(JSON.stringify({type:'error',msg:String(e)}))}
var KIDS=${kids}, PHOTO=${JSON.stringify(photoUrl)};
function loadImg(url){return fetch(url.split('?')[0]).then(function(r){return r.blob()}).then(function(b){var u=URL.createObjectURL(b);return new Promise(function(res,rej){var i=new Image();i.onload=function(){URL.revokeObjectURL(u);res(i)};i.onerror=function(){rej(new Error('image load failed'))};i.src=u})})}
(async function(){
  try{
    if(!window.faceapi){fail('face library failed to load (check internet)');return}
    var fa=window.faceapi;
    log('Loading face models…');
    await Promise.all([fa.nets.ssdMobilenetv1.loadFromUri('${MODEL}'),fa.nets.faceLandmark68Net.loadFromUri('${MODEL}'),fa.nets.faceRecognitionNet.loadFromUri('${MODEL}')]);
    var refs=[];
    if(KIDS.length){
      log('Reading '+KIDS.length+' profile photo(s)…');
      for(var k=0;k<KIDS.length;k++){var c=KIDS[k];try{var img=await loadImg(c.url);var det=await fa.detectSingleFace(img,new fa.SsdMobilenetv1Options({minConfidence:0.2})).withFaceLandmarks().withFaceDescriptor();if(det){refs.push({name:c.name,descriptor:det.descriptor});log('✓ '+c.name)}else{log('⚠ no face in '+c.name+"'s photo")}}catch(e){log('✗ '+c.name)}}
    } else { log('No profile photos — detecting faces only (tap to tag manually)'); }
    log('Scanning the photo…');
    var cimg=await loadImg(PHOTO);
    var dets=await fa.detectAllFaces(cimg,new fa.SsdMobilenetv1Options({minConfidence:0.2})).withFaceLandmarks().withFaceDescriptors();
    if(dets.length===0){fail('No faces detected in this photo.');return}
    var TH=refs.length===1?0.35:refs.length<=3?0.40:0.45;
    var matched=dets.map(function(det,idx){var b=det.detection.box;var bn=null,bd=Infinity;for(var i=0;i<refs.length;i++){var d=fa.euclideanDistance(det.descriptor,refs[i].descriptor);if(d<bd){bd=d;bn=refs[i].name}}var m=refs.length>0&&bd<TH;return{index:idx,x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),imgW:cimg.width,imgH:cimg.height,childName:m?bn:null,confidence:bd<0.30?'high':bd<0.40?'medium':(m?'low':null),autoTagged:m,distance:isFinite(bd)?parseFloat(bd.toFixed(3)):null}});
    var n=matched.filter(function(f){return f.autoTagged}).length;
    log('Done — '+n+'/'+dets.length+' matched. Tap a face below to fix/assign.');
    done(matched);
  }catch(e){fail(e&&e.message||e)}
})();
</script></body></html>`;
}

export default function FaceAutoTagger({ photo, children, onSaved }: {
  photo: any; children: Child[]; onSaved?: () => void;
}) {
  const [faces, setFaces] = useState<any[]>(() => parseTags(photo.ai_tags));
  const [run, setRun]     = useState(false);
  const [showLog, setLog] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [busy, setBusy]   = useState(false);
  const [pickFor, setPick]= useState<number | null>(null); // face index being assigned

  // Sync from props only when not mid-edit
  useEffect(() => { if (!run && pickFor === null) setFaces(parseTags(photo.ai_tags)); }, [photo.ai_tags]);

  const persist = async (updated: any[]) => {
    const caption = updated.filter(f => f.childName).map(f => f.childName).join(",");
    try {
      await fetch(`${EDU_API}/api/photos/detect-faces`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: photo.id, bulkFaces: updated, caption }),
      });
      onSaved?.();
    } catch {}
  };

  // Manually map / correct / remove a face → child
  const assign = async (faceIndex: number, childName: string | null) => {
    let updated = faces.map(f => f.index === faceIndex
      ? { ...f, childName: childName || null, confidence: childName ? "manual" : null, autoTagged: false } : f);
    // if the face wasn't in the list yet (manual add), append it
    if (!updated.some(f => f.index === faceIndex)) updated = [...updated, { index: faceIndex, childName, confidence: "manual" }];
    setFaces(updated); setPick(null); setBusy(true);
    await persist(updated);
    setBusy(false);
  };

  const onMessage = async (e: any) => {
    let m: any = {}; try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.type === "log") { setLines(p => [...p.slice(-7), m.msg]); return; }
    if (m.type === "error") { setLines(p => [...p.slice(-7), "❌ " + m.msg]); setRun(false); return; }
    if (m.type === "result") {
      setFaces(m.faces || []);
      setBusy(true);
      await persist(m.faces || []);
      setBusy(false);
      setRun(false);
      setLines(p => [...p, "✅ Saved — tap any face below to correct"]);
    }
  };

  const start = () => { setLines([]); setRun(true); setLog(true); };
  const tagged = faces.filter(f => f.childName).length;

  return (
    <>
      {/* summary + run button */}
      <View style={s.row}>
        {tagged > 0
          ? <Text style={s.tags} numberOfLines={1}>🏷 {faces.filter(f => f.childName).map(f => f.childName).join(", ")}</Text>
          : <Text style={s.none}>{faces.length > 0 ? `${faces.length} face(s) — tap to tag` : "No face tags yet"}</Text>}
        <TouchableOpacity style={s.btn} onPress={start} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={13} color="#fff" />
          <Text style={s.btnTxt}>{faces.length > 0 ? "Re-tag" : "Auto-tag"}</Text>
        </TouchableOpacity>
      </View>

      {/* per-face chips — tap to map to a child (manual mapping like the web) */}
      {faces.length > 0 && (
        <View style={s.chips}>
          {faces.map((f) => (
            <TouchableOpacity key={f.index} style={[s.chip, f.childName ? s.chipOn : s.chipOff]} onPress={() => setPick(f.index)}>
              <Text style={[s.chipTxt, f.childName ? s.chipTxtOn : s.chipTxtOff]} numberOfLines={1}>
                👤 {f.childName || `Face ${f.index + 1}`} ✎
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* matching progress modal */}
      <Modal visible={showLog} transparent animationType="fade" onRequestClose={() => !busy && setLog(false)}>
        <View style={s.backdrop}>
          <View style={s.card}>
            <Text style={s.title}>✨ Auto-tagging faces</Text>
            <ScrollView style={s.logBox}>
              {lines.length === 0 ? <Text style={s.logLine}>Starting…</Text> : lines.map((l, i) => <Text key={i} style={s.logLine}>{l}</Text>)}
            </ScrollView>
            {run && (
              <View style={{ height: 1, width: 1, opacity: 0 }}>
                <WebView originWhitelist={["*"]} javaScriptEnabled domStorageEnabled
                  source={{ html: buildHtml(photo.photo_url, children), baseUrl: "https://cdn.jsdelivr.net" }}
                  onMessage={onMessage} />
              </View>
            )}
            <TouchableOpacity style={[s.modalBtn, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => setLog(false)}>
              <Text style={s.modalBtnTxt}>{busy ? "Saving…" : run ? "Run in background" : "Done"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* child picker — manual mapping / correction */}
      <Modal visible={pickFor !== null} transparent animationType="slide" onRequestClose={() => setPick(null)}>
        <View style={s.sheetBackdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Who is this?</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {children.length === 0 && <Text style={s.none}>No children in this section.</Text>}
              {children.map((c) => {
                const sel = pickFor !== null && faces.find(f => f.index === pickFor)?.childName === c.child_name;
                return (
                  <TouchableOpacity key={c.id} style={[s.pickRow, sel && s.pickRowOn]} onPress={() => assign(pickFor!, c.child_name)}>
                    <Ionicons name={sel ? "checkmark-circle" : "person-circle-outline"} size={22} color={sel ? COLORS.primary : COLORS.mid} />
                    <Text style={s.pickName}>{c.child_name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={s.removeRow} onPress={() => assign(pickFor!, null)}>
              <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
              <Text style={s.removeTxt}>Remove tag</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelRow} onPress={() => setPick(null)}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  row:    { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  tags:   { flex: 1, fontSize: 12, color: COLORS.dark, fontWeight: "600" },
  none:   { flex: 1, fontSize: 12, color: COLORS.mid },
  btn:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.primary, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  btnTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
  chips:  { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip:   { borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, maxWidth: "100%" },
  chipOn: { backgroundColor: COLORS.eduLight || "#EEF3FF", borderColor: (COLORS.edu || COLORS.primary) + "55" },
  chipOff:{ backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  chipTxt:{ fontSize: 11, fontWeight: "700" },
  chipTxtOn: { color: COLORS.edu || COLORS.primary },
  chipTxtOff:{ color: COLORS.mid },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  card:   { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 18, padding: 18 },
  title:  { fontSize: 16, fontWeight: "800", color: COLORS.dark, marginBottom: 10 },
  logBox: { maxHeight: 200, backgroundColor: "#f8fafc", borderRadius: 10, padding: 10 },
  logLine:{ fontSize: 12, color: "#475569", lineHeight: 19, fontFamily: "monospace" as any },
  modalBtn:  { marginTop: 12, alignSelf: "flex-end", paddingHorizontal: 16, paddingVertical: 8 },
  modalBtnTxt:{ color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:  { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 28 },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: COLORS.dark, marginBottom: 10 },
  pickRow:{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 10 },
  pickRowOn: { backgroundColor: "#EEF3FF" },
  pickName: { fontSize: 15, color: COLORS.dark, fontWeight: "600" },
  removeRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: "#eef2f7" },
  removeTxt: { fontSize: 14, color: COLORS.error, fontWeight: "700" },
  cancelRow: { alignItems: "center", paddingVertical: 12, marginTop: 2 },
  cancelTxt: { fontSize: 14, color: COLORS.mid, fontWeight: "700" },
});
