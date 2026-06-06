import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../lib/constants";
import { supabase } from "../lib/supabase";
import { useSession } from "../store/session";

// Lets a teacher switch between the sections ASSIGNED to them (parity with the web
// dashboard's /api/teacher/sections, which returns only sections where
// class_teacher == the teacher's name, falling back to the stored sectionId).
// All teacher screens read session.sectionId, so switching here syncs every screen.
export default function TeacherSectionPicker() {
  const { session, setActiveSection } = useSession();
  const [sections, setSections] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      // Sections assigned to this teacher (by name, matching the web logic)
      let list: any[] = [];
      if (session?.name) {
        const { data } = await supabase
          .from("sections")
          .select("id, name, program_id")
          .eq("class_teacher", session.name)
          .order("name");
        list = data || [];
      }
      // Fallback: the single section stored on the account
      if (list.length === 0 && session?.sectionId) {
        const { data } = await supabase
          .from("sections")
          .select("id, name, program_id")
          .eq("id", session.sectionId)
          .maybeSingle();
        if (data) list = [data];
      }
      setSections(list);
      // Default to the assigned section if valid, else the first one
      const has = session?.sectionId && list.find((s: any) => s.id === session.sectionId);
      if (list.length && !has) setActiveSection(list[0].id, list[0].name);
    })();
  }, [session?.name]);

  if (sections.length <= 1) return null;

  return (
    <View style={s.wrap}>
      <Text style={s.lbl}>CLASS SECTION</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {sections.map((sec) => {
          const active = sec.id === session?.sectionId;
          return (
            <TouchableOpacity key={sec.id} onPress={() => setActiveSection(sec.id, sec.name)}
              style={[s.pill, active && s.pillActive]} activeOpacity={0.8}>
              <Text style={[s.pillTxt, active && s.pillTxtActive]}>{sec.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:         { marginBottom: 16 },
  lbl:          { fontSize: 11, fontWeight: "700", color: COLORS.mid, letterSpacing: 0.8, marginBottom: 8 },
  pill:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border },
  pillActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillTxt:      { fontSize: 13, fontWeight: "700", color: COLORS.mid },
  pillTxtActive:{ color: "#fff" },
});
