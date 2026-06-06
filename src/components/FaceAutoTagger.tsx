import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, EDU_API } from "../lib/constants";

type Child = { id: string; child_name: string; photo_url?: string | null };

const FACEAPI = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.js";
const MODEL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model";

// Runs the SAME face-api.js matching the web uses, inside a WebView.
function buildHtml(photoUrl: string, children: Child[]) {
  const kids = JSON.stringify(
    (children || []).filter(c => c.photo_url).map(c => ({ name: c.child_name, url: c.photo_url }))
  );
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
    if(KIDS.length===0){fail('No children have profile photos yet. Add them in Parent → Profile.');return}
    log('Reading '+KIDS.length+' profile photo(s)…');
    var refs=[];
    for(var k=0;k<KIDS.length;k++){var c=KIDS[k];try{var img=await loadImg(c.url);var det=await fa.detectSingleFace(img,new fa.SsdMobilenetv1Options({minConfidence:0.2})).withFaceLandmarks().withFaceDescriptor();if(det){refs.push({name:c.name,descriptor:det.descriptor});log('✓ '+c.name)}else{log('⚠ no face in '+c.name+"'s photo")}}catch(e){log('✗ '+c.name+' ('+e.message+')')}}
    if(refs.length===0){fail('Could not read a face from any profile photo.');return}
    log('Scanning the photo…');
    var cimg=await loadImg(PHOTO);
    var dets=await fa.detectAllFaces(cimg,new fa.SsdMobilenetv1Options({minConfidence:0.2})).withFaceLandmarks().withFaceDescriptors();
    if(dets.length===0){fail('No faces detected in this photo.');return}
    var TH=refs.length===1?0.35:refs.length<=3?0.40:0.45;
    var matched=dets.map(function(det,idx){var b=det.detection.box;var bn=null,bd=Infinity;for(var i=0;i<refs.length;i++){var d=fa.euclideanDistance(det.descriptor,refs[i].descriptor);if(d<bd){bd=d;bn=refs[i].name}}var m=bd<TH;return{index:idx,x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),imgW:cimg.width,imgH:cimg.height,childName:m?bn:null,confidence:bd<0.30?'high':bd<0.40?'medium':(m?'low':null),autoTagged:m,distance:parseFloat(bd.toFixed(3))}});
    var n=matched.filter(function(f){return f.autoTagged}).length;
    log('Done — '+n+'/'+dets.length+' matched');
    done(matched);
  }catch(e){fail(e&&e.message||e)}
})();
</script></body></html>`;
}

export default function FaceAutoTagger({ photo, children, onSaved }: {
  photo: any; children: Child[]; onSaved?: () => void;
}) {
  const [open, setOpen]   = useState(false);
  const [run, setRun]     = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [busy, setBusy]   = useState(false);

  const savedTags: any[] = useMemo(() => {
    try { return photo.ai_tags ? (typeof photo.ai_tags === "string" ? JSON.parse(photo.ai_tags) : photo.ai_tags) : []; }
    catch { return []; }
  }, [photo.ai_tags]);
  const names = savedTags.filter((f: any) => f.childName).map((f: any) => f.childName);

  const onMessage = async (e: any) => {
    let m: any = {};
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.type === "log") { setLines(p => [...p.slice(-7), m.msg]); return; }
    if (m.type === "error") { setLines(p => [...p.slice(-7), "❌ " + m.msg]); setRun(false); setBusy(false); return; }
    if (m.type === "result") {
      setBusy(true);
      const caption = (m.faces || []).filter((f: any) => f.childName).map((f: any) => f.childName).join(",");
      try {
        await fetch(`${EDU_API}/api/photos/detect-faces`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId: photo.id, bulkFaces: m.faces, caption }),
        });
        setLines(p => [...p, "✅ Saved tags"]);
        onSaved?.();
      } catch { setLines(p => [...p, "❌ Save failed"]); }
      setRun(false); setBusy(false);
    }
  };

  const start = () => { setLines([]); setRun(true); setOpen(true); };

  return (
    <>
      <View style={s.row}>
        {names.length > 0
          ? <Text style={s.tags} numberOfLines={1}>🏷 {names.join(", ")}</Text>
          : <Text style={s.none}>No face tags yet</Text>}
        <TouchableOpacity style={s.btn} onPress={start} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={13} color="#fff" />
          <Text style={s.btnTxt}>{names.length > 0 ? "Re-tag" : "Auto-tag"}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => !busy && setOpen(false)}>
        <View style={s.backdrop}>
          <View style={s.card}>
            <Text style={s.title}>✨ Auto-tagging faces</Text>
            <ScrollView style={s.logBox}>
              {lines.length === 0 ? <Text style={s.logLine}>Starting…</Text>
                : lines.map((l, i) => <Text key={i} style={s.logLine}>{l}</Text>)}
            </ScrollView>
            {/* hidden WebView does the ML work */}
            {run && (
              <View style={{ height: 1, width: 1, opacity: 0 }}>
                <WebView
                  originWhitelist={["*"]}
                  javaScriptEnabled
                  domStorageEnabled
                  source={{ html: buildHtml(photo.photo_url, children), baseUrl: "https://cdn.jsdelivr.net" }}
                  onMessage={onMessage}
                />
              </View>
            )}
            <TouchableOpacity style={[s.close, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => setOpen(false)}>
              <Text style={s.closeTxt}>{busy ? "Saving…" : run ? "Run in background" : "Close"}</Text>
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
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  card:   { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 18, padding: 18 },
  title:  { fontSize: 16, fontWeight: "800", color: COLORS.dark, marginBottom: 10 },
  logBox: { maxHeight: 200, backgroundColor: "#f8fafc", borderRadius: 10, padding: 10 },
  logLine:{ fontSize: 12, color: "#475569", lineHeight: 19, fontFamily: "monospace" as any },
  close:  { marginTop: 12, alignSelf: "flex-end", paddingHorizontal: 16, paddingVertical: 8 },
  closeTxt:{ color: COLORS.primary, fontWeight: "700", fontSize: 13 },
});
