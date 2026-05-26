import { EDU_API, SUPABASE_URL, SUPABASE_ANON } from "./constants";
import { supabase } from "./supabase";

export type Role = "parent" | "teacher";

// ── Auth ──────────────────────────────────────────────────────────────────
export async function parentLogin(phone: string, password: string) {
  const res = await fetch(`${EDU_API}/api/auth/parent-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password, action: "login" }),
  });
  return res.json();
}

export async function parentFirstLogin(phone: string, dob: string, last4: string) {
  const res = await fetch(`${EDU_API}/api/auth/parent-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, dob, last4, action: "first-login" }),
  });
  return res.json();
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
  const [y, mo] = month.split("-").map(Number);
  const lastDay = new Date(y, mo, 0).getDate();
  const dateEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

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
      .gte("event_date", `${month}-01`)
      .lte("event_date", dateEnd)
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
  const res = await fetch(`${EDU_API}/api/fees/assignments?enquiryId=${enquiryId}&status=pending,overdue`);
  return res.json();
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

// ── Parent extras ──────────────────────────────────────────────────────────
export async function getMedical(enquiryId: string) {
  const res = await fetch(`${EDU_API}/api/medical?enquiryId=${enquiryId}`);
  return res.json();
}

export async function saveMedical(payload: object) {
  const res = await fetch(`${EDU_API}/api/medical`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getPickupAuth(enquiryId: string) {
  const res = await fetch(`${EDU_API}/api/pickup?enquiryId=${enquiryId}`);
  return res.json();
}

export async function savePickupAuth(payload: object) {
  const res = await fetch(`${EDU_API}/api/pickup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
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
  const res = await fetch(`${EDU_API}/api/documents?enquiryId=${encodeURIComponent(enquiryId)}`);
  return res.json();
}

export async function uploadDocument(payload: object) {
  const res = await fetch(`${EDU_API}/api/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
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
  const res = await fetch(`${EDU_API}/api/kit?enquiryId=${encodeURIComponent(enquiryId)}`);
  return res.json();
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
export async function getOwnerAdmissions(token: string) {
  const res = await fetch(`${EDU_API}/api/owner/admissions`, { headers: ownerHeaders(token) });
  return res.json();
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
