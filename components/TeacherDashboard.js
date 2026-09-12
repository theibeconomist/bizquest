"use client";
import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Loader2, Copy, Check, ChevronRight, ChevronDown, Users, Clock, Target, BookOpen,
  AlertTriangle, Flame, Calendar, Search, ArrowUpDown, UserMinus, Download, Printer, X, CheckCircle2, Sparkles,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  createClass, loadClassRoster, loadActivityForUsers, loadAttemptsForUsers,
  loadComprehensionAttemptsForUsers, removeStudentFromClass, generateStudentSummary,
} from "@/lib/db";
import Avatar from "@/components/Avatar";
import { questionText } from "@/lib/question-bank";

const NAVY = "#15396B";
const GOLD = "#C9A24B";
const RED = "#B3392C";
const GREEN = "#2E8B84";
const STONE = "#a8a29e";

// Mirrors UNIT_SUBUNITS / SUBUNIT_REGISTRY in components/BizQuest.js — kept as a small,
// separate lookup here since this dashboard doesn't need (and shouldn't import) the rest
// of that huge file. If question counts change there, update SUBUNIT_QUESTION_COUNTS too.
const SUBUNIT_LABELS = {
  "1.1": "1.1 What is a business?",
  "1.2": "1.2 Types of business entities",
  "1.3": "1.3 Business objectives",
  "1.4": "1.4 Stakeholders",
  "1.5": "1.5 Growth and evolution",
  "1.6": "1.6 Multinational companies",
};
const SECTION_LABELS = { vocab: "Vocabulary", structured: "Structured", essay: "Extended response" };

// Mirrors the BADGES catalog in components/BizQuest.js (id -> display name), just for
// showing which badges the class has earned. If badges change there, update this too.
const BADGE_CATALOG = {
  "first-steps": "First Steps",
  "wordsmith-1": "Wordsmith",
  "wordsmith-2": "Lexicon Master",
  "sharp-shooter": "Sharp Shooter",
  "subunit-1-1": "1.1 Complete",
  "study-1-1": "Well Rounded",
  "rising-star": "Rising Star",
  "centurion": "Centurion",
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Total question counts per subunit, by stage — powers the stage-tracking feature.
// discover = comprehension (video) questions, vocab/structured/essay map to Build/Apply/Master.
const SUBUNIT_QUESTION_COUNTS = {
  "1.1": { discover: 2, vocab: 7, structured: 3, essay: 1 },
  "1.2": { discover: 2, vocab: 16, structured: 6, essay: 1 },
};
const STAGE_ORDER = ["discover", "build", "apply", "master"];
const STAGE_LABEL = { discover: "Discover", build: "Build", apply: "Apply", master: "Master" };
const STAGE_COLOR = { discover: "#6B4C9A", build: GREEN, apply: "#4A6FA5", master: "#8B3A4A", complete: STONE };
const STAGE_TO_COUNT_KEY = { discover: "discover", build: "vocab", apply: "structured", master: "essay" };

const ACTIVITY_WINDOW_DAYS = 90; // covers roughly a semester of streak/last-active/accuracy/trend history
const TREND_WEEKS = 8;

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
function lastNDates(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(isoDaysAgo(i));
  return out;
}
function shortDayLabel(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
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
// Comprehension checks are reported entirely separately from accuracy — they're a
// verdict (correct/partial/incorrect), not a mark, so they're never mixed into the
// question_attempts-based accuracy %. This just dedupes to one verdict per question
// (in case of any retry) and tallies correct/partial/incorrect, plus a rough "score"
// (correct = full credit, partial = half) purely for at-a-glance color-coding.
function summarizeComprehension(compAttemptsInScope) {
  const latest = {};
  for (const a of [...compAttemptsInScope].sort((x, y) => new Date(x.submitted_at) - new Date(y.submitted_at))) {
    latest[`${a.user_id}:${a.subunit_id}:${a.question_id}`] = a.verdict;
  }
  const counts = { correct: 0, partial: 0, incorrect: 0 };
  for (const v of Object.values(latest)) if (counts[v] !== undefined) counts[v]++;
  const total = Object.keys(latest).length;
  const score = total > 0 ? Math.round(((counts.correct + 0.5 * counts.partial) / total) * 100) : null;
  return { counts, total, score };
}

function pct(earned, possible) {
  return possible > 0 ? Math.round((earned / possible) * 100) : null;
}

// 8 weekly buckets (oldest first), each { label, value (accuracy % or null if no attempts) }.
function weeklyAccuracyTrend(attemptsInScope, weeks = TREND_WEEKS) {
  const buckets = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const inBucket = attemptsInScope.filter((a) => {
      const t = new Date(a.submitted_at);
      return t >= start && t < end;
    });
    const earned = inBucket.reduce((sum, a) => sum + (a.marks_earned || 0), 0);
    const possible = inBucket.reduce((sum, a) => sum + (a.marks_possible || 0), 0);
    buckets.push({ label: shortDayLabel(start.toISOString().slice(0, 10)), value: pct(earned, possible) });
  }
  return buckets;
}

// Where a student currently stands in one subunit: which stage they're on, and their
// done/total count for every stage (used for both the compact badge and the mini bar).
function computeSubunitProgress(subunitId, compAttemptsForUser, questionAttemptsForUser) {
  const totals = SUBUNIT_QUESTION_COUNTS[subunitId];
  if (!totals) return null;
  const compDone = new Set(
    compAttemptsForUser.filter((a) => a.subunit_id === subunitId).map((a) => a.question_id)
  ).size;
  const bySection = { vocab: new Set(), structured: new Set(), essay: new Set() };
  for (const a of questionAttemptsForUser) {
    if (a.subunit_id !== subunitId) continue;
    if (bySection[a.section]) bySection[a.section].add(a.question_id);
  }
  const doneCounts = { discover: compDone, vocab: bySection.vocab.size, structured: bySection.structured.size, essay: bySection.essay.size };
  let currentStage = null;
  for (const stage of STAGE_ORDER) {
    const key = STAGE_TO_COUNT_KEY[stage];
    if (doneCounts[key] < totals[key]) { currentStage = stage; break; }
  }
  return { totals, doneCounts, currentStage, isComplete: currentStage === null };
}

// Class-wide "hardest questions" — average accuracy per distinct question across every
// attempt in scope. A minAttempts floor keeps one unlucky/lucky student from making a
// question look artificially hard or easy.
function computeQuestionDifficulty(attemptsInScope, minAttempts = 3) {
  const byQuestion = {};
  for (const a of attemptsInScope) {
    const key = `${a.subunit_id}:${a.question_id}`;
    if (!byQuestion[key]) byQuestion[key] = { subunitId: a.subunit_id, questionId: a.question_id, section: a.section, earned: 0, possible: 0, attempts: 0 };
    byQuestion[key].earned += a.marks_earned || 0;
    byQuestion[key].possible += a.marks_possible || 0;
    byQuestion[key].attempts += 1;
  }
  return Object.values(byQuestion)
    .filter((q) => q.attempts >= minAttempts && q.possible > 0)
    .map((q) => ({ ...q, accuracy: pct(q.earned, q.possible) }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

// When students are actually doing the work, based on attempt timestamps (both graded
// questions and comprehension checks) — the closest proxy available without a dedicated
// session-log table, since daily_activity only stores per-day totals, not per-hour ones.
function computeTimePatterns(timestamps) {
  const byHour = new Array(24).fill(0);
  const byDow = new Array(7).fill(0);
  for (const ts of timestamps) {
    const d = new Date(ts);
    byHour[d.getHours()]++;
    byDow[d.getDay()]++;
  }
  return {
    byHour: byHour.map((count, h) => ({ label: h % 3 === 0 ? `${h}:00` : "", count })),
    byDow: byDow.map((count, i) => ({ label: DOW_LABELS[i], count })),
  };
}

// Resubmission behavior: groups every attempt at the same question together (question_attempts
// logs each submission, not just the first), and looks at how many tries it took to reach full
// marks — a proxy for productive persistence via the app's "Edit Again" flow.
function computePersistence(attemptsInScope) {
  const groups = {};
  for (const a of attemptsInScope) {
    const key = `${a.user_id}:${a.subunit_id}:${a.question_id}`;
    if (!groups[key]) groups[key] = { user_id: a.user_id, list: [] };
    groups[key].list.push(a);
  }
  let oneTry = 0, twoTries = 0, threePlus = 0;
  const perUserTotals = {}; // user_id -> { totalAttempts, totalQuestions, retriedQuestions }
  for (const g of Object.values(groups)) {
    g.list.sort((x, y) => new Date(x.submitted_at) - new Date(y.submitted_at));
    const n = g.list.length;
    if (n === 1) oneTry++;
    else if (n === 2) twoTries++;
    else threePlus++;
    const u = (perUserTotals[g.user_id] = perUserTotals[g.user_id] || { totalAttempts: 0, totalQuestions: 0, retriedQuestions: 0 });
    u.totalAttempts += n;
    u.totalQuestions += 1;
    if (n > 1) u.retriedQuestions += 1;
  }
  const totalQuestions = oneTry + twoTries + threePlus;
  return {
    distribution: { oneTry, twoTries, threePlus, totalQuestions },
    perUser: perUserTotals,
  };
}

function downloadCSV(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => {
    const s = String(cell ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printStudentReport(student, subunitProgressList) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  const rows = subunitProgressList.map((sp) => `
    <tr>
      <td>${sp.label}</td>
      <td>${sp.isComplete ? "Complete" : STAGE_LABEL[sp.currentStage]}</td>
      <td>Discover ${sp.doneCounts.discover}/${sp.totals.discover} · Build ${sp.doneCounts.vocab}/${sp.totals.vocab} · Apply ${sp.doneCounts.structured}/${sp.totals.structured} · Master ${sp.doneCounts.essay}/${sp.totals.essay}</td>
    </tr>`).join("");
  w.document.write(`
    <html>
      <head>
        <title>Report — ${student.label || student.id}</title>
        <style>
          body { font-family: -apple-system, Arial, sans-serif; padding: 32px; color: #1c1917; }
          h1 { font-size: 20px; margin-bottom: 2px; }
          .sub { color: #78716c; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
          th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e7e2d8; }
          .stats { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
          .stat { border: 1px solid #e7e2d8; border-radius: 8px; padding: 8px 14px; }
          .stat b { display: block; font-size: 16px; }
          .stat span { font-size: 11px; color: #78716c; }
        </style>
      </head>
      <body>
        <h1>${student.label || "(no name or email on file)"}</h1>
        <div class="sub">${student.display_name && student.email ? student.email + " · " : ""}BizQuest progress report — generated ${new Date().toLocaleDateString()}</div>
        <div class="stats">
          <div class="stat"><b>${student.xp || 0}</b><span>XP</span></div>
          <div class="stat"><b>${student.accuracy !== null ? student.accuracy + "%" : "—"}</b><span>Accuracy — graded questions (${student.attemptCount} attempts)</span></div>
          <div class="stat"><b>${student.comprehension.total > 0 ? student.comprehension.score + "%" : "—"}</b><span>Comprehension checks — separate from accuracy (${student.comprehension.total} checks)</span></div>
          <div class="stat"><b>${student.streak}d</b><span>Current streak</span></div>
          <div class="stat"><b>${formatMinutes(student.weekly)}</b><span>Time this week</span></div>
          <div class="stat"><b>${formatMinutes(student.monthly)}</b><span>Time this month</span></div>
        </div>
        <table>
          <thead><tr><th>Subunit</th><th>Current stage</th><th>Detail</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

// Per-question breakdown for one subunit: attempt count, best/latest score (or, for
// Discover comprehension checks, the latest verdict), used when a teacher expands a
// specific subunit in a student's detail panel.
function buildQuestionBreakdown(subunitId, myAttempts, myCompAttempts) {
  const rows = [];
  const compByQuestion = {};
  for (const a of myCompAttempts) {
    if (a.subunit_id !== subunitId) continue;
    compByQuestion[a.question_id] = compByQuestion[a.question_id] || [];
    compByQuestion[a.question_id].push(a);
  }
  for (const [questionId, list] of Object.entries(compByQuestion)) {
    list.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
    rows.push({
      questionId, section: "discover", stageLabel: "Discover",
      attempts: list.length, latestVerdict: list.at(-1).verdict, lastAttemptDate: list.at(-1).submitted_at,
    });
  }
  const gradedByQuestion = {};
  for (const a of myAttempts) {
    if (a.subunit_id !== subunitId) continue;
    gradedByQuestion[a.question_id] = gradedByQuestion[a.question_id] || [];
    gradedByQuestion[a.question_id].push(a);
  }
  for (const [questionId, list] of Object.entries(gradedByQuestion)) {
    list.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
    const best = list.reduce((m, a) => (a.marks_earned > m.marks_earned ? a : m), list[0]);
    const latest = list.at(-1);
    rows.push({
      questionId, section: latest.section,
      stageLabel: latest.section === "vocab" ? "Build" : latest.section === "structured" ? "Apply" : "Master",
      attempts: list.length,
      bestScore: best.marks_earned, bestPossible: best.marks_possible,
      latestScore: latest.marks_earned, latestPossible: latest.marks_possible,
      lastAttemptDate: latest.submitted_at,
    });
  }
  const stageOrder = { Discover: 0, Build: 1, Apply: 2, Master: 3 };
  return rows.sort((a, b) => stageOrder[a.stageLabel] - stageOrder[b.stageLabel] || a.questionId.localeCompare(b.questionId));
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

function AccuracyBarChart({ data, height = 180 }) {
  if (!data || data.length === 0) {
    return <div className="text-[12.5px] text-stone-400 py-6 text-center">Not enough graded answers yet.</div>;
  }
  const colorFor = (v) => (v >= 70 ? GREEN : v >= 50 ? GOLD : RED);
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

// Weekly accuracy trend — a line, not a bar, since the point is direction over time.
// Gaps (null) render as breaks in the line rather than dropping to zero, so a week with
// no attempts doesn't look like a 0% week.
function TrendLineChart({ data, height = 160 }) {
  const hasAny = data.some((d) => d.value !== null);
  if (!hasAny) {
    return <div className="text-[12.5px] text-stone-400 py-6 text-center">Not enough history yet to show a trend.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d8" />
        <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: "#78716c" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#78716c" }} width={34} unit="%" />
        <Tooltip formatter={(v) => [v === null ? "No attempts" : `${v}%`, "Accuracy"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Line type="monotone" dataKey="value" stroke={NAVY} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Compact "which stage is each student on" progress bar for one subunit — 4 segments
// (Discover/Build/Apply/Master), each shaded by how complete that stage is.
function StageMiniBar({ progress }) {
  if (!progress) return null;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-stone-100">
      {STAGE_ORDER.map((stage) => {
        const key = STAGE_TO_COUNT_KEY[stage];
        const frac = progress.totals[key] > 0 ? progress.doneCounts[key] / progress.totals[key] : 0;
        return (
          <div key={stage} className="flex-1 relative bg-stone-100">
            <div
              className="absolute inset-y-0 left-0"
              style={{ width: `${Math.round(frac * 100)}%`, backgroundColor: STAGE_COLOR[stage] }}
            />
          </div>
        );
      })}
    </div>
  );
}

// Class-wide "how far along is everyone" view: for each subunit, a stacked bar showing
// how many students currently sit in each stage (or have completed it entirely).
function StagePipeline({ subunitId, students, subunitProgressByStudent }) {
  const counts = { discover: 0, build: 0, apply: 0, master: 0, complete: 0 };
  let total = 0;
  for (const s of students) {
    const p = subunitProgressByStudent[s.id]?.[subunitId];
    if (!p) continue;
    total++;
    counts[p.isComplete ? "complete" : p.currentStage]++;
  }
  if (total === 0) return null;
  const buckets = [...STAGE_ORDER, "complete"];
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-[12px] text-stone-600 mb-1">
        <span className="font-medium">{SUBUNIT_LABELS[subunitId] || subunitId}</span>
        <span className="text-stone-400">{total} student{total !== 1 ? "s" : ""}</span>
      </div>
      <div className="flex h-5 w-full overflow-hidden rounded-md">
        {buckets.map((b) => {
          const width = (counts[b] / total) * 100;
          if (width === 0) return null;
          return (
            <div
              key={b}
              className="flex items-center justify-center text-[10px] font-medium text-white"
              style={{ width: `${width}%`, backgroundColor: STAGE_COLOR[b] }}
              title={`${b === "complete" ? "Complete" : STAGE_LABEL[b]}: ${counts[b]}`}
            >
              {width > 9 ? counts[b] : ""}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
        {buckets.map((b) => (
          <span key={b} className="inline-flex items-center gap-1 text-[10px] text-stone-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STAGE_COLOR[b] }} />
            {b === "complete" ? "Complete" : STAGE_LABEL[b]}
          </span>
        ))}
      </div>
    </div>
  );
}

// Generic small count histogram — used for both the hour-of-day and day-of-week charts.
function CountBarChart({ data, height = 140 }) {
  const allZero = !data || data.every((d) => d.count === 0);
  if (allZero) {
    return <div className="text-[12.5px] text-stone-400 py-6 text-center">Not enough attempts yet to see a pattern.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e2d8" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#78716c" }} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: "#78716c" }} width={28} allowDecimals={false} />
        <Tooltip formatter={(v) => [v, "Attempts"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} fill={GOLD} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function HardestQuestionsList({ questions }) {
  if (!questions || questions.length === 0) {
    return <div className="text-[12.5px] text-stone-400 py-4 text-center">Not enough graded attempts yet (need at least 3 per question).</div>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-stone-200">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-stone-200 text-left text-stone-500 bg-stone-50">
            <th className="px-3 py-1.5 font-medium">Subunit</th>
            <th className="px-3 py-1.5 font-medium">Section</th>
            <th className="px-3 py-1.5 font-medium">Question</th>
            <th className="px-3 py-1.5 font-medium">Class avg</th>
            <th className="px-3 py-1.5 font-medium">Attempts</th>
          </tr>
        </thead>
        <tbody>
          {questions.slice(0, 8).map((q) => (
            <tr key={`${q.subunitId}-${q.questionId}`} className="border-b border-stone-100 last:border-0">
              <td className="px-3 py-1.5 text-stone-600">{SUBUNIT_LABELS[q.subunitId] || q.subunitId}</td>
              <td className="px-3 py-1.5 text-stone-600">{SECTION_LABELS[q.section] || q.section}</td>
              <td className="px-3 py-1.5 text-stone-700 max-w-[280px]">
                {questionText(q.subunitId, q.questionId)}
                <span className="text-stone-400 font-mono text-[10.5px]"> ({q.questionId})</span>
              </td>
              <td className="px-3 py-1.5 font-medium" style={{ color: q.accuracy >= 70 ? GREEN : q.accuracy >= 50 ? GOLD : RED }}>{q.accuracy}%</td>
              <td className="px-3 py-1.5 text-stone-400">{q.attempts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Simple "N of M students earned this badge" list — not per-badge detail, just an overview.
function BadgeOverview({ roster }) {
  const counts = useMemo(() => {
    const c = {};
    for (const id of Object.keys(BADGE_CATALOG)) c[id] = 0;
    for (const s of roster) for (const id of s.badge_ids || []) if (c[id] !== undefined) c[id]++;
    return c;
  }, [roster]);
  const total = roster.length;
  const entries = Object.entries(BADGE_CATALOG).sort((a, b) => counts[b[0]] - counts[a[0]]);
  if (total === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {entries.map(([id, name]) => (
        <div key={id} className="rounded-md border border-stone-200 px-2.5 py-2 text-center">
          <div className="text-[15px] font-semibold text-stone-700">{counts[id]}<span className="text-[11px] font-normal text-stone-400">/{total}</span></div>
          <div className="text-[10.5px] text-stone-500">{name}</div>
        </div>
      ))}
    </div>
  );
}

// Distribution of "how many tries did it take to nail a question" across the class —
// a rough persistence signal, most useful alongside accuracy (low accuracy + one-try-then-give-up
// is a different story than low accuracy + lots of retrying).
function PersistenceDistribution({ distribution }) {
  const { oneTry, twoTries, threePlus, totalQuestions } = distribution;
  if (totalQuestions === 0) {
    return <div className="text-[12.5px] text-stone-400 py-4 text-center">Not enough graded attempts yet.</div>;
  }
  const segments = [
    { label: "1 try", value: oneTry, color: GREEN },
    { label: "2 tries", value: twoTries, color: GOLD },
    { label: "3+ tries", value: threePlus, color: RED },
  ];
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-md mb-1.5">
        {segments.map((seg) => {
          const width = (seg.value / totalQuestions) * 100;
          if (width === 0) return null;
          return (
            <div key={seg.label} className="flex items-center justify-center text-[10px] font-medium text-white" style={{ width: `${width}%`, backgroundColor: seg.color }}>
              {width > 10 ? Math.round(width) + "%" : ""}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 text-[10.5px] text-stone-500">
        {segments.map((seg) => (
          <span key={seg.label} className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seg.color }} /> {seg.label} ({seg.value})
          </span>
        ))}
      </div>
    </div>
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
            <div className="text-[12.5px] font-medium text-stone-700">{s.label}</div>
            <div className="text-[11px] text-stone-500">{s.reasons.join(" · ")}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StudentDetailPanel({ student, attempts, activity, compAttempts, subunitProgressList, onRemove, persistence }) {
  const [expandedSubunit, setExpandedSubunit] = useState(null);
  const myAttempts = useMemo(() => attempts.filter((a) => a.user_id === student.id), [attempts, student.id]);
  const myActivity = useMemo(() => activity.filter((a) => a.user_id === student.id), [activity, student.id]);
  const myCompAttempts = useMemo(() => compAttempts.filter((a) => a.user_id === student.id), [compAttempts, student.id]);

  const subunitAccuracyData = useMemo(() => {
    const bySubunit = {};
    for (const a of myAttempts) {
      const key = a.subunit_id;
      if (!bySubunit[key]) bySubunit[key] = { earned: 0, possible: 0 };
      bySubunit[key].earned += a.marks_earned || 0;
      bySubunit[key].possible += a.marks_possible || 0;
    }
    return Object.entries(bySubunit)
      .map(([id, v]) => ({ label: SUBUNIT_LABELS[id] || id, value: pct(v.earned, v.possible) ?? 0 }))
      .sort((a, b) => (a.label).localeCompare(b.label));
  }, [myAttempts]);

  const dailyTimeData = useMemo(() => {
    const byDate = {};
    for (const a of myActivity) byDate[a.activity_date] = (byDate[a.activity_date] || 0) + (a.seconds_spent || 0);
    return lastNDates(14).map((d) => ({ label: shortDayLabel(d), minutes: Math.round((byDate[d] || 0) / 60) }));
  }, [myActivity]);

  const trendData = useMemo(() => weeklyAccuracyTrend(myAttempts), [myAttempts]);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const myHardestQuestions = useMemo(() => {
    const byQ = {};
    for (const a of myAttempts) {
      const key = `${a.subunit_id}:${a.question_id}`;
      byQ[key] = byQ[key] || { subunitId: a.subunit_id, questionId: a.question_id, section: a.section, earned: 0, possible: 0 };
      byQ[key].earned += a.marks_earned || 0;
      byQ[key].possible += a.marks_possible || 0;
    }
    return Object.values(byQ)
      .filter((q) => q.possible > 0)
      .map((q) => ({ ...q, accuracy: pct(q.earned, q.possible) }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);
  }, [myAttempts]);

  const onGenerateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const stats = {
        name: student.label,
        accuracyOnGradedQuestions: student.accuracy,
        gradedAttemptsCount: student.attemptCount,
        comprehensionCheckPerformance: student.comprehension,
        currentStreakDays: student.streak,
        daysSinceLastActive: student.daysSinceActive,
        timeSpentThisWeekMinutes: Math.round(student.weekly / 60),
        timeSpentThisMonthMinutes: Math.round(student.monthly / 60),
        accuracyBySubunit: subunitAccuracyData,
        accuracyByQuestionType: Object.entries(student.bySection).map(([k, v]) => ({ type: SECTION_LABELS[k] || k, accuracy: pct(v.earned, v.possible) })),
        subunitStageProgress: subunitProgressList.map((sp) => ({
          subunit: sp.label, currentStage: sp.isComplete ? "Complete" : STAGE_LABEL[sp.currentStage], progress: sp.doneCounts, totals: sp.totals,
        })),
        persistence: persistence && persistence.totalQuestions > 0
          ? { avgTriesPerQuestion: +(persistence.totalAttempts / persistence.totalQuestions).toFixed(2), questionsRetried: persistence.retriedQuestions, totalQuestionsAttempted: persistence.totalQuestions }
          : null,
        lowestScoringQuestions: myHardestQuestions.map((q) => ({
          subunit: SUBUNIT_LABELS[q.subunitId] || q.subunitId,
          type: SECTION_LABELS[q.section] || q.section,
          question: questionText(q.subunitId, q.questionId),
          accuracy: q.accuracy,
        })),
      };
      const text = await generateStudentSummary(stats);
      setSummary(text);
    } catch (err) {
      setSummaryError(err.message || "Could not generate summary.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const recentAttempts = useMemo(
    () => [...myAttempts].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 15),
    [myAttempts]
  );

  return (
    <div className="bg-stone-50 border-t border-stone-200 px-4 py-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <Avatar url={student.avatar_url} name={student.label} size={36} />
        <div className="leading-tight">
          <div className="text-[13.5px] font-semibold text-stone-800">{student.label}</div>
          {student.extra_detail && <div className="text-[11.5px] text-stone-500">{student.extra_detail}</div>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-md border border-stone-200 bg-white px-3.5 py-2.5">
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-wide text-stone-400">Accuracy — graded questions</div>
          <div className="text-[15px] font-semibold text-stone-700">
            {student.accuracy !== null ? `${student.accuracy}%` : "—"} <span className="text-stone-400 text-[12px] font-normal">({student.attemptCount} attempts)</span>
          </div>
        </div>
        <div className="h-8 w-px bg-stone-200" />
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-wide text-stone-400">Comprehension checks — reported separately</div>
          <div className="text-[15px] font-semibold text-stone-700">
            {student.comprehension.total > 0 ? `${student.comprehension.score}%` : "—"}{" "}
            <span className="text-stone-400 text-[12px] font-normal">
              ({student.comprehension.counts.correct} correct, {student.comprehension.counts.partial} partial, {student.comprehension.counts.incorrect} incorrect)
            </span>
          </div>
        </div>
        <div className="h-8 w-px bg-stone-200" />
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-wide text-stone-400">Persistence (Edit Again)</div>
          <div className="text-[15px] font-semibold text-stone-700">
            {persistence && persistence.totalQuestions > 0 ? (persistence.totalAttempts / persistence.totalQuestions).toFixed(1) : "—"}{" "}
            <span className="text-stone-400 text-[12px] font-normal">
              avg tries/question{persistence && persistence.totalQuestions > 0 ? ` (${persistence.retriedQuestions} retried)` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-stone-200 bg-white px-3.5 py-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-stone-700">
            <Sparkles size={13} style={{ color: GOLD }} /> AI performance summary
          </div>
          <button
            onClick={onGenerateSummary}
            disabled={summaryLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1 text-[11.5px] font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-60"
          >
            {summaryLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {summary ? "Regenerate" : summaryLoading ? "Generating…" : "Generate"}
          </button>
        </div>
        {summaryError && <p className="text-[12px] text-red-600">{summaryError}</p>}
        {summary ? (
          <p className="text-[13px] text-stone-600 leading-relaxed whitespace-pre-wrap">{summary}</p>
        ) : (
          !summaryLoading && !summaryError && (
            <p className="text-[12px] text-stone-400">
              Generates a short, teacher-facing summary of where this student stands and what to focus on next, based on their actual stats above.
            </p>
          )
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12px] font-semibold text-stone-600">Subunit progress</div>
        <div className="flex gap-2">
          <button
            onClick={() => printStudentReport(student, subunitProgressList)}
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-[11.5px] font-medium text-stone-600 hover:bg-stone-50"
          >
            <Printer size={12} /> Print report
          </button>
          <button
            onClick={() => onRemove(student)}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-red-600 hover:bg-red-50"
          >
            <UserMinus size={12} /> Remove from class
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {subunitProgressList.map((sp) => {
          const isExpanded = expandedSubunit === sp.subunitId;
          const breakdown = isExpanded ? buildQuestionBreakdown(sp.subunitId, myAttempts, myCompAttempts) : [];
          return (
            <div key={sp.subunitId}>
              <button
                onClick={() => setExpandedSubunit(isExpanded ? null : sp.subunitId)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="text-stone-600 inline-flex items-center gap-1">
                    {isExpanded ? <ChevronDown size={12} className="text-stone-400" /> : <ChevronRight size={12} className="text-stone-400" />}
                    {sp.label}
                  </span>
                  <span className="font-medium" style={{ color: sp.isComplete ? GREEN : STAGE_COLOR[sp.currentStage] }}>
                    {sp.isComplete ? "Complete" : STAGE_LABEL[sp.currentStage]}
                  </span>
                </div>
                <StageMiniBar progress={sp} />
              </button>
              {isExpanded && (
                <div className="mt-2 overflow-x-auto rounded-md border border-stone-200 bg-white">
                  {breakdown.length === 0 ? (
                    <div className="px-3 py-3 text-[12px] text-stone-400">No activity in this subunit yet.</div>
                  ) : (
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-stone-200 text-left text-stone-500 bg-stone-50">
                          <th className="px-3 py-1.5 font-medium">Stage</th>
                          <th className="px-3 py-1.5 font-medium">Question</th>
                          <th className="px-3 py-1.5 font-medium">Tries</th>
                          <th className="px-3 py-1.5 font-medium">Best</th>
                          <th className="px-3 py-1.5 font-medium">Latest</th>
                          <th className="px-3 py-1.5 font-medium">Last tried</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.map((row) => (
                          <tr key={row.questionId} className="border-b border-stone-100 last:border-0">
                            <td className="px-3 py-1.5 text-stone-500">{row.stageLabel}</td>
                            <td className="px-3 py-1.5 text-stone-700 max-w-[260px]">
                              {questionText(sp.subunitId, row.questionId)}
                              <span className="text-stone-400 font-mono text-[10px]"> ({row.questionId})</span>
                            </td>
                            <td className="px-3 py-1.5 text-stone-600">{row.attempts}</td>
                            {row.section === "discover" ? (
                              <>
                                <td className="px-3 py-1.5 text-stone-400" colSpan={2}>
                                  Verdict: <span className="font-medium text-stone-600 capitalize">{row.latestVerdict}</span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-1.5 text-stone-600">{row.bestScore}/{row.bestPossible}</td>
                                <td className="px-3 py-1.5 text-stone-600">{row.latestScore}/{row.latestPossible}</td>
                              </>
                            )}
                            <td className="px-3 py-1.5 text-stone-500">{new Date(row.lastAttemptDate).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {subunitProgressList.length === 0 && (
          <div className="text-[12.5px] text-stone-400">No subunit activity yet.</div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Accuracy trend — last {TREND_WEEKS} weeks</div>
          <TrendLineChart data={trendData} />
        </div>
        <div>
          <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Time spent — last 14 days</div>
          <TimeBarChart data={dailyTimeData} />
        </div>
      </div>

      <div>
        <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Accuracy by subunit</div>
        <AccuracyBarChart data={subunitAccuracyData} height={Math.max(90, subunitAccuracyData.length * 34)} />
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
                    <td className="px-3 py-1.5 text-stone-700 max-w-[240px]">
                      {questionText(a.subunit_id, a.question_id)}
                      <span className="text-stone-400 font-mono text-[10px]"> ({a.question_id})</span>
                    </td>
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

const SORT_OPTIONS = [
  { key: "email", label: "Name" },
  { key: "xp", label: "XP" },
  { key: "accuracy", label: "Accuracy" },
  { key: "streak", label: "Streak" },
  { key: "weekly", label: "Time this week" },
  { key: "daysSinceActive", label: "Last active" },
];

export default function TeacherDashboard({ initialClasses }) {
  const [classes, setClasses] = useState(initialClasses || []);
  const [selectedClassId, setSelectedClassId] = useState((initialClasses && initialClasses[0]?.id) || null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [roster, setRoster] = useState([]);
  const [activity, setActivity] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [compAttempts, setCompAttempts] = useState([]);
  const [loadingClass, setLoadingClass] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("email");
  const [sortDir, setSortDir] = useState("asc");
  const [removing, setRemoving] = useState(null); // student pending removal confirmation

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
        setRoster([]); setActivity([]); setAttempts([]); setCompAttempts([]); setExpandedStudentId(null);
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
        const sinceDate = isoDaysAgo(ACTIVITY_WINDOW_DAYS);
        const sinceISO = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 86400000).toISOString();
        const [a, q, c] = await Promise.all([
          loadActivityForUsers(ids, sinceDate),
          loadAttemptsForUsers(ids, sinceISO),
          loadComprehensionAttemptsForUsers(ids, sinceISO),
        ]);
        if (cancelled) return;
        setActivity(a);
        setAttempts(q);
        setCompAttempts(c);
      } catch {
        if (!cancelled) { setRoster([]); setActivity([]); setAttempts([]); setCompAttempts([]); }
      } finally {
        if (!cancelled) setLoadingClass(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedClassId]);

  const today = todayISODate();

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
      const myCompAttempts = compAttempts.filter((a) => a.user_id === s.id);
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

      const subunitProgress = {};
      for (const subunitId of Object.keys(SUBUNIT_QUESTION_COUNTS)) {
        const sp = computeSubunitProgress(subunitId, myCompAttempts, myAttempts);
        if (sp) subunitProgress[subunitId] = sp;
      }

      const comprehension = summarizeComprehension(myCompAttempts);

      const reasons = [];
      if (accuracy !== null && myAttempts.length >= 3 && accuracy < 60) reasons.push(`Low accuracy (${accuracy}%)`);
      if (lastActiveDate !== null && daysSinceActive >= 3) reasons.push(`Inactive ${daysSinceActive}d`);
      const needsAttention = reasons.length > 0;

      const label = s.display_name || s.email || "(no name or email on file)";

      return {
        ...s,
        daily, weekly, monthly,
        attemptCount: myAttempts.length,
        accuracy,
        completedCount: (s.completed_subunits || []).length,
        lastActiveDate, daysSinceActive, streak,
        bySubunit, bySection, subunitProgress,
        comprehension,
        needsAttention, reasons, label,
      };
    });
  }, [roster, activity, attempts, compAttempts, today]);

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

  // Class-wide comprehension summary — deliberately computed from compAttempts directly
  // (not folded into any accuracy number), so it can never leak into the accuracy stats.
  const classComprehension = useMemo(() => summarizeComprehension(compAttempts), [compAttempts]);

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
    return order.filter((k) => agg[k]).map((k) => ({ label: SECTION_LABELS[k] || k, value: pct(agg[k].earned, agg[k].possible) ?? 0 }));
  }, [studentStats]);

  const classDailyTime = useMemo(() => {
    const byDate = {};
    for (const a of activity) byDate[a.activity_date] = (byDate[a.activity_date] || 0) + (a.seconds_spent || 0);
    return lastNDates(14).map((d) => ({ label: shortDayLabel(d), minutes: Math.round((byDate[d] || 0) / 60) }));
  }, [activity]);

  const classTrend = useMemo(() => weeklyAccuracyTrend(attempts), [attempts]);

  const questionDifficulty = useMemo(() => computeQuestionDifficulty(attempts), [attempts]);

  const timePatterns = useMemo(() => {
    const timestamps = [...attempts.map((a) => a.submitted_at), ...compAttempts.map((a) => a.submitted_at)];
    return computeTimePatterns(timestamps);
  }, [attempts, compAttempts]);

  const persistence = useMemo(() => computePersistence(attempts), [attempts]);

  const subunitProgressByStudent = useMemo(() => {
    const out = {};
    for (const s of studentStats) out[s.id] = s.subunitProgress;
    return out;
  }, [studentStats]);

  const visibleStats = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? studentStats.filter((s) => (s.label || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q))
      : studentStats;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "email") { av = (a.label || "").toLowerCase(); bv = (b.label || "").toLowerCase(); }
      // Nulls (e.g. no accuracy yet, never active) always sort last regardless of direction.
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [studentStats, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "email" ? "asc" : "desc"); }
  };

  const subunitProgressListFor = (student) =>
    Object.entries(student.subunitProgress).map(([subunitId, sp]) => ({ subunitId, label: SUBUNIT_LABELS[subunitId] || subunitId, ...sp }));

  const exportRosterCSV = () => {
    const header = [
      "Name", "Email", "XP", "Subunits completed",
      "Accuracy % (graded questions)", "Graded attempts",
      "Comprehension score %", "Comprehension checks", "Comprehension correct", "Comprehension partial", "Comprehension incorrect",
      "Streak (days)", "Last active", "Time today (min)", "Time this week (min)", "Time this month (min)",
    ];
    const rows = visibleStats.map((s) => [
      s.label || "", s.email || "", s.xp || 0, s.completedCount,
      s.accuracy ?? "", s.attemptCount,
      s.comprehension.score ?? "", s.comprehension.total, s.comprehension.counts.correct, s.comprehension.counts.partial, s.comprehension.counts.incorrect,
      s.streak, s.lastActiveDate || "never", Math.round(s.daily / 60), Math.round(s.weekly / 60), Math.round(s.monthly / 60),
    ]);
    downloadCSV(`${(selectedClass?.name || "class").replace(/[^a-z0-9]+/gi, "_")}_roster.csv`, [header, ...rows]);
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await removeStudentFromClass(removing.id);
      setRoster((prev) => prev.filter((s) => s.id !== removing.id));
      if (expandedStudentId === removing.id) setExpandedStudentId(null);
    } catch (err) {
      alert(err.message || "Could not remove student.");
    } finally {
      setRemoving(null);
    }
  };

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
                <StatChip icon={Target} label="accuracy (graded questions)" value={classSummary.avgAccuracy !== null ? `${classSummary.avgAccuracy}%` : "—"} />
                <StatChip icon={CheckCircle2} label={`comprehension (${classComprehension.total} checks)`} value={classComprehension.score !== null ? `${classComprehension.score}%` : "—"} />
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
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Class accuracy trend — last {TREND_WEEKS} weeks</div>
                  <TrendLineChart data={classTrend} />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Class time spent — last 14 days</div>
                  <TimeBarChart data={classDailyTime} />
                </div>
              </div>

              {/* Subunit stage pipeline */}
              <div className="mb-5 rounded-lg border border-stone-200 p-3.5">
                <div className="text-[12px] font-semibold text-stone-600 mb-2.5">Where the class stands, by subunit</div>
                {Object.keys(SUBUNIT_QUESTION_COUNTS).map((subunitId) => (
                  <StagePipeline
                    key={subunitId}
                    subunitId={subunitId}
                    students={studentStats}
                    subunitProgressByStudent={subunitProgressByStudent}
                  />
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Hardest questions class-wide</div>
                  <HardestQuestionsList questions={questionDifficulty} />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-stone-600 mb-1.5">Persistence — tries needed per question</div>
                  <div className="rounded-md border border-stone-200 p-3">
                    <PersistenceDistribution distribution={persistence.distribution} />
                  </div>
                  <div className="text-[12px] font-semibold text-stone-600 mt-4 mb-1.5">Badges earned</div>
                  <BadgeOverview roster={roster} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="text-[12px] font-semibold text-stone-600 mb-1.5">When students study — time of day</div>
                  <CountBarChart data={timePatterns.byHour} />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-stone-600 mb-1.5">When students study — day of week</div>
                  <CountBarChart data={timePatterns.byDow} />
                </div>
              </div>

              {/* Roster controls: search, sort, export */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by email…"
                    className="w-full rounded-md border border-stone-300 pl-8 pr-2.5 py-1.5 text-[12.5px] focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": NAVY }}
                  />
                </div>
                <select
                  value={sortKey}
                  onChange={(e) => toggleSort(e.target.value)}
                  className="rounded-md border border-stone-300 px-2 py-1.5 text-[12.5px]"
                >
                  {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>Sort: {o.label}</option>)}
                </select>
                <button
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-2 py-1.5 text-[12.5px] text-stone-600 hover:bg-stone-50"
                  title="Reverse sort order"
                >
                  <ArrowUpDown size={12} /> {sortDir === "asc" ? "Asc" : "Desc"}
                </button>
                <button
                  onClick={exportRosterCSV}
                  className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1.5 text-[12.5px] font-medium text-stone-600 hover:bg-stone-50"
                >
                  <Download size={13} /> Export CSV
                </button>
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
                      <th className="px-3 py-2 font-medium">Accuracy (graded)</th>
                      <th className="px-3 py-2 font-medium">Comprehension</th>
                      <th className="px-3 py-2 font-medium">Streak</th>
                      <th className="px-3 py-2 font-medium">Last active</th>
                      <th className="px-3 py-2 font-medium">This week</th>
                      <th className="px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStats.map((s) => {
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
                              <div className="flex items-center gap-2">
                                <Avatar url={s.avatar_url} name={s.label} size={26} />
                                <span title={s.email || ""}>
                                  {s.label || <span className="text-stone-400">(no name or email on file)</span>}
                                </span>
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
                              {s.comprehension.total > 0 ? `${s.comprehension.score}%` : "—"} <span className="text-stone-400 text-[11px]">({s.comprehension.total})</span>
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
                            <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setRemoving(s)}
                                className="rounded-md p-1 text-stone-400 hover:text-red-600 hover:bg-red-50"
                                title="Remove from class"
                              >
                                <UserMinus size={14} />
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={10} className="p-0">
                                <StudentDetailPanel
                                  student={s}
                                  attempts={attempts}
                                  activity={activity}
                                  compAttempts={compAttempts}
                                  subunitProgressList={subunitProgressListFor(s)}
                                  onRemove={setRemoving}
                                  persistence={persistence.perUser[s.id]}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {visibleStats.length === 0 && (
                      <tr><td colSpan={10} className="px-3 py-6 text-center text-stone-400 text-[12.5px]">No students match “{search}”.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Remove-student confirmation */}
      {removing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-xl border border-stone-200 shadow-lg max-w-sm w-full p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-[15px] font-semibold text-stone-800">Remove from class?</h3>
              <button onClick={() => setRemoving(null)} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
            </div>
            <p className="text-[13px] text-stone-500 mb-4">
              {removing.label || "This student"} will lose access to your class dashboard and can rejoin later with the join code. Their own progress and XP are not affected.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRemoving(null)} className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-stone-600 hover:bg-stone-100">Cancel</button>
              <button onClick={confirmRemove} className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ backgroundColor: RED }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
