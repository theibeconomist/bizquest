"use client";
import { useState, useEffect, useRef } from "react";
import { Trophy, Shuffle, Sparkles, CheckCircle2, XCircle } from "lucide-react";

export const QUIZ_NAVY = "#15396B";
export const QUIZ_GOLD = "#C9A24B";
export const QUIZ_GREEN = "#2E8B84";
export const QUIZ_RED = "#B3392C";

// A distinct color per team, cycling if there are more teams than colors — used
// consistently across the scoreboard, the turn spotlight, and team labels so a team
// reads as "the purple team" at a glance rather than just a name in a list.
export const TEAM_COLORS = ["#B3392C", "#15396B", "#2E8B84", "#C9A24B", "#6B4C9A", "#2F5FA8"];
export function teamColor(index) {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}
const DIFFICULTY_COLOR = { easy: QUIZ_GREEN, medium: QUIZ_GOLD, hard: QUIZ_RED };

// Small badge showing a question's difficulty/points, or BONUS for case-study questions.
export function DifficultyBadge({ question }) {
  if (question.type === "bonus") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: QUIZ_GOLD }}>
        <Sparkles size={11} /> BONUS · {question.points} pts
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white capitalize" style={{ backgroundColor: DIFFICULTY_COLOR[question.difficulty] }}>
      {question.difficulty} · {question.points} pt{question.points !== 1 ? "s" : ""}
    </span>
  );
}

// Lightweight CSS confetti burst — no external library, just a handful of animated dots.
export const OPTION_LETTERS = ["A", "B", "C", "D"];
export const DIFFICULTY_SECONDS = { easy: 20, medium: 25, hard: 30 };

// A per-question countdown, ticking down from a difficulty-based duration. Purely a
// pacing/pressure cue — calls onExpire once when it hits zero, but doesn't repeat and
// doesn't block anything itself; the caller decides what "time's up" actually does
// (auto-reveal, in every place this is used).
export function QuestionTimer({ startedAtMs, seconds, onExpire }) {
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);
  useEffect(() => { firedRef.current = false; }, [startedAtMs]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, seconds - (now - startedAtMs) / 1000);
  useEffect(() => {
    if (remaining <= 0 && !firedRef.current) {
      firedRef.current = true;
      onExpire && onExpire();
    }
  }, [remaining, onExpire]);

  // Three-stage urgency, not just a binary switch: calm navy, then amber past the
  // halfway point, then red with a pulse once seconds are actually running out.
  const stage = remaining <= 5 ? "critical" : remaining <= seconds * 0.4 ? "warning" : "calm";
  const color = stage === "critical" ? "#B3392C" : stage === "warning" ? "#C9A24B" : "#15396B";
  const bg = stage === "critical" ? "#FBEFED" : stage === "warning" ? "#FBF4E2" : "#EAF1F8";
  const pct = Math.max(0, Math.min(100, (remaining / seconds) * 100));
  const r = 19;
  const circumference = 2 * Math.PI * r;

  const pulseScale = stage === "critical" ? 1 + 0.08 * Math.abs(Math.sin(now / 350)) : 1;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: 48, height: 48, transform: `scale(${pulseScale})` }}
    >
      <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90 absolute inset-0">
        <circle cx="24" cy="24" r={r} fill={bg} stroke="#e7e2d8" strokeWidth="1" />
        <circle
          cx="24" cy="24" r={r} fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s" }}
        />
      </svg>
      <span className="relative text-[15px] font-extrabold tabular-nums" style={{ color }}>{Math.ceil(remaining)}</span>
    </div>
  );
}

// Classic game-show / Kahoot-style option colors — red, blue, gold, green.
export const OPTION_COLORS = ["#B3392C", "#2F5FA8", "#C9A24B", "#2E8B84"];

// Shuffles one question's options (once, at game-creation time) so the correct answer
// isn't always in the same position across a whole game — purely a fairness/replay-value
// improvement, not a security measure.
export function shuffleOptions(question) {
  const indices = question.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return { ...question, options: indices.map((i) => question.options[i]), correct: indices.indexOf(question.correct) };
}

// Short synthesized tones via the Web Audio API — no external sound files needed (avoids
// sourcing/licensing audio assets entirely). Silently no-ops if audio can't be created
// (e.g. autoplay restrictions before any user interaction).
export function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.16, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.35);
    });
  } catch {
    // audio unsupported/blocked — the visual feedback still carries the moment
  }
}
export function playErrorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.35);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch {
    // audio unsupported/blocked — the visual feedback still carries the moment
  }
}

// A "TV game show" style option button: big colored block, bold letter badge, checkmark/
// cross once revealed. Shared across all three quiz views for a consistent look.
export function OptionButton({ letter, color, text, onClick, disabled, state }) {
  // state: "idle" | "correct" | "incorrect" | "muted" (an unpicked, non-correct option once revealed)
  let bg = color, opacity = 1;
  if (state === "correct") bg = QUIZ_GREEN;
  else if (state === "incorrect") bg = QUIZ_RED;
  else if (state === "muted") opacity = 0.45;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition disabled:cursor-default"
      style={{ backgroundColor: bg, color: "white", opacity, boxShadow: "0 2px 0 rgba(0,0,0,0.12)" }}
    >
      <span
        className="shrink-0 flex items-center justify-center rounded-lg font-bold text-[15px]"
        style={{ width: 30, height: 30, backgroundColor: "rgba(255,255,255,0.25)" }}
      >
        {letter}
      </span>
      <span className="text-[14.5px] font-medium leading-snug">{text}</span>
      {state === "correct" && <CheckCircle2 size={18} className="ml-auto shrink-0" />}
      {state === "incorrect" && <XCircle size={18} className="ml-auto shrink-0" />}
    </button>
  );
}

// Matches the confirmation-modal pattern already used elsewhere in the app (e.g. "Remove
// from class?" in the teacher dashboard) — used instead of the native browser confirm(),
// which looks and feels out of place next to everything else here.
export function ConfirmModal({ title, message, confirmLabel = "Confirm", onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-xl border border-stone-200 shadow-lg max-w-sm w-full p-5">
        <h3 className="text-[15px] font-semibold text-stone-800 mb-2">{title}</h3>
        <p className="text-[13px] text-stone-500 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-stone-600 hover:bg-stone-100">Cancel</button>
          <button onClick={onConfirm} className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ backgroundColor: QUIZ_RED }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function Confetti() {
  const colors = [QUIZ_GOLD, QUIZ_GREEN, QUIZ_NAVY, QUIZ_RED, "#ffffff"];
  const [pieces] = useState(() =>
    Array.from({ length: 22 }, (_, i) => ({
      left: Math.random() * 100,
      duration: 0.9 + Math.random() * 0.7,
      delay: Math.random() * 0.35,
      color: colors[i % colors.length],
      round: i % 2 === 0,
    }))
  );
  return (
    <>
      <style>{`@keyframes quizConfettiFall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(180px) rotate(360deg); opacity: 0; } }`}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {pieces.map((p, i) => (
          <span
            key={i}
            style={{
              position: "absolute", left: `${p.left}%`, top: "-10px",
              width: 7, height: 7, backgroundColor: p.color,
              borderRadius: p.round ? "50%" : "2px",
              animation: `quizConfettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
}

// Celebration / consolation popup shown right after a team answers. Auto-dismisses.
export function AnswerFeedbackModal({ correct, points, teamName, timedOut, onDismiss }) {
  useEffect(() => {
    if (correct) playSuccessSound(); else playErrorSound();
    const t = setTimeout(onDismiss, 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onDismiss}>
      <div className="relative rounded-2xl px-10 py-9 text-center shadow-2xl" style={{ backgroundColor: correct ? QUIZ_GREEN : "#57534e", minWidth: 260 }}>
        {correct && <Confetti />}
        {correct ? (
          <>
            <div className="text-[42px] mb-1">🎉</div>
            <div className="text-[23px] font-bold text-white mb-1">Correct!</div>
            <div className="text-[15px] text-white/90">{teamName ? `${teamName} ` : ""}+{points} point{points !== 1 ? "s" : ""}</div>
          </>
        ) : timedOut ? (
          <>
            <div className="text-[36px] mb-1">⏱️</div>
            <div className="text-[20px] font-bold text-white mb-1">Time&apos;s up!</div>
            <div className="text-[14px] text-white/80">No answer locked in</div>
          </>
        ) : (
          <>
            <div className="text-[36px] mb-1">😕</div>
            <div className="text-[20px] font-bold text-white mb-1">Not quite!</div>
            <div className="text-[14px] text-white/80">Better luck next time</div>
          </>
        )}
      </div>
    </div>
  );
}

// A clear, always-visible running scoreboard — sorted by score, leader gets a trophy.
export function Scoreboard({ teams, currentTeamId }) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const currentTeam = teams.find((t) => t.id === currentTeamId);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-3 mb-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-wide">Scoreboard</div>
        {currentTeam && (
          <div
            className="inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-3 py-1 text-[12.5px] font-bold text-white"
            style={{ backgroundColor: teamColor(currentTeam.id), animation: "quiz-turn-pulse 1.6s ease-in-out infinite" }}
          >
            <span className="flex items-center justify-center rounded-full bg-white/25 w-5 h-5 text-[11px]">▶</span>
            {currentTeam.name}&apos;s turn
          </div>
        )}
      </div>
      <style>{`@keyframes quiz-turn-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.12); } 50% { box-shadow: 0 0 0 5px rgba(0,0,0,0); } }`}</style>
      <div className="space-y-1.5">
        {sorted.map((t, i) => {
          const isUp = t.id === currentTeamId;
          const color = teamColor(t.id);
          return (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-all"
              style={{
                backgroundColor: isUp ? `${color}14` : "#FAF8F5",
                borderLeft: `4px solid ${isUp ? color : "transparent"}`,
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {i < 3 && t.score > 0 ? (
                  <span className="text-[15px] shrink-0">{medals[i]}</span>
                ) : (
                  <span className="text-[11px] font-bold text-stone-400 shrink-0 w-[18px] text-center">{i + 1}</span>
                )}
                <span className={`text-[13.5px] truncate ${isUp ? "font-bold" : "font-medium"} text-stone-700`}>{t.name}</span>
              </div>
              <span className="text-[17px] font-bold shrink-0 ml-2" style={{ color: isUp ? color : QUIZ_NAVY }}>{t.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
