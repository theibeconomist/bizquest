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

export { supabase };
