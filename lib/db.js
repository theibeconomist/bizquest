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

// Student-facing: their own full attempt history, all time, for the Revision
// diagnostics screen — deliberately no date window, since "which subunits am I
// weakest in overall" should reflect everything, not just a recent slice.
export async function loadMyAttempts() {
  const userId = await currentUserId();
  if (!userId) return [];
  return loadAttemptsForUsers([userId], null);
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

// Inserts the feedback row, then best-effort pings the notify-feedback API route (which
// emails ADMIN_EMAIL via Resend, same pattern as the signup notification) — the insert
// is what actually matters, so a failed email never surfaces as an error to the student.
export async function submitFeedback({ page, message }) {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in.");
  const { data: prof } = await supabase.from("profiles").select("role, display_name").eq("id", user.id).maybeSingle();
  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    user_email: user.email || null,
    user_role: prof?.role || "student",
    display_name: prof?.display_name || null,
    page: page || null,
    message,
  });
  if (error) throw new Error(error.message || "Could not submit feedback.");
  try {
    await fetch("/api/notify-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, message, email: user.email, role: prof?.role, displayName: prof?.display_name }),
    });
  } catch {
    // notification best-effort only — the feedback itself is already safely saved above
  }
}

// Admin-only read (enforced by RLS) — powers the feedback inbox on /admin.
export async function loadAllFeedback() {
  const { data } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
  return data || [];
}

// Sends pre-aggregated (not raw) stats to the server, which forwards them to Claude —
// gated server-side to teacher/admin. Throws with the server's error message on failure.
export async function generateStudentSummary(stats) {
  const res = await fetch("/api/student-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stats }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Could not generate summary.");
  return data.summary;
}

// ---- Teacher → student/class messaging ----

export async function sendClassMessage({ classId, studentId, message }) {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in.");
  const { error } = await supabase.from("class_messages").insert({
    class_id: classId,
    teacher_id: userId,
    student_id: studentId || null,
    sender_role: "teacher",
    sender_id: userId,
    message,
  });
  if (error) throw new Error(error.message || "Could not send message.");
}

// Student-side reply — always addressed to their own class's teacher, optionally tagged
// to the message it's replying to (for display context, not enforced by RLS).
export async function replyToTeacher({ classId, teacherId, message, replyToId }) {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in.");
  const { error } = await supabase.from("class_messages").insert({
    class_id: classId,
    teacher_id: teacherId,
    student_id: userId,
    sender_role: "student",
    sender_id: userId,
    reply_to_id: replyToId || null,
    message,
  });
  if (error) throw new Error(error.message || "Could not send reply.");
}

// Unread student replies across every class this teacher owns — powers the badge next
// to the "Teacher dashboard" link. Computed as (replies addressed to me) minus (replies
// I've already marked read via message_reads), since there's no single boolean column.
export async function loadUnreadReplyCount() {
  const userId = await currentUserId();
  if (!userId) return 0;
  const [{ data: replies }, { data: reads }] = await Promise.all([
    supabase.from("class_messages").select("id").eq("teacher_id", userId).eq("sender_role", "student"),
    supabase.from("message_reads").select("message_id").eq("user_id", userId),
  ]);
  const readIds = new Set((reads || []).map((r) => r.message_id));
  return (replies || []).filter((r) => !readIds.has(r.id)).length;
}

export async function markMessagesReadForUser(messageIds) {
  const userId = await currentUserId();
  if (!userId || !messageIds || messageIds.length === 0) return;
  try {
    await supabase.from("message_reads").upsert(
      messageIds.map((id) => ({ message_id: id, user_id: userId })),
      { onConflict: "message_id,user_id", ignoreDuplicates: true }
    );
  } catch {
    // best-effort — a missed read receipt just means the badge stays slightly stale
  }
}

// Teacher-side: every message they've sent for a class, plus how many distinct students
// have read each one (via message_reads) — for a broadcast this is "seen by X/Y";
// for a personal message it's just whether that one student has read it yet.
export async function loadClassMessages(classId) {
  const { data: messages } = await supabase
    .from("class_messages")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  if (!messages || messages.length === 0) return [];
  const ids = messages.map((m) => m.id);
  const { data: reads } = await supabase.from("message_reads").select("message_id, user_id").in("message_id", ids);
  const readCounts = {};
  for (const r of reads || []) readCounts[r.message_id] = (readCounts[r.message_id] || 0) + 1;
  return messages.map((m) => ({ ...m, readCount: readCounts[m.id] || 0 }));
}

// Student-side: every message visible to them (RLS already filters to their own +
// broadcasts to their class), plus which ones they've personally read.
export async function loadMyMessages() {
  const userId = await currentUserId();
  if (!userId) return [];
  const { data: messages } = await supabase.from("class_messages").select("*").order("created_at", { ascending: false });
  if (!messages || messages.length === 0) return [];
  const { data: reads } = await supabase.from("message_reads").select("message_id").eq("user_id", userId);
  const readIds = new Set((reads || []).map((r) => r.message_id));
  return messages.map((m) => ({ ...m, isRead: readIds.has(m.id) }));
}

export async function markMessageRead(messageId) {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase.from("message_reads").upsert({ message_id: messageId, user_id: userId }, { onConflict: "message_id,user_id", ignoreDuplicates: true });
  } catch {
    // best-effort — a missed read receipt just means the badge stays slightly stale
  }
}

// ---- Classroom quiz game (multi-device mode) ----
// Single-screen mode needs none of this — it's pure client-side state in the teacher's
// own browser. This is only for the "teams join on their own device" mode.

// Teacher-side: creates a game with a random 6-character join code and the given
// (already-selected/shuffled) question set snapshotted directly into the row. Passing
// classId restricts joining to students in that class; omit it to allow any approved student.
export async function createQuizGame({ subunitId, questions, classId, timerEnabled }) {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in.");
  for (let i = 0; i < 8; i++) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from("quiz_games")
      .insert({ teacher_id: userId, subunit_id: subunitId, join_code: code, questions, class_id: classId || null, timer_enabled: !!timerEnabled })
      .select()
      .maybeSingle();
    if (!error) return data;
    if (error.code !== "23505") throw new Error(error.message || "Could not create game.");
  }
  throw new Error("Could not generate a unique game code — please try again.");
}

export async function updateQuizGame(gameId, fields) {
  const { error } = await supabase.from("quiz_games").update(fields).eq("id", gameId);
  if (error) throw new Error(error.message || "Could not update game.");
}

export async function deleteQuizGame(gameId) {
  await supabase.from("quiz_games").delete().eq("id", gameId);
}

export async function loadQuizGame(gameId) {
  const { data } = await supabase.from("quiz_games").select("*").eq("id", gameId).maybeSingle();
  return data;
}

export async function loadQuizTeams(gameId) {
  const { data } = await supabase.from("quiz_teams").select("*").eq("game_id", gameId).order("created_at", { ascending: true });
  return data || [];
}

// Student-side: joins via a security-definer function that itself verifies the caller
// is a real, approved student account (and, if the game is tied to a class, that they
// belong to that class) — no anonymous sign-in involved at all.
export async function joinQuizByCode(code, teamName) {
  const { data, error } = await supabase.rpc("join_quiz_by_code", { p_code: code, p_team_name: teamName });
  if (error) throw new Error(error.message || "Invalid game code.");
  const row = Array.isArray(data) ? data[0] : data;
  return row ? { teamId: row.team_id, gameId: row.game_id, subunitId: row.subunit_id } : null;
}

export async function submitQuizAnswer({ gameId, teamId, questionIndex, selectedOption, isCorrect, points }) {
  const { error } = await supabase.rpc("submit_quiz_answer", {
    p_game_id: gameId, p_team_id: teamId, p_question_index: questionIndex,
    p_selected_option: selectedOption, p_is_correct: isCorrect, p_points: points || 1,
  });
  if (error) throw new Error(error.message || "Could not submit answer.");
}

// Realtime subscription — fires onGame/onTeams whenever the game or its teams change, so
// every connected device (host + all team phones) stays in sync automatically.
export function subscribeToQuizGame(gameId, { onGame, onTeams }) {
  const channel = supabase
    .channel(`quiz_game_${gameId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "quiz_games", filter: `id=eq.${gameId}` }, (payload) => {
      if (onGame) onGame(payload.new);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "quiz_teams", filter: `game_id=eq.${gameId}` }, async () => {
      if (onTeams) onTeams(await loadQuizTeams(gameId));
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export { supabase };
