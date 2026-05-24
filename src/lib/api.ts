import { EDU_API } from "./constants";

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
export async function getParentDashboard(phone: string) {
  const now   = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const res   = await fetch(
    `${EDU_API}/api/parent/dashboard?phone=${encodeURIComponent(phone)}&month=${month}`
  );
  return res.json();
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

export async function getAudioOverviews() {
  const res = await fetch(`${EDU_API}/api/audio/overviews`);
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
