import { EDU_API, SUPABASE_URL, SUPABASE_ANON } from "./constants";
import { supabase } from "./supabase";

export type Role = "parent" | "teacher";

// ── Auth ──────────────────────────────────────────────────────────────────

// Normalise phone to 10-digit format for Supabase lookups
function phone10(phone: string) { return phone.replace(/\D/g, "").slice(-10); }

export async function parentLogin(phone: string, password: string) {
  const ph = phone10(phone);
  try {
    const res  = await fetch(`${EDU_API}/api/auth/parent-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: ph, password, action: "login" }),
    });
    return res.json();
  } catch {
    return { error: "Unable to connect to the school server. Please check your internet connection." };
  }
}

// DOB normaliser — converts any format to YYYYMMDD digits for comparison
function normaliseDob(d: string): string {
  const p = d.replace(/[^0-9]/g, "");
  if (p.length !== 8) return p;
  // If first 4 digits look like a year (>1900) it's already YYYYMMDD
  if (parseInt(p.slice(0, 4)) > 1900) return p;
  // Otherwise assume DDMMYYYY → convert to YYYYMMDD
  return p.slice(4) + p.slice(2, 4) + p.slice(0, 2);
}


export async function parentFirstLogin(phone: string, dob: string, last4: string) {
  const ph = phone10(phone);

  // Convert user-entered DOB (DD/MM/YYYY or any format) → YYYY-MM-DD for backend
  const norm = normaliseDob(dob); // → YYYYMMDD string
  if (norm.length !== 8) {
    return { error: "Invalid date format. Please use DD/MM/YYYY (e.g. 25/12/2020)" };
  }
  const dobISO = `${norm.slice(0, 4)}-${norm.slice(4, 6)}-${norm.slice(6, 8)}`; // YYYY-MM-DD

  // Fetch child info from Supabase enquiries (to pass child_name & enquiry_id to backend)
  const { data: enq } = await supabase
    .from("enquiries")
    .select("id,child_name,child_dob")
    .or(`phone.eq.${ph},phone.eq.91${ph},phone.eq.+91${ph}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!enq) {
    return { error: "No enrolment found for this phone number. Please contact the school." };
  }

  // Step 1: ensure parent_accounts exists with correct DOB (create or patch)
  try {
    await fetch(`${EDU_API}/api/auth/parent-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone:     ph,
        action:    "create",
        childName: enq.child_name || "",
        childDob:  dobISO,          // ← pass DOB so backend can store/patch it
        enquiryId: enq.id || "",
      }),
    });
  } catch { /* network glitch — continue to first-login attempt */ }

  // Step 2: first-login — backend verifies DOB & sets bcrypt password
  try {
    const res  = await fetch(`${EDU_API}/api/auth/parent-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: ph, dob: dobISO, last4: last4.trim(), action: "first-login" }),
    });
    const data = await res.json();

    if (data.error?.toLowerCase().includes("too many")) {
      return { error: "Too many attempts. Please wait 15–30 minutes and try again." };
    }

    if (!data.error) {
      // Compute the auto-password (same formula the backend uses) so we can show it
      const initial  = (enq.child_name || "E").charAt(0).toUpperCase();
      const year     = dobISO.slice(0, 4);
      const autoPass = `${initial}${year}${last4.trim()}`;
      return { success: true, childName: data.childName || enq.child_name || "", autoPass };
    }

    // Surface backend's exact error (DOB mismatch, already set up, etc.)
    return { error: data.error };

  } catch {
    return { error: "Unable to connect to the school server. Please check your internet connection." };
  }
}

export async function sendResetOTP(phone: string) {
  const res = await fetch(`${EDU_API}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, role: "parent" }),
  });
  return res.json();
}

export async function resetPassword(phone: string, otp: string, newPassword: string) {
  const res = await fetch(`${EDU_API}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp, newPassword, role: "parent" }),
  });
  return res.json();
}

export async function teacherLogin(username: string, password: string) {
  const res = await fetch(`${EDU_API}/api/teacher/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

// ── Parent Data ───────────────────────────────────────────────────────────
// Queries Supabase directly — avoids web middleware cookie auth block
export async function getParentDashboard(phone: string) {
  const digits  = phone.replace(/\D/g, "");
  const phone10  = digits.slice(-10);
  const phone12  = `91${phone10}`;
  const phoneP12 = `+91${phone10}`;

  const now     = new Date();
  const month   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // Rolling window for upcoming calendar events: today → +45 days (was: current month only)
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayStr  = ymd(now);
  const windowEnd = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 45));

  const [{ data: enquiries }, { data: announcements }, { data: calendarEvents }] = await Promise.all([
    supabase
      .from("enquiries")
      .select("id,child_name,child_dob,child_age_months,program_label,program_id,status,section_id,section_name,created_at,photo_url")
      .or(`phone.eq.${phone10},phone.eq.${phone12},phone.eq.${phoneP12}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("announcements")
      .select("*")
      .or("target.eq.all,target.eq.parents")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("calendar_events")
      .select("*")
      .gte("event_date", todayStr)
      .lte("event_date", windowEnd)
      .order("event_date"),
  ]);

  const sectionIds = (enquiries || []).map((e: any) => e.section_id).filter(Boolean);
  let homework: any[] = [];
  if (sectionIds.length > 0) {
    const { data: hw } = await supabase
      .from("homework")
      .select("*")
      .in("section_id", sectionIds)
      .gte("due_date", `${month}-01`)
      .order("due_date");
    homework = hw || [];
  }

  return {
    enquiries:      enquiries      || [],
    calendarEvents: calendarEvents || [],
    announcements:  announcements  || [],
    homework,
    photos: [],
  };
}

export async function getCalendar(month: string) {
  const res = await fetch(`${EDU_API}/api/admin/calendar?month=${month}`);
  return res.json();
}

export async function getFeeDues(enquiryId: string) {
  // Fetch ALL fee statuses so the screen can show both pending dues AND paid receipts
  const { data, error } = await supabase
    .from("fee_assignments")
    .select("id,amount,due_date,status,period_label,receipt_no,paid_at,paid_amount,payment_mode,discount_amount,notes,fee_structure_id,fee_structures(name,fee_type)")
    .eq("enquiry_id", enquiryId)
    .order("due_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ── Teacher Data ──────────────────────────────────────────────────────────
export async function getTeacherDashboard(token: string) {
  const res = await fetch(`${EDU_API}/api/teacher/dashboard`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  return res.json();
}

export async function getStudents(sectionId: string) {
  const res = await fetch(`${EDU_API}/api/teacher/sections?sectionId=${sectionId}`);
  return res.json();
}

export async function getHomework(sectionId: string) {
  const res = await fetch(`${EDU_API}/api/teacher/homework?sectionId=${sectionId}`);
  return res.json();
}

export async function saveAttendance(payload: object) {
  const res = await fetch(`${EDU_API}/api/teacher/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── AI ────────────────────────────────────────────────────────────────────
export async function askKB(question: string, role: "parent" | "staff" = "parent") {
  const res = await fetch(`${EDU_API}/api/kb/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, role }),
  });
  return res.json();
}

export async function callAITool(tool: string, params: Record<string, string>): Promise<string> {
  const res = await fetch(`${EDU_API}/api/ai-tools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, ...params }),
  });
  return res.text();
}

// ── Teacher extras ─────────────────────────────────────────────────────────
export async function sendTeacherMessage(payload: object) {
  const res = await fetch(`${EDU_API}/api/teacher/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getTeacherMessages(teacherName: string) {
  const res = await fetch(`${EDU_API}/api/teacher/messages?teacherName=${encodeURIComponent(teacherName)}`);
  return res.json();
}

export async function clockAction(action: "in" | "out", payload: object) {
  const res = await fetch(`${EDU_API}/api/teacher/clock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

export async function getClockRecord(staffName: string) {
  const res = await fetch(`${EDU_API}/api/teacher/clock?staffName=${encodeURIComponent(staffName)}`);
  return res.json();
}

export async function getBirthdays(days = 30) {
  const res = await fetch(`${EDU_API}/api/birthdays?days=${days}`);
  return res.json();
}

export async function getIncidents(params: string) {
  const res = await fetch(`${EDU_API}/api/incidents?${params}`);
  return res.json();
}

export async function logIncident(payload: object) {
  const res = await fetch(`${EDU_API}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Parent extras — all query Supabase directly so web admin changes sync instantly ──
export async function getMedical(enquiryId: string) {
  const { data } = await supabase
    .from("child_medical")
    .select("*")
    .eq("enquiry_id", enquiryId)
    .maybeSingle();
  if (!data) return null;
  // Normalise to camelCase that the mobile screen expects
  return {
    bloodGroup:  data.blood_group || "",
    allergies:   Array.isArray(data.allergies)
                   ? data.allergies.join(", ")
                   : (data.allergies || ""),
    conditions:  data.medical_conditions || "",
    emergency:   Array.isArray(data.emergency_contacts)
                   ? data.emergency_contacts.map((e: any) => (typeof e === "string" ? e : (e.name || ""))).join(", ")
                   : (data.emergency_contacts || ""),
  };
}

export async function saveMedical(payload: any) {
  const { enquiryId, childName, bloodGroup, allergies, conditions, emergency } = payload;
  if (!enquiryId) return { error: "No child selected" };
  const { error } = await supabase
    .from("child_medical")
    .upsert({
      enquiry_id:         enquiryId,
      child_name:         childName        || "",
      blood_group:        bloodGroup       || "",
      allergies:          allergies        ? [allergies]               : [],
      medical_conditions: conditions       || "",
      emergency_contacts: emergency        ? [{ name: emergency }]     : [],
      updated_at:         new Date().toISOString(),
    }, { onConflict: "enquiry_id" });
  if (error) return { error: error.message };
  return { success: true };
}

export async function getPickupAuth(enquiryId: string) {
  const { data } = await supabase
    .from("pickup_authorizations")
    .select("id,authorized_name,relation,phone,is_active")
    .eq("enquiry_id", enquiryId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  // Normalise field names for the mobile screen
  return (data || []).map((p: any) => ({
    id:       p.id,
    name:     p.authorized_name || "",
    relation: p.relation        || "",
    phone:    p.phone           || "",
  }));
}

export async function savePickupAuth(payload: any) {
  const { enquiryId, persons } = payload;
  if (!enquiryId) return { error: "No child selected" };
  // Replace all authorizations with the new list
  await supabase.from("pickup_authorizations").delete().eq("enquiry_id", enquiryId);
  if (!persons?.length) return { success: true };
  const rows = persons.map((p: any) => ({
    enquiry_id:      enquiryId,
    authorized_name: p.name || p.authorized_name || "",
    relation:        p.relation || "",
    phone:           p.phone   || "",
    is_active:       true,
    added_by:        "parent",
  }));
  const { error } = await supabase.from("pickup_authorizations").insert(rows);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getAudioOverviews(_token?: string, lang?: string) {
  let url = `${SUPABASE_URL}/rest/v1/audio_overviews?select=id,title,audio_url,status,duration_seconds,source_type,language,created_at&status=eq.ready&order=created_at.desc&limit=50`;
  if (lang) url += `&language=eq.${lang}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  });
  return res.json();
}

// ── Photos ─────────────────────────────────────────────────────────────────────
export async function getSectionPhotos(sectionId: string) {
  const res = await fetch(`${EDU_API}/api/teacher/dashboard?sectionId=${encodeURIComponent(sectionId)}`);
  const data = await res.json();
  return data.photos || [];
}

export async function postPhotoRecord(payload: object) {
  const res = await fetch(`${EDU_API}/api/photos/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Transport ──────────────────────────────────────────────────────────────────
export async function getTransportOptIns(date: string) {
  const res = await fetch(`${EDU_API}/api/transport/opt-ins?date=${date}`);
  return res.json();
}

export async function getChildTransportOptIn(childId: string) {
  const res = await fetch(`${EDU_API}/api/transport/opt-ins?child_id=${encodeURIComponent(childId)}`);
  return res.json();
}

export async function getChildRideLogs(date: string, childId: string) {
  const res = await fetch(`${EDU_API}/api/transport/ride-logs?date=${date}&child_id=${encodeURIComponent(childId)}`);
  return res.json();
}

export async function enrollTransport(payload: object) {
  const res = await fetch(`${EDU_API}/api/transport/opt-ins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getRideLogs(date: string, routeId: string) {
  const res = await fetch(`${EDU_API}/api/transport/ride-logs?date=${date}&route_id=${encodeURIComponent(routeId)}`);
  return res.json();
}

export async function markRideStatus(payload: object) {
  const res = await fetch(`${EDU_API}/api/transport/ride-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Documents ─────────────────────────────────────────────────────────────────
export async function getDocuments(enquiryId: string) {
  const { data } = await supabase
    .from("child_documents")
    .select("id,document_type,document_label,file_url,file_name,status,created_at")
    .eq("enquiry_id", enquiryId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function uploadDocument(payload: any) {
  const { enquiryId, childName, docType, fileName, base64, mimeType, uploadedBy } = payload;
  if (!enquiryId || !base64) return { error: "Missing data" };

  const ext  = (mimeType || "image/jpeg").split("/").pop() || "jpg";
  const path = `documents/${enquiryId}/${(docType || "doc").replace(/\s/g, "_")}_${Date.now()}.${ext}`;

  // Convert base64 → binary
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const { error: upErr } = await supabase.storage
    .from("school-photos")
    .upload(path, bytes.buffer, { contentType: mimeType || "image/jpeg", upsert: true });
  if (upErr) return { error: upErr.message };

  const { data: { publicUrl } } = supabase.storage.from("school-photos").getPublicUrl(path);

  const { error: dbErr } = await supabase.from("child_documents").insert({
    enquiry_id:     enquiryId,
    child_name:     childName      || "",
    document_type:  docType        || "",
    document_label: docType        || "",
    file_url:       publicUrl,
    file_name:      fileName       || `${docType}.${ext}`,
    mime_type:      mimeType       || "image/jpeg",
    uploaded_by:    uploadedBy     || "parent",
    status:         "pending",
    created_at:     new Date().toISOString(),
  });
  if (dbErr) return { error: dbErr.message };
  return { success: true, file_url: publicUrl };
}

// ── Referrals ──────────────────────────────────────────────────────────────────
export async function submitReferral(payload: object) {
  const res = await fetch(`${EDU_API}/api/referrals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── PTM ────────────────────────────────────────────────────────────────────────
export async function getPTMSchedule(sectionId: string) {
  const res = await fetch(`${EDU_API}/api/ptm?sectionId=${encodeURIComponent(sectionId)}`);
  return res.json();
}

// ── Kit ────────────────────────────────────────────────────────────────────────
export async function getKitItems(enquiryId: string) {
  const { data } = await supabase
    .from("child_kit")
    .select("id,item_name,item_category,issued,quantity,size,school_notes")
    .eq("enquiry_id", enquiryId)
    .order("item_category")
    .order("created_at");
  return (data || []).map((k: any) => ({
    ...k,
    is_issued: k.issued,   // normalise for screen
  }));
}

export async function updateKitItem(payload: object) {
  const res = await fetch(`${EDU_API}/api/kit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin Auth ─────────────────────────────────────────────────────────────────
export async function adminLogin(username: string, password: string) {
  const res = await fetch(`${EDU_API}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

// ── Admin helpers ──────────────────────────────────────────────────────────────
function adminHeaders(token: string) {
  return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
}

// ── Admin: Enquiries ───────────────────────────────────────────────────────────
export async function registerParentAccount(token: string, phone: string, childName: string) {
  // Try POST /api/admin/parents first, fallback to /api/admin/create-parent
  const tryEndpoint = async (url: string, body: object) => {
    const res = await fetch(url, {
      method: "POST",
      headers: adminHeaders(token),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; }
    catch { return { status: res.status, data: null, raw: text.slice(0, 300) }; }
  };

  // Attempt 1: /api/admin/parents
  const r1 = await tryEndpoint(`${EDU_API}/api/admin/parents`, { phone, child_name: childName, name: childName });
  if (r1.status < 400) return r1.data;
  if (r1.status !== 404) {
    // Got a real response (400/422/etc) — return it so caller can show the message
    if (r1.data) return r1.data;
    throw new Error(`/api/admin/parents (${r1.status}): ${r1.raw}`);
  }

  // Attempt 2: /api/admin/create-parent
  const r2 = await tryEndpoint(`${EDU_API}/api/admin/create-parent`, { phone, child_name: childName, name: childName });
  if (r2.status < 400) return r2.data;
  if (r2.data) return r2.data;
  throw new Error(`/api/admin/create-parent (${r2.status}): ${r2.raw}`);
}
export async function getEnquiries(token: string, status?: string) {
  const q = status ? `?status=${status}` : "";
  const res = await fetch(`${EDU_API}/api/admin/enquiries${q}`, { headers: adminHeaders(token) });
  return res.json();
}
export async function updateEnquiryStatus(token: string, id: string, status: string, notes?: string) {
  const res = await fetch(`${EDU_API}/api/enquiries/update`, {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify({ id, status, notes }),
  });
  return res.json();
}
export async function createEnquiry(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/enquiry`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: Sections ────────────────────────────────────────────────────────────
export async function getAdminSections(token: string) {
  const res = await fetch(`${EDU_API}/api/admin/sections`, { headers: adminHeaders(token) });
  return res.json();
}
export async function createSection(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/admin/sections`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: Calendar ────────────────────────────────────────────────────────────
export async function getAdminCalendar(token: string, month: string) {
  const res = await fetch(`${EDU_API}/api/admin/calendar?month=${month}`, { headers: adminHeaders(token) });
  return res.json();
}
export async function createCalendarEvent(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/admin/calendar`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}
export async function deleteCalendarEvent(token: string, id: string) {
  const res = await fetch(`${EDU_API}/api/admin/calendar?id=${id}`, {
    method: "DELETE",
    headers: adminHeaders(token),
  });
  return res.json();
}

// ── Admin: Announcements ───────────────────────────────────────────────────────
export async function getAnnouncements(token: string) {
  const res = await fetch(`${EDU_API}/api/admin/announcements`, { headers: adminHeaders(token) });
  return res.json();
}
export async function createAnnouncement(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/admin/announcements`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}
export async function deleteAnnouncement(token: string, id: string) {
  const res = await fetch(`${EDU_API}/api/admin/announcements?id=${id}`, {
    method: "DELETE",
    headers: adminHeaders(token),
  });
  return res.json();
}

// ── Admin: Fees ────────────────────────────────────────────────────────────────
export async function getFeeStructures(token: string) {
  const res = await fetch(`${EDU_API}/api/fees/structures`, { headers: adminHeaders(token) });
  return res.json();
}
export async function getFeeAssignments(token: string, status?: string) {
  const q = status ? `?status=${status}` : "";
  const res = await fetch(`${EDU_API}/api/fees/assignments${q}`, { headers: adminHeaders(token) });
  return res.json();
}
export async function recordPayment(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/fees/record-payment`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}
export async function getFeeReports(token: string) {
  const res = await fetch(`${EDU_API}/api/fees/reports`, { headers: adminHeaders(token) });
  return res.json();
}
export async function sendFeeReminder(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/fees/reminder`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: Staff ───────────────────────────────────────────────────────────────
export async function getStaff(token: string) {
  const res = await fetch(`${EDU_API}/api/staff`, { headers: adminHeaders(token) });
  return res.json();
}
export async function createStaff(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/staff`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: Expenses ────────────────────────────────────────────────────────────
export async function getExpenses(token: string) {
  const res = await fetch(`${EDU_API}/api/expenses`, { headers: adminHeaders(token) });
  return res.json();
}
export async function createExpense(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/expenses`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: Reports ─────────────────────────────────────────────────────────────
export async function getAdminReports(token: string, type: string) {
  const res = await fetch(`${EDU_API}/api/fees/reports?type=${type}`, { headers: adminHeaders(token) });
  return res.json();
}

// ── Admin: Transport ───────────────────────────────────────────────────────────
export async function getAdminTransport(token: string) {
  const res = await fetch(`${EDU_API}/api/transport`, { headers: adminHeaders(token) });
  return res.json();
}
export async function createRoute(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/transport`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: Medical (all students) ─────────────────────────────────────────────
export async function getAllMedical(token: string) {
  const res = await fetch(`${EDU_API}/api/medical?all=true`, { headers: adminHeaders(token) });
  return res.json();
}

// ── Admin: Pickup Auth (all) ───────────────────────────────────────────────────
export async function getAllPickup(token: string) {
  const res = await fetch(`${EDU_API}/api/pickup?all=true`, { headers: adminHeaders(token) });
  return res.json();
}

// ── Admin: Payroll ─────────────────────────────────────────────────────────────
export async function getPayroll(token: string) {
  const res = await fetch(`${EDU_API}/api/payroll`, { headers: adminHeaders(token) });
  return res.json();
}
export async function createPayroll(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/payroll`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: PTM ─────────────────────────────────────────────────────────────────
export async function getAdminPTM(token: string) {
  const res = await fetch(`${EDU_API}/api/ptm?all=true`, { headers: adminHeaders(token) });
  return res.json();
}
export async function createPTMSlot(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/ptm`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: Blog ────────────────────────────────────────────────────────────────
export async function getBlogPosts(token: string) {
  const res = await fetch(`${EDU_API}/api/blog`, { headers: adminHeaders(token) });
  return res.json();
}
export async function createBlogPost(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/blog`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: Referrals ───────────────────────────────────────────────────────────
export async function getAdminReferrals(token: string) {
  const res = await fetch(`${EDU_API}/api/referrals?all=true`, { headers: adminHeaders(token) });
  return res.json();
}

// ── Admin: Follow-ups ──────────────────────────────────────────────────────────
export async function getFollowUps(token: string) {
  const res = await fetch(`${EDU_API}/api/followups`, { headers: adminHeaders(token) });
  return res.json();
}
export async function createFollowUp(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/followups`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: Birthdays ───────────────────────────────────────────────────────────
export async function getAdminBirthdays(token: string) {
  const res = await fetch(`${EDU_API}/api/birthdays?days=60`, { headers: adminHeaders(token) });
  return res.json();
}

// ── Admin: Testimonials ────────────────────────────────────────────────────────
export async function getTestimonials(token: string) {
  const res = await fetch(`${EDU_API}/api/testimonials`, { headers: adminHeaders(token) });
  return res.json();
}
export async function updateTestimonial(token: string, id: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/testimonials?id=${id}`, {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: Incidents ───────────────────────────────────────────────────────────
export async function getAdminIncidents(token: string) {
  const res = await fetch(`${EDU_API}/api/incidents?all=true`, { headers: adminHeaders(token) });
  return res.json();
}

// ── Admin: Knowledge Base ──────────────────────────────────────────────────────
export async function getKBDocuments(token: string) {
  const res = await fetch(`${EDU_API}/api/kb/documents`, { headers: adminHeaders(token) });
  return res.json();
}

// ── Admin: Photos ──────────────────────────────────────────────────────────────
export async function getAdminPhotos(token: string) {
  const res = await fetch(`${EDU_API}/api/photos`, { headers: adminHeaders(token) });
  return res.json();
}

// ── Admin: Audio Overviews ─────────────────────────────────────────────────────
export async function generateAllAudio(token: string, title: string, content: string, voice = "Aoede") {
  const res = await fetch(`${EDU_API}/api/audio/generate-all`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ title, content, voice }),
  });
  return res.json();
}
export async function deleteAudioOverview(token: string, id: string) {
  const res = await fetch(`${EDU_API}/api/audio/overviews`, {
    method: "DELETE",
    headers: adminHeaders(token),
    body: JSON.stringify({ id }),
  });
  return res.json();
}

// ── Admin: Kit ─────────────────────────────────────────────────────────────────
export async function getAdminKit(token: string) {
  const res = await fetch(`${EDU_API}/api/kit?all=true`, { headers: adminHeaders(token) });
  return res.json();
}
export async function createKitItem(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/kit`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Admin: Settings ────────────────────────────────────────────────────────────
export async function getAdminSettings(token: string) {
  const res = await fetch(`${EDU_API}/api/config`, { headers: adminHeaders(token) });
  return res.json();
}
export async function updateAdminSettings(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/config`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Owner Auth ─────────────────────────────────────────────────────────────
export async function ownerLogin(username: string, password: string) {
  const res = await fetch(`${EDU_API}/api/owner/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

function ownerHeaders(token: string) {
  return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
}

// ── Owner: Dashboard ───────────────────────────────────────────────────────
export async function getOwnerDashboard(token: string) {
  const res = await fetch(`${EDU_API}/api/owner/dashboard`, { headers: ownerHeaders(token) });
  return res.json();
}

// ── Owner: Admissions ──────────────────────────────────────────────────────
export async function getOwnerAdmissions(_token: string) {
  // Query Supabase directly — bypasses backend cache so deletes reflect immediately
  const { data, error } = await supabase
    .from("enquiries")
    .select("id,child_name,parent_name,phone,program_label,section_name,status,created_at,section_id,program_id")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  // Map to the field names the UI expects
  return {
    enquiries: (data ?? []).map((e: any) => ({
      ...e,
      programme: e.program_label,
      section:   e.section_name,
    })),
  };
}
export async function deleteEnquiryRecord(_token: string, id: string) {
  // Verify the record exists first
  const { data: existing } = await supabase.from("enquiries").select("id").eq("id", id).maybeSingle();
  if (!existing) throw new Error(`No enquiry found with id: ${id}`);

  // Delete related records — correct table names confirmed from web app
  await supabase.from("attendance").delete().eq("enquiry_id", id);
  await supabase.from("fee_assignments").delete().eq("enquiry_id", id);
  await supabase.from("child_kit").delete().eq("enquiry_id", id);
  await supabase.from("child_medical").delete().eq("enquiry_id", id);
  await supabase.from("pickup_authorizations").delete().eq("enquiry_id", id);
  await supabase.from("child_documents").delete().eq("enquiry_id", id);

  // Delete the enquiry itself — use select() to confirm it was deleted
  const { data: deleted, error } = await supabase
    .from("enquiries")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) throw new Error(`Supabase error: ${error.message}`);

  // If no rows returned, RLS silently blocked the delete
  if (!deleted || deleted.length === 0) {
    throw new Error(
      "RLS policy blocked the delete.\n\nFix: Go to Supabase Dashboard → Table Editor → enquiries → Policies → Add DELETE policy for anon or authenticated role."
    );
  }

  return { success: true };
}

// ── Owner: Fees ────────────────────────────────────────────────────────────
export async function getOwnerFees(token: string) {
  const res = await fetch(`${EDU_API}/api/owner/fees`, { headers: ownerHeaders(token) });
  return res.json();
}

// ── Owner: Expenses ────────────────────────────────────────────────────────
export async function getOwnerExpenses(token: string, month?: string) {
  const q = month ? `?month=${month}` : "";
  const res = await fetch(`${EDU_API}/api/owner/expenses${q}`, { headers: ownerHeaders(token) });
  return res.json();
}
export async function createOwnerExpense(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/owner/expenses`, {
    method: "POST", headers: ownerHeaders(token), body: JSON.stringify(payload),
  });
  return res.json();
}
export async function deleteOwnerExpense(token: string, id: string) {
  const res = await fetch(`${EDU_API}/api/owner/expenses`, {
    method: "DELETE", headers: ownerHeaders(token), body: JSON.stringify({ id }),
  });
  return res.json();
}

// ── Owner: Attendance ──────────────────────────────────────────────────────
export async function getOwnerAttendance(token: string, date?: string) {
  const q = date ? `?date=${date}` : "";
  const res = await fetch(`${EDU_API}/api/owner/attendance${q}`, { headers: ownerHeaders(token) });
  return res.json();
}

// ── Owner: Staff Attendance ────────────────────────────────────────────────
export async function getOwnerStaffAttendance(token: string, date?: string) {
  const q = date ? `?date=${date}` : "";
  const res = await fetch(`${EDU_API}/api/owner/staff-attendance${q}`, { headers: ownerHeaders(token) });
  return res.json();
}
export async function markStaffAttendance(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/owner/staff-attendance`, {
    method: "POST", headers: ownerHeaders(token), body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Owner: Staff Login ─────────────────────────────────────────────────────
export async function getStaffLogins(token: string) {
  const res = await fetch(`${EDU_API}/api/owner/staff-login`, { headers: ownerHeaders(token) });
  return res.json();
}
export async function createStaffLogin(token: string, staffId: string) {
  const res = await fetch(`${EDU_API}/api/owner/staff-login`, {
    method: "POST", headers: ownerHeaders(token), body: JSON.stringify({ staffId }),
  });
  return res.json();
}

// ── Owner: Messages ────────────────────────────────────────────────────────
export async function getOwnerMessages(token: string) {
  const res = await fetch(`${EDU_API}/api/owner/messages`, { headers: ownerHeaders(token) });
  return res.json();
}
export async function replyOwnerMessage(token: string, id: string, reply: string) {
  const res = await fetch(`${EDU_API}/api/owner/messages`, {
    method: "PATCH", headers: ownerHeaders(token), body: JSON.stringify({ id, reply }),
  });
  return res.json();
}

// ── Owner: Roles ───────────────────────────────────────────────────────────
export async function getOwnerRoles(token: string) {
  const res = await fetch(`${EDU_API}/api/owner/roles`, { headers: ownerHeaders(token) });
  return res.json();
}
export async function createOwnerRole(token: string, payload: object) {
  const res = await fetch(`${EDU_API}/api/owner/roles`, {
    method: "POST", headers: ownerHeaders(token), body: JSON.stringify(payload),
  });
  return res.json();
}
export async function deleteOwnerRole(token: string, id: string) {
  const res = await fetch(`${EDU_API}/api/owner/roles`, {
    method: "DELETE", headers: ownerHeaders(token), body: JSON.stringify({ id }),
  });
  return res.json();
}

// ── Owner: AI Insights ─────────────────────────────────────────────────────
export async function getOwnerInsights(token: string) {
  const res = await fetch(`${EDU_API}/api/owner/ai-insights`, { headers: ownerHeaders(token) });
  return res.json();
}

// ── Owner: Cleanup ─────────────────────────────────────────────────────────
export async function getCleanupData(token: string) {
  const res = await fetch(`${EDU_API}/api/owner/cleanup`, { headers: ownerHeaders(token) });
  return res.json();
}
export async function executeCleanup(token: string, tables: string[]) {
  const res = await fetch(`${EDU_API}/api/owner/cleanup`, {
    method: "POST", headers: ownerHeaders(token), body: JSON.stringify({ tables }),
  });
  return res.json();
}
