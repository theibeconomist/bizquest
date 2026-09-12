import { createClient } from "./supabase/client";

const supabase = createClient();

export function emptyProfile() {
  return {
    xp: 0,
    badgeIds: [],
    completedSubunits: [],
    studyCompleted: [],
    perfectAnswers: 0,
    vocabCompleted: 0,
    videosCompleted: 0,
  };
}

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user ? user.id : null;
}

async function currentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user || null;
}

export async function loadProfile() {
  const userId = await currentUserId();
  if (!userId) return emptyProfile();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error || !data) return emptyProfile();
  return {
    xp: data.xp || 0,
    badgeIds: data.badge_ids || [],
    completedSubunits: data.completed_subunits || [],
    studyCompleted: data.study_completed || [],
    perfectAnswers: data.perfect_answers || 0,
    vocabCompleted: data.vocab_completed || 0,
    videosCompleted: data.videos_completed || 0,
  };
}

export async function saveProfile(profile) {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase.from("profiles").upsert({
      id: userId,
      xp: profile.xp || 0,
      badge_ids: profile.badgeIds || [],
      completed_subunits: profile.completedSubunits || [],
      study_completed: profile.studyCompleted || [],
      perfect_answers: profile.perfectAnswers || 0,
      vocab_completed: profile.vocabCompleted || 0,
      videos_completed: profile.videosCompleted || 0,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // save failed silently — matches the old storage's fire-and-forget behavior
  }
}

async function loadSubunitRow(subunitId) {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from("subunit_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("subunit_id", subunitId)
    .maybeSingle();
  return data;
}

export async function loadResponses(subunitId) {
  const row = await loadSubunitRow(subunitId);
  return (row && row.responses) || {};
}

export async function loadCompResponses(subunitId) {
  const row = await loadSubunitRow(subunitId);
  return (row && row.comp_responses) || {};
}

export async function loadStudyProgress(subunitId) {
  const row = await loadSubunitRow(subunitId);
  return (row && row.study_progress) || {};
}

export async function loadTermsReviewed(subunitId) {
  const row = await loadSubunitRow(subunitId);
  return (row && row.terms_reviewed) || {};
}

// Generic upsert-merge for one column of the subunit_progress row, so callers don't
// need to read-modify-write the whole row themselves (avoids clobbering other columns
// when e.g. saving practice responses and study progress happen close together).
async function mergeSubunitColumn(subunitId, column, value) {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase.from("subunit_progress").upsert(
      { user_id: userId, subunit_id: subunitId, [column]: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id,subunit_id" }
    );
  } catch {
    // save failed silently
  }
}

export const saveResponses = (subunitId, value) => mergeSubunitColumn(subunitId, "responses", value);
export const saveCompResponses = (subunitId, value) => mergeSubunitColumn(subunitId, "comp_responses", value);
export const saveStudyProgress = (subunitId, value) => mergeSubunitColumn(subunitId, "study_progress", value);
export const saveTermsReviewed = (subunitId, value) => mergeSubunitColumn(subunitId, "terms_reviewed", value);

// ============================================================
// Roles, classes, and teacher-facing analytics
// (requires supabase-migration-roles.sql to have been run)
// ============================================================

export async function loadRoleInfo() {
  const userId = await currentUserId();
  if (!userId) return { role: "student", classId: null, className: null, teacherEmail: null };
  const { data } = await supabase.from("profiles").select("role, class_id").eq("id", userId).maybeSingle();
  const role = (data && data.role) || "student";
  const classId = (data && data.class_id) || null;
  let className = null, teacherEmail = null;
  if (classId) {
    const { data: cls } = await supabase.from("classes").select("name, teacher_email").eq("id", classId).maybeSingle();
    if (cls) { className = cls.name; teacherEmail = cls.teacher_email; }
  }
  return { role, classId, className, teacherEmail };
}

// Joins a class by its code via a security-definer DB function, so a student can never
// set their own class_id directly (see the protect_approval_fields trigger + join_class
// function in supabase-migration-roles.sql).
export async function joinClassByCode(code) {
  const { data, error } = await supabase.rpc("join_class", { p_code: code });
  if (error) throw new Error(error.message || "Invalid class code.");
  const row = Array.isArray(data) ? data[0] : data;
  return row ? { classId: row.class_id, className: row.class_name, teacherEmail: row.teacher_email } : null;
}

// Fire-and-forget: one row per submitted (graded) practice question, used for
// teacher-facing accuracy/score analytics. Never blocks or surfaces errors to the student.
export async function logQuestionAttempt({ subunitId, questionId, section, marksEarned, marksPossible }) {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase.from("question_attempts").insert({
      user_id: userId,
      subunit_id: subunitId,
      question_id: questionId,
      section,
      marks_earned: marksEarned,
      marks_possible: marksPossible,
    });
  } catch {
    // logging failed silently — never blocks the student's actual grading result
  }
}

// Adds `seconds` of active time to today's row for the current user (atomic upsert via
// an RPC, so multiple tabs/heartbeats can't race each other into overwriting a total).
export async function recordActivitySeconds(seconds) {
  const s = Math.round(seconds);
  if (!s || s <= 0) return;
  try {
    await supabase.rpc("record_activity", { p_seconds: s });
  } catch {
    // best-effort — a missed heartbeat just slightly undercounts time, never worth surfacing
  }
}

// ---- Teacher dashboard reads ----

export async function loadMyClasses() {
  const { data } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
  return data || [];
}

// Creates a class with a random 6-character join code, retrying on the rare code collision.
export async function createClass(name) {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in.");
  for (let i = 0; i < 8; i++) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from("classes")
      .insert({ teacher_id: user.id, name, join_code: code, teacher_email: user.email || null })
      .select()
      .maybeSingle();
    if (!error) return data;
    if (error.code !== "23505") throw new Error(error.message || "Could not create class.");
    // 23505 = unique_violation on join_code — just try another random code
  }
  throw new Error("Could not generate a unique class code — please try again.");
}

export async function loadClassRoster(classId) {
  const { data } = await supabase
    .from("profiles")
    .select("id, email, xp, completed_subunits, class_id, badge_ids, display_name, avatar_url, extra_detail")
    .eq("class_id", classId);
  return data || [];
}

export async function loadActivityForUsers(userIds, sinceDateISO) {
  if (!userIds || userIds.length === 0) return [];
  let q = supabase.from("daily_activity").select("*").in("user_id", userIds);
  if (sinceDateISO) q = q.gte("activity_date", sinceDateISO);
  const { data } = await q;
  return data || [];
}

export async function loadAttemptsForUsers(userIds, sinceISO) {
  if (!userIds || userIds.length === 0) return [];
  let q = supabase.from("question_attempts").select("*").in("user_id", userIds);
  if (sinceISO) q = q.gte("submitted_at", sinceISO);
  const { data } = await q;
  return data || [];
}

// Fire-and-forget: one row per checked comprehension question (Discover stage),
// separate from question_attempts since these carry a verdict, not a numeric mark.
export async function logComprehensionAttempt({ subunitId, questionId, verdict }) {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase.from("comprehension_attempts").insert({
      user_id: userId,
      subunit_id: subunitId,
      question_id: questionId,
      verdict,
    });
  } catch {
    // logging failed silently — never blocks the student's own comprehension check result
  }
}

export async function loadComprehensionAttemptsForUsers(userIds, sinceISO) {
  if (!userIds || userIds.length === 0) return [];
  let q = supabase.from("comprehension_attempts").select("*").in("user_id", userIds);
  if (sinceISO) q = q.gte("submitted_at", sinceISO);
  const { data } = await q;
  return data || [];
}

// Removes a student from the caller's class via a security-definer DB function, which
// re-checks server-side that the caller actually teaches that student before doing anything.
export async function removeStudentFromClass(studentId) {
  const { error } = await supabase.rpc("remove_student_from_class", { p_student_id: studentId });
  if (error) throw new Error(error.message || "Could not remove student.");
}

// ---- Profile details (display name, avatar, role-specific detail) ----

export async function loadMyProfileDetails() {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, extra_detail, role")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export async function saveProfileDetails({ displayName, extraDetail }) {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in.");
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null, extra_detail: extraDetail || null })
    .eq("id", userId);
  if (error) throw new Error(error.message || "Could not save profile.");
}

// Uploads an (already client-resized) image blob to this user's own folder in the
// avatars bucket, then stores its public URL — with a cache-busting query param, since
// the storage path itself never changes between re-uploads (upsert: true).
export async function uploadAvatar(blob) {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in.");
  const path = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message || "Could not upload photo.");
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
  const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
  if (updateError) throw new Error(updateError.message || "Could not save photo.");
  return avatarUrl;
}

export { supabase };
