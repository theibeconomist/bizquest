"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Copy, Check, ChevronRight, Users, Clock, Target, BookOpen } from "lucide-react";
import { createClass, loadClassRoster, loadActivityForUsers, loadAttemptsForUsers } from "@/lib/db";

const NAVY = "#15396B";

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function formatMinutes(seconds) {
  const mins = Math.round((seconds || 0) / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
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

export default function TeacherDashboard({ initialClasses }) {
  const [classes, setClasses] = useState(initialClasses || []);
  const [selectedClassId, setSelectedClassId] = useState((initialClasses && initialClasses[0]?.id) || null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [roster, setRoster] = useState([]);
  const [activity, setActivity] = useState([]); // daily_activity rows, last 30 days, for this roster
  const [attempts, setAttempts] = useState([]); // question_attempts rows, last 30 days
  const [loadingClass, setLoadingClass] = useState(false);

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
      // Defer to a microtask so this isn't a synchronous setState call inside the effect body.
      Promise.resolve().then(() => {
        if (cancelled) return;
        setRoster([]); setActivity([]); setAttempts([]);
      });
      return () => { cancelled = true; };
    }
    setLoadingClass(true);
    (async () => {
      try {
        const r = await loadClassRoster(selectedClassId);
        if (cancelled) return;
        setRoster(r);
        const ids = r.map((s) => s.id);
        const [a, q] = await Promise.all([
          loadActivityForUsers(ids, isoDaysAgo(30)),
          loadAttemptsForUsers(ids, new Date(Date.now() - 30 * 86400000).toISOString()),
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

  // Per-student rollups, computed client-side from the raw activity/attempt rows.
  const studentStats = useMemo(() => {
    const today = todayISODate();
    const weekAgo = isoDaysAgo(7);
    const monthAgo = isoDaysAgo(30);
    return roster.map((s) => {
      const rows = activity.filter((a) => a.user_id === s.id);
      const daily = rows.filter((a) => a.activity_date === today).reduce((sum, a) => sum + (a.seconds_spent || 0), 0);
      const weekly = rows.filter((a) => a.activity_date >= weekAgo).reduce((sum, a) => sum + (a.seconds_spent || 0), 0);
      const monthly = rows.filter((a) => a.activity_date >= monthAgo).reduce((sum, a) => sum + (a.seconds_spent || 0), 0);

      const myAttempts = attempts.filter((a) => a.user_id === s.id);
      const earned = myAttempts.reduce((sum, a) => sum + (a.marks_earned || 0), 0);
      const possible = myAttempts.reduce((sum, a) => sum + (a.marks_possible || 0), 0);
      const accuracy = possible > 0 ? Math.round((earned / possible) * 100) : null;

      return {
        ...s,
        daily, weekly, monthly,
        attemptCount: myAttempts.length,
        accuracy,
        completedCount: (s.completed_subunits || []).length,
      };
    });
  }, [roster, activity, attempts]);

  const classSummary = useMemo(() => {
    if (studentStats.length === 0) return null;
    const withAccuracy = studentStats.filter((s) => s.accuracy !== null);
    const avgAccuracy = withAccuracy.length
      ? Math.round(withAccuracy.reduce((sum, s) => sum + s.accuracy, 0) / withAccuracy.length)
      : null;
    const avgWeekly = Math.round(studentStats.reduce((sum, s) => sum + s.weekly, 0) / studentStats.length);
    return { avgAccuracy, avgWeekly, count: studentStats.length };
  }, [studentStats]);

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
              <div className="flex gap-2">
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
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-stone-500">
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">XP</th>
                    <th className="px-3 py-2 font-medium">Subunits done</th>
                    <th className="px-3 py-2 font-medium">Accuracy</th>
                    <th className="px-3 py-2 font-medium">Today</th>
                    <th className="px-3 py-2 font-medium">This week</th>
                    <th className="px-3 py-2 font-medium">This month</th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map((s) => (
                    <tr key={s.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-3 py-2">{s.email || <span className="text-stone-400">(no email on file)</span>}</td>
                      <td className="px-3 py-2 text-stone-600">{s.xp || 0}</td>
                      <td className="px-3 py-2 text-stone-600">
                        <span className="inline-flex items-center gap-1"><BookOpen size={12} className="text-stone-400" /> {s.completedCount}</span>
                      </td>
                      <td className="px-3 py-2 text-stone-600">{s.accuracy !== null ? `${s.accuracy}%` : "—"} <span className="text-stone-400 text-[11px]">({s.attemptCount})</span></td>
                      <td className="px-3 py-2 text-stone-600">{formatMinutes(s.daily)}</td>
                      <td className="px-3 py-2 text-stone-600">{formatMinutes(s.weekly)}</td>
                      <td className="px-3 py-2 text-stone-600">{formatMinutes(s.monthly)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
