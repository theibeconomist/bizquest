"use client";
import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Loader2, Copy, Check, ChevronRight, ChevronDown, Users, Clock, Target, BookOpen,
  AlertTriangle, Flame, Calendar,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { createClass, loadClassRoster, loadActivityForUsers, loadAttemptsForUsers } from "@/lib/db";

const NAVY = "#15396B";
const GOLD = "#C9A24B";
const RED = "#B3392C";

// Mirrors UNIT_SUBUNITS in components/BizQuest.js — kept as a small, separate lookup here
// since this dashboard doesn't need (and shouldn't import) the rest of that huge file.
const SUBUNIT_LABELS = {
  "1.1": "1.1 What is a business?",
  "1.2": "1.2 Types of business entities",
  "1.3": "1.3 Business objectives",
  "1.4": "1.4 Stakeholders",
  "1.5": "1.5 Growth and evolution",
  "1.6": "1.6 Multinational companies",
};
const SECTION_LABELS = { vocab: "Vocabulary", structured: "Structured", essay: "Extended response" };

const ACTIVITY_WINDOW_DAYS = 90; // covers roughly a semester of streak/last-active/accuracy history

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}
function daysBetweenISO(fromISO, toISO) {
  const a = new Date(fromISO + "T00:00:00Z");
  const b = new Date(toISO + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}
function formatMinutes(seconds) {
  const mins = Math.round((seconds || 0) / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
// Last N calendar dates (oldest first) as "YYYY-MM-DD" strings, for building day-by-day charts.
function lastNDates(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(isoDaysAgo(i));
  return out;
}
function shortDayLabel(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
// Counts consecutive active days ending today (or ending yesterday if today has no
// activity yet — so a streak isn't shown as "broken" just because today isn't over).
function computeStreak(activeDateSet) {
  let cursor = new Date();
  const todayKey = cursor.toISOString().slice(0, 10);
  if (!activeDateSet.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (activeDateSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
function pct(earned, possible) {
  return possible > 0 ? Math.round((earned / possible) * 100) : null;
}

function CopyableCode({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-stone-50 px-2.5 py-1 font-mono text-[13px] tracking-wide hover:bg-stone-100"
      title="Copy join code"
    >
      {code}
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="text-stone-400" />}
    </button>
  );
}

function StatChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-stone-50 border border-stone-200 px-2.5 py-1.5">
      <Icon size={13} className="text-stone-400 shrink-0" />
      <div className="leading-tight">
        <div className="text-[12.5px] font-semibold text-stone-700">{value}</div>
        <div className="text-[10px] text-stone-400">{label}</div>
      </div>
    </div>
  );
}

// Small horizontal-bar-style chart (accuracy % by subunit/section), color-coded so a
// teacher can spot weak spots at a glance without reading exact numbers.
function AccuracyBarChart({ data, height = 180 }) {
  if (!data || data.length === 0) {
    return <div className="text-[12.5px] text-stone-400 py-6 text-center">Not enough graded answers yet.</div>;
  }
  const colorFor = (v) => (v >= 70 ? "#2E8B84" : v >= 50 ? GOLD : RED);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e2d8" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#78716c" }} unit="%" />
        <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11.5, fill: "#57534e" }} />
        <Tooltip formatter={(v) => [`${v}%`, "Accuracy"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => <Cell key={i} fill={colorFor(d.value)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Simple time-spent-per-day chart, in minutes.
function TimeBarChart({ data, height = 160 }) {
  const allZero = !data || data.every((d) => d.minutes === 0);
  if (allZero) {
    return <div className="text-[12.5px] text-stone-400 py-6 text-center">No recorded activity in this window yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e2d8" />
        <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: "#78716c" }} interval={Math.max(0, Math.floor((data.length - 1) / 7))} />
        <YAxis tick={{ fontSize: 11, fill: "#78716c" }} width={34} />
        <Tooltip formatter={(v) => [`${v} min`, "Time spent"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="minutes" radius={[3, 3, 0, 0]} fill={NAVY} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function NeedsAttentionBanner({ students, onSelect }) {
  if (!students || students.length === 0) return null;
  return (
    <div className="rounded-lg border px-3.5 py-3 mb-4" style={{ borderColor: "#f0d9d5", backgroundColor: "#FBF1EF" }}>
      <div className="flex items-center gap-1.5 text-[12.5px] font-semibold mb-2" style={{ color: RED }}>
        <AlertTriangle size={14} /> {students.length} student{students.length > 1 ? "s" : ""} may need attention
      </div>
      <div className="flex flex-wrap gap-2">
        {students.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="rounded-md bg-white border px-2.5 py-1.5 text-left hover:shadow-sm"
            style={{ borderColor: "#f0d9d5" }}
          >
            <div className="text-[12.5px] font-medium text-stone-700">{s.email || "(no email)"}</div>
            <div className="text-[11px] text-stone-500">{s.reasons.join(" · ")}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Full drill-down for one student: subunit/section accuracy, daily time chart, and a
// recent-attempts table. Rendered inline below their roster row when clicked.
function StudentDetailPanel({ student, attempts, activity }) {
  const myAttempts = useMemo(() => attempts.filter((a) => a.user_id === student.id), [attempts, student.id]);
  const myActivity = useMemo(() => activity.filter((a) => a.user_id === student.id), [activity, student.id]);

  const subunitData = useMemo(() => {
    const bySubunit = {};
    for (const a of myAttempts) {
      const key = a.subunit_id;
      if (!bySubunit[key]) bySubunit[key] = { earned: 0, possible: 0 };
      bySubunit[key].earned += a.marks_earned || 0;
      bySubunit[key].possible += a.marks_possible || 0;
    }
    return Object.entries(bySubunit)
      .map(([id, v]) => ({ label: SUBUNIT_LABELS[id] || id, value: pct(v.earned, v.possible) ?? 0 }))
      .sort((a, b) => (SUBUNIT_LABELS[a.label] || a.label).localeCompare(b.label));
  }, [myAttempts]);

  const dailyTimeData = useMemo(() => {
    const byDate = {};
    for (const a of myActivity) byDate[a.activity_date] = (byDate[a.activity_date] || 0) + (a.seconds_spent || 0);
    return lastNDates(14).map((d) => ({ label: shortDayLabel(d), minutes: Math.round((byDate[d] || 0) / 60) }));
  }, [myActivity]);

  const recentAttempts = useMemo(
    () => [...myAttempts].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 15),
    [myAttempts]
  );

  return (
    <div className="bg-stone-50 border-t border-stone-200 px-4 py-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Accuracy by subunit</div>
          <AccuracyBarChart data={subunitData} height={Math.max(90, subunitData.length * 34)} />
        </div>
        <div>
          <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Time spent — last 14 days</div>
          <TimeBarChart data={dailyTimeData} />
        </div>
      </div>

      <div>
        <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Recent attempts</div>
        {recentAttempts.length === 0 ? (
          <div className="text-[12.5px] text-stone-400">No graded answers yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-stone-200 bg-white">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="px-3 py-1.5 font-medium">Subunit</th>
                  <th className="px-3 py-1.5 font-medium">Section</th>
                  <th className="px-3 py-1.5 font-medium">Question</th>
                  <th className="px-3 py-1.5 font-medium">Score</th>
                  <th className="px-3 py-1.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((a, i) => (
                  <tr key={`${a.id}-${i}`} className="border-b border-stone-100 last:border-0">
                    <td className="px-3 py-1.5 text-stone-600">{SUBUNIT_LABELS[a.subunit_id] || a.subunit_id}</td>
                    <td className="px-3 py-1.5 text-stone-600">{SECTION_LABELS[a.section] || a.section}</td>
                    <td className="px-3 py-1.5 text-stone-500 font-mono">{a.question_id}</td>
                    <td className="px-3 py-1.5 text-stone-600">{a.marks_earned}/{a.marks_possible}</td>
                    <td className="px-3 py-1.5 text-stone-500">{new Date(a.submitted_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeacherDashboard({ initialClasses }) {
  const [classes, setClasses] = useState(initialClasses || []);
  const [selectedClassId, setSelectedClassId] = useState((initialClasses && initialClasses[0]?.id) || null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [roster, setRoster] = useState([]);
  const [activity, setActivity] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loadingClass, setLoadingClass] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const selectedClass = classes.find((c) => c.id === selectedClassId) || null;

  const onCreateClass = async (e) => {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const created = await createClass(newName.trim());
      setClasses((prev) => [created, ...prev]);
      setSelectedClassId(created.id);
      setNewName("");
    } catch (err) {
      setCreateError(err.message || "Could not create class.");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!selectedClassId) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setRoster([]); setActivity([]); setAttempts([]); setExpandedStudentId(null);
      });
      return () => { cancelled = true; };
    }
    setLoadingClass(true);
    setExpandedStudentId(null);
    (async () => {
      try {
        const r = await loadClassRoster(selectedClassId);
        if (cancelled) return;
        setRoster(r);
        const ids = r.map((s) => s.id);
        const [a, q] = await Promise.all([
          loadActivityForUsers(ids, isoDaysAgo(ACTIVITY_WINDOW_DAYS)),
          loadAttemptsForUsers(ids, new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 86400000).toISOString()),
        ]);
        if (cancelled) return;
        setActivity(a);
        setAttempts(q);
      } catch {
        if (!cancelled) { setRoster([]); setActivity([]); setAttempts([]); }
      } finally {
        if (!cancelled) setLoadingClass(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedClassId]);

  const today = todayISODate();

  // Per-student rollups: time windows, subunit/section accuracy, streak, last-active,
  // and a "needs attention" verdict with human-readable reasons.
  const studentStats = useMemo(() => {
    const weekAgo = isoDaysAgo(7);
    const monthAgo = isoDaysAgo(30);
    return roster.map((s) => {
      const rows = activity.filter((a) => a.user_id === s.id);
      const daily = rows.filter((a) => a.activity_date === today).reduce((sum, a) => sum + (a.seconds_spent || 0), 0);
      const weekly = rows.filter((a) => a.activity_date >= weekAgo).reduce((sum, a) => sum + (a.seconds_spent || 0), 0);
      const monthly = rows.filter((a) => a.activity_date >= monthAgo).reduce((sum, a) => sum + (a.seconds_spent || 0), 0);

      const activeDates = rows.filter((a) => (a.seconds_spent || 0) > 0).map((a) => a.activity_date);
      const activeDateSet = new Set(activeDates);
      const lastActiveDate = activeDates.length ? activeDates.sort().at(-1) : null;
      const daysSinceActive = lastActiveDate ? daysBetweenISO(lastActiveDate, today) : null;
      const streak = computeStreak(activeDateSet);

      const myAttempts = attempts.filter((a) => a.user_id === s.id);
      const earned = myAttempts.reduce((sum, a) => sum + (a.marks_earned || 0), 0);
      const possible = myAttempts.reduce((sum, a) => sum + (a.marks_possible || 0), 0);
      const accuracy = pct(earned, possible);

      const bySubunit = {};
      const bySection = {};
      for (const a of myAttempts) {
        bySubunit[a.subunit_id] = bySubunit[a.subunit_id] || { earned: 0, possible: 0 };
        bySubunit[a.subunit_id].earned += a.marks_earned || 0;
        bySubunit[a.subunit_id].possible += a.marks_possible || 0;
        bySection[a.section] = bySection[a.section] || { earned: 0, possible: 0 };
        bySection[a.section].earned += a.marks_earned || 0;
        bySection[a.section].possible += a.marks_possible || 0;
      }

      const reasons = [];
      if (accuracy !== null && myAttempts.length >= 3 && accuracy < 60) reasons.push(`Low accuracy (${accuracy}%)`);
      if (lastActiveDate !== null && daysSinceActive >= 3) reasons.push(`Inactive ${daysSinceActive}d`);
      const needsAttention = reasons.length > 0;

      return {
        ...s,
        daily, weekly, monthly,
        attemptCount: myAttempts.length,
        accuracy,
        completedCount: (s.completed_subunits || []).length,
        lastActiveDate, daysSinceActive, streak,
        bySubunit, bySection,
        needsAttention, reasons,
      };
    });
  }, [roster, activity, attempts, today]);

  const classSummary = useMemo(() => {
    if (studentStats.length === 0) return null;
    const withAccuracy = studentStats.filter((s) => s.accuracy !== null);
    const avgAccuracy = withAccuracy.length
      ? Math.round(withAccuracy.reduce((sum, s) => sum + s.accuracy, 0) / withAccuracy.length)
      : null;
    const avgWeekly = Math.round(studentStats.reduce((sum, s) => sum + s.weekly, 0) / studentStats.length);
    return { avgAccuracy, avgWeekly, count: studentStats.length };
  }, [studentStats]);

  const needsAttentionList = useMemo(() => studentStats.filter((s) => s.needsAttention), [studentStats]);

  // Class-wide accuracy by subunit (aggregated across every student in the roster).
  const classAccuracyBySubunit = useMemo(() => {
    const agg = {};
    for (const s of studentStats) {
      for (const [id, v] of Object.entries(s.bySubunit)) {
        agg[id] = agg[id] || { earned: 0, possible: 0 };
        agg[id].earned += v.earned;
        agg[id].possible += v.possible;
      }
    }
    return Object.entries(agg)
      .map(([id, v]) => ({ label: SUBUNIT_LABELS[id] || id, value: pct(v.earned, v.possible) ?? 0 }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [studentStats]);

  const classAccuracyBySection = useMemo(() => {
    const agg = {};
    for (const s of studentStats) {
      for (const [key, v] of Object.entries(s.bySection)) {
        agg[key] = agg[key] || { earned: 0, possible: 0 };
        agg[key].earned += v.earned;
        agg[key].possible += v.possible;
      }
    }
    const order = ["vocab", "structured", "essay"];
    return order
      .filter((k) => agg[k])
      .map((k) => ({ label: SECTION_LABELS[k] || k, value: pct(agg[k].earned, agg[k].possible) ?? 0 }));
  }, [studentStats]);

  // Class-wide time spent per day (sum across the whole roster), last 14 days.
  const classDailyTime = useMemo(() => {
    const byDate = {};
    for (const a of activity) byDate[a.activity_date] = (byDate[a.activity_date] || 0) + (a.seconds_spent || 0);
    return lastNDates(14).map((d) => ({ label: shortDayLabel(d), minutes: Math.round((byDate[d] || 0) / 60) }));
  }, [activity]);

  return (
    <div className="space-y-5">
      {/* Class list + create form */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-stone-700">Your classes</h2>
        </div>

        {classes.length === 0 && (
          <p className="text-[13px] text-stone-500 mb-3">No classes yet — create one below and share its join code with your students.</p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left ${
                selectedClassId === c.id ? "border-transparent text-white" : "border-stone-200 text-stone-700 hover:bg-stone-50"
              }`}
              style={selectedClassId === c.id ? { backgroundColor: NAVY } : {}}
            >
              <span className="text-[13px] font-medium">{c.name}</span>
              <ChevronRight size={13} className={selectedClassId === c.id ? "text-white/70" : "text-stone-400"} />
            </button>
          ))}
        </div>

        <form onSubmit={onCreateClass} className="flex flex-wrap items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New class name, e.g. Period 3 IB Business"
            className="rounded-md border border-stone-300 px-2.5 py-1.5 text-[13px] flex-1 min-w-[220px] focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": NAVY }}
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: NAVY }}
          >
            {creating ? <Loader2 size={13} className="animate-spin inline" /> : "Create class"}
          </button>
          {createError && <span className="text-[12px] text-red-600">{createError}</span>}
        </form>
      </div>

      {/* Selected class detail */}
      {selectedClass && (
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Lora', serif", color: NAVY }}>{selectedClass.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-stone-500">
                Join code: <CopyableCode code={selectedClass.join_code} />
              </div>
            </div>
            {classSummary && (
              <div className="flex gap-2 flex-wrap">
                <StatChip icon={Users} label="students" value={classSummary.count} />
                <StatChip icon={Clock} label="avg / week" value={formatMinutes(classSummary.avgWeekly)} />
                <StatChip icon={Target} label="avg accuracy" value={classSummary.avgAccuracy !== null ? `${classSummary.avgAccuracy}%` : "—"} />
              </div>
            )}
          </div>

          {loadingClass && (
            <div className="flex items-center gap-2 text-stone-500 text-[13px] py-6 justify-center">
              <Loader2 size={15} className="animate-spin" /> Loading students…
            </div>
          )}

          {!loadingClass && roster.length === 0 && (
            <p className="text-[13px] text-stone-500 py-4">
              No students have joined this class yet — share the join code above. They enter it from their own Unit Map screen.
            </p>
          )}

          {!loadingClass && roster.length > 0 && (
            <>
              <NeedsAttentionBanner students={needsAttentionList} onSelect={setExpandedStudentId} />

              {/* Class-wide charts */}
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Class accuracy by subunit</div>
                  <AccuracyBarChart data={classAccuracyBySubunit} height={Math.max(90, classAccuracyBySubunit.length * 34)} />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Class accuracy by question type</div>
                  <AccuracyBarChart data={classAccuracyBySection} height={Math.max(90, classAccuracyBySection.length * 34)} />
                </div>
              </div>
              <div className="mb-5">
                <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Class time spent — last 14 days</div>
                <TimeBarChart data={classDailyTime} />
              </div>

              {/* Roster table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-stone-500">
                      <th className="px-3 py-2 font-medium"></th>
                      <th className="px-3 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 font-medium">XP</th>
                      <th className="px-3 py-2 font-medium">Subunits</th>
                      <th className="px-3 py-2 font-medium">Accuracy</th>
                      <th className="px-3 py-2 font-medium">Streak</th>
                      <th className="px-3 py-2 font-medium">Last active</th>
                      <th className="px-3 py-2 font-medium">This week</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.map((s) => {
                      const isExpanded = expandedStudentId === s.id;
                      return (
                        <Fragment key={s.id}>
                          <tr
                            onClick={() => setExpandedStudentId(isExpanded ? null : s.id)}
                            className="border-b border-stone-100 last:border-0 cursor-pointer hover:bg-stone-50"
                          >
                            <td className="px-3 py-2 text-stone-400">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                {s.email || <span className="text-stone-400">(no email on file)</span>}
                                {s.needsAttention && <AlertTriangle size={12} style={{ color: RED }} title={s.reasons.join(" · ")} />}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-stone-600">{s.xp || 0}</td>
                            <td className="px-3 py-2 text-stone-600">
                              <span className="inline-flex items-center gap-1"><BookOpen size={12} className="text-stone-400" /> {s.completedCount}</span>
                            </td>
                            <td className="px-3 py-2 text-stone-600">
                              {s.accuracy !== null ? `${s.accuracy}%` : "—"} <span className="text-stone-400 text-[11px]">({s.attemptCount})</span>
                            </td>
                            <td className="px-3 py-2 text-stone-600">
                              {s.streak > 0 ? (
                                <span className="inline-flex items-center gap-1"><Flame size={12} style={{ color: GOLD }} /> {s.streak}d</span>
                              ) : "—"}
                            </td>
                            <td className="px-3 py-2 text-stone-600">
                              {s.lastActiveDate ? (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar size={12} className="text-stone-400" />
                                  {s.daysSinceActive === 0 ? "Today" : s.daysSinceActive === 1 ? "Yesterday" : `${s.daysSinceActive}d ago`}
                                </span>
                              ) : "Never"}
                            </td>
                            <td className="px-3 py-2 text-stone-600">{formatMinutes(s.weekly)}</td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="p-0">
                                <StudentDetailPanel student={s} attempts={attempts} activity={activity} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
